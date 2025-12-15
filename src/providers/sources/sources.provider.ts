import { PlatformName, SourcePost, SourcePrice, SourceStatus, User } from "@prisma/client"
// import { coingeckoApiServiceMarket } from "../Coingecko/coingecko.provider"
// import { coinImages } from "../Coingecko/constants"
import { normalizeToken } from "../signals/signals.helpers"
import { prisma } from "../../prisma"
import { SourcePostAnalysis, SourceType } from "./sources.types"
import { getTelegramChannelPosts } from "../telegram/telegram.provider"
import { getTwitterChannelPosts } from "../twitter/twitter.provider"
import { calculateMaxPivotFrom21Days, getCoinInfo } from "../CoinMarketCap/coinmarketcap.provider"
import { createOrUpdateSignal } from "../signals/signals.provider"
import { calculateSourceStats } from "../../modules/sources/sources.helpers"
import { generateSourceRecommendations } from "../AgentAI/recommendations.provider"


const createSource = async (channelInfo: SourceType, source: any, messages: any[], currentUser: User) => {

    console.log(" ------------------ ")
    console.log(" ")
    console.log(" ")
    console.log(" 🚀   -->  source:", source)
    console.log(" 🚀   -->  source:", messages.length)
    console.log(" ")
    console.log(" ")
    console.log(" ------------------ ")
    if (!channelInfo) {
        return {
            status: false,
            message: source.sourceType === PlatformName.TELEGRAM
                ? `Telegram channel '${source.sourceId}' could not be found or is inaccessible.`
                : `User '${source.sourceId}' could not be found or the profile is unavailable.`
        }
    }

    if (!messages.length) {
        return {
            status: false,
            message: `No valid signals detected for the source '${source.sourceId}'`
        }
    }
    const signalsPosts = messages.filter((m) => m.analysis.type === "Signal" || m.analysis.type === "directSignal")
    if (!signalsPosts.length) {
        return {
            status: false,
            message: `No valid signals detected for the source '${source.sourceId}'`
        }
    }
    const newSource = await prisma.source.create({
        data: {
            ...channelInfo,
            display_name: source.display_name || "",
            user_db_id: currentUser.id,
            source_price: source.priceType === "free" ? SourcePrice.FREE : source.priceType === "monthly" ? SourcePrice.MONTHLY : SourcePrice.LIFETIME,
            source_price_value: source.priceType === "free" ? null : source.priceType === "monthly" ? source.price.toString() : "lifetime/12",
            price: source.priceType === "free" ? null : Number(source.price),
            source_activated: true
        },
    })
    try {
        const verifiedPosts: any[] = []
        for (let index = 0; index < signalsPosts.length; index++) {
            const element = signalsPosts[index]
            const analysis = element.analysis as unknown as SourcePostAnalysis

            if (analysis?.token && analysis?.type === "Signal") {
                const normalizedToken = normalizeToken(analysis.token)
                const coinInfo = await getCoinInfo(normalizedToken)
                if (coinInfo) {
                    const postCreated = await prisma.sourcePost.create({
                        data: {
                            sourceId: newSource.id,
                            sourceType: channelInfo.platform_logo as PlatformName,
                            date: element.date,
                            timestamp: element.timestamp,
                            originalId: String(element.id),
                            mediaType: element.mediaType,
                            senderId: element.senderId,
                            text: element.text,
                            originalText: element.originalText,
                            analysis: element.analysis!,
                        }
                    })
                    const currencyLogo = coinInfo.logo
                    const targetDate = new Date(element.date!)

                    const pivotResult = await calculateMaxPivotFrom21Days(normalizedToken, targetDate, analysis.direction!)
                    const entryPrice = pivotResult?.priceAtStart || 0
                    const meta = pivotResult!.meta
                    await createOrUpdateSignal({
                        coinId: coinInfo.id,
                        analysis: {
                            direction: analysis.direction!,
                            token: normalizedToken.toUpperCase(),
                            token_id: coinInfo.id.toString(),
                        },
                        newSourceId: newSource.id,
                        postCreatedId: postCreated.id,
                        currentUserId: currentUser.id,
                        currencyLogo,
                        pnlAbsolute: pivotResult?.theoreticalProfitAbsolute || 0,
                        pnlPercent: pivotResult?.theoreticalProfitPercent || 0,
                        entryPrice,
                        exitPrice: pivotResult?.bestPrice || null,
                        entryTimestamp: new Date(element.date!),
                        isComplete: pivotResult?.isComplete || false,
                        pivotCalcDays: pivotResult?.validDays || 0,
                        meta
                    })
                    verifiedPosts.push(postCreated.id)

                } else {
                    console.log(`Token ${analysis.token} not found in CoinMarketCap API`)
                }
            } else {
                console.log(`Token ${analysis.token} not found in CoinMarketCap API`)
            }
        }
        if (!verifiedPosts.length) {
            await prisma.source.delete({
                where: { id: newSource.id },
            })
            return {
                status: false,
                message: `No valid signals detected for the source '${source.sourceId}'`
            }
        }
        // save last message id
        const metadata = newSource?.metadata as any
        metadata.last_message_id = messages[messages.length - 1].id

        await prisma.source.update({
            where: {
                id: newSource.id,
            },
            data: {
                source_status: SourceStatus.VALIDE,
                metadata: metadata
            },
        })

        // await 1 second
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const NewSourceFull = await prisma.source.findUnique({
            where: {
                id: newSource.id
            },
            include: {
                Signal: true,
            }
        })

        if (!NewSourceFull) {
            return {
                status: true,
                id: newSource.user_username_source
            }
        }

        const stats = calculateSourceStats(NewSourceFull.Signal || [])
        const recommendations = await generateSourceRecommendations({
            sourceName: source.user_name_source,
            platform: source.platform_logo,
            stats: stats,
            recentSignalsCount: source.Signal?.length || 0,
            followers: source.followers_count
        })

        await prisma.sourceStats.create({
            data: {
                sourceId: newSource.id,
                stats: stats,
                recommendations: recommendations,
                period: "ALL"
            }
        })
            
        return {
            status: true,
            id: newSource.user_username_source
        }
    } catch (error: any) {
        console.log(" 🚀   -->  error:", error)
        // await prisma.source.delete({
        //     where: { id: newSource.id },
        // })
        return {
            status: false,
            message: error.message
        }
    }
}

export const createSourceService = async (channelInfo: SourceType, source: any, currentUser: User) => {
    try {
        let messages: SourcePost[] = []
        if (source.sourceType === PlatformName.TELEGRAM) {
            messages = await getTelegramChannelPosts(channelInfo?.user_id_source)
        } else {
            messages = await getTwitterChannelPosts(channelInfo?.user_id_source)
        }
        return createSource(channelInfo, source, messages, currentUser)
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}