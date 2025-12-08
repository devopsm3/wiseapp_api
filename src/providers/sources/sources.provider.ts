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


const createSource = async (channelInfo: SourceType, source: any, messages: any[], currentUser: User) => {
    try {
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
                user_db_id: currentUser.id,
                source_price: source.priceType === "free" ? SourcePrice.FREE : source.priceType === "monthly" ? SourcePrice.MONTHLY : SourcePrice.LIFETIME,
                source_price_value: source.priceType === "free" ? null : source.priceType === "monthly" ? source.price.toString() : "lifetime/12",
                price: source.priceType === "free" ? null : Number(source.price),
                source_activated: true,
                btc_total_quantity: 0,
                eth_total_quantity: 0,
                sol_total_quantity: 0,
                alts_total_quantity: 0,
            },
        })
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

                    console.log(" 🚀   -->  pivotResult:", pivotResult)
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
                        exitPrice: null,
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

        const btc_total_quantity = messages.filter((m) => normalizeToken((m.analysis as any).token) === "BTC").length || 0
        const eth_total_quantity = messages.filter((m) => normalizeToken((m.analysis as any).token) === "ETH").length || 0
        const sol_total_quantity = messages.filter((m) => normalizeToken((m.analysis as any).token) === "SOL").length || 0
        const alts_total_quantity = messages.filter(
            (m) =>
                normalizeToken((m.analysis as any).token) &&
                normalizeToken((m.analysis as any).token) !== "BTC" &&
                normalizeToken((m.analysis as any).token) !== "ETH" &&
                normalizeToken((m.analysis as any).token) !== "SOL"
        ).length || 0
        await prisma.source.update({
            where: {
                id: newSource.id,
            },
            data: {
                source_status: SourceStatus.VALIDE,
                metadata: metadata,
                source_total_quantity_signals: messages.length,
                source_global_probility: 0, // after trade

                source_bullish_total_quantity: messages.filter((m) => (m.analysis as any)?.direction === "LONG").length || 0,
                source_bullish_percentage: (messages.filter((m) => (m.analysis as any)?.direction === "LONG").length / messages.length) * 100 || 0,
                source_bullish_probility: 0, // after trade

                source_bearish_total_quantity: messages.filter((m) => (m.analysis as any)?.direction === "SHORT").length || 0,
                source_bearish_percentage: (messages.filter((m) => (m.analysis as any)?.direction === "SHORT").length / messages.length) * 100 || 0,
                source_bearish_probility: 0, // after trade

                btc_total_quantity: btc_total_quantity,
                btc_probility: 0, // after trade

                eth_total_quantity: eth_total_quantity,
                eth_probility: 0, // after trade

                sol_total_quantity: sol_total_quantity,
                sol_probility: 0, // after trade

                alts_total_quantity: alts_total_quantity,
                alts_probility: 0, // after trade
            },
        })
        return {
            status: true,
            id: newSource.user_username_source
        }
    } catch (error: any) {
        console.log(" 🚀   -->  error:", error)
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
        // const messages = [
        //     {
        //         id: "1974728009732284646",
        //         text: "SIGNAL #SOL #SOLUSDT  : ▶ Buy now",
        //         originalText: "SIGNAL #SOL #SOLUSDT : ▶ Buy now",
        //         timestamp: 1761979620,
        //         date: "2025-11-15T13:02:00.000Z",
        //         senderId: "371027604",
        //         mediaType: "text",
        //         analysis: {
        //             type: "Signal",
        //             token: "SOL",
        //             direction: "LONG",
        //             currency: "USDT"
        //         }
        //     },
        //     {
        //         id: "1974728009732284646",
        //         text: "SIGNAL #ETH #ETHUSDT : ▶ Sell now",
        //         originalText: "SIGNAL #ETH #ETHUSDT : ▶ Sell now",
        //         timestamp: 1762325220,
        //         date: "2025-11-20T13:47:00.000Z",
        //         senderId: "371027604",
        //         mediaType: "text",
        //         analysis: {
        //             type: "Signal",
        //             token: "ETH",
        //             direction: "LONG",
        //             currency: "USDT"
        //         }
        //     }
            
        // ]
        return createSource(channelInfo, source, messages, currentUser)
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}