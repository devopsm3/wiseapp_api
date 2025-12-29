import { NotificationType, PlatformName, SourcePost, SourcePrice, SourceStatus, User } from "@prisma/client"
// import { coingeckoApiServiceMarket } from "../Coingecko/coingecko.provider"
// import { coinImages } from "../Coingecko/constants"
import { normalizeToken } from "../signals/signals.helpers"
import { prisma } from "../../prisma"
import { SourcePostAnalysis, SourceType } from "./sources.types"
import { getTelegramChannelPosts } from "../telegram/telegram.provider"
import { getTwitterChannelPosts } from "../twitter/twitter.provider"
import { calculateMaxPivotFrom21Days, getCoinInfo } from "../CoinMarketCap/coinmarketcap.provider"
import { createOrUpdateSignal } from "../signals/signals.provider"
import { calculateSourceStats, calculateTopCorrelations, calculateSuspensionMetrics } from "../../modules/sources/sources.helpers"
// import { generateSourceRecommendations } from "../AgentAI/recommendations.provider"
import { GlobalSettings } from "../../types/setup.types"
import { getIO } from "../../config/socket"
import { createNotificationService } from "../../modules/notifications/notifications.service"
// import { generateSourceRecommendations } from "../AgentAI/recommendations.provider"


const createSource = async (channelInfo: SourceType, source: any, messages: any[], currentUser: User, lastSavedPostId: string) => {

    console.log(" ----------------------------------------------------------------------------------- ")
    console.log(" ")
    console.log(" ")
    console.log(" 🚀   -->  source:", source)
    console.log(" 🚀   -->  Signal Posts Found:", messages.length)
    console.log(" ")
    console.log(" ")
    console.log(" ----------------------------------------------------------------------------------- ")
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

    // const signalsPosts = messages.filter((m) => m.analysis.type === "Signal" || m.analysis.type === "directSignal")

    // if (!signalsPosts.length) {
    //     return {
    //         status: false,
    //         message: `No valid signals detected for the source '${source.sourceId}'`
    //     }
    // }

    let source_url = ""
    if (channelInfo.platform === PlatformName.TELEGRAM) {
        source_url = `https://t.me/${channelInfo.user_username_source}`
    } else {
        source_url = `https://x.com/${channelInfo.user_username_source}`
    }
    const newSource = await prisma.source.create({
        data: {
            ...channelInfo,
            source_subscription_plan: source.priceType === "free" ? SourcePrice.FREE : source.priceType === "monthly" ? SourcePrice.MONTHLY : SourcePrice.LIFETIME,
            source_subscription_price: source.priceType === "free" ? null : Number(source.price),
            platform: source.sourceType,
            source_url,
        },
    })
    // Create UserSource link
    const userSource = await prisma.userSource.create({
        data: {
            user_id: currentUser.id,
            source_id: newSource!.id,
            source_activated: true,
            source_reverse_signal_activated: false,
            display_name: source.display_name || ""
        }
    })

    // Only process signals if this is a new source
    try {
        const verifiedPosts: any[] = []
        for (let index = 0; index < messages.length; index++) {
            const element = messages[index]
            const analysis = element.analysis as unknown as SourcePostAnalysis

            let post_url = ""
            if (channelInfo.platform === PlatformName.TELEGRAM) {
                post_url = `https://t.me/${channelInfo.user_username_source}/${String(element.id)}`
            } else {
                post_url = `https://x.com/${channelInfo.user_username_source}/status/${String(element.id)}`
            }
            const postCreated = await prisma.sourcePost.create({
                data: {
                    sourceId: newSource!.id,
                    platform: channelInfo.platform as PlatformName,
                    date: element.date,
                    timestamp: element.timestamp,
                    originalId: String(element.id),
                    mediaType: element.mediaType,
                    senderId: element.senderId,
                    text: element.text,
                    originalText: element.originalText,
                    analysis: element.analysis!,
                    post_url
                }
            })

            if (analysis?.token && analysis?.type === "Signal") {
                const normalizedToken = normalizeToken(analysis.token)
                const coinInfo = await getCoinInfo(normalizedToken)
                if (coinInfo) {
                    const currencyLogo = coinInfo.logo
                    const targetDate = new Date(element.date!)

                    const pivotResult = await calculateMaxPivotFrom21Days(normalizedToken, targetDate, analysis.direction!)
                    if (!pivotResult.status || !pivotResult.data) {
                        console.log(`\n --------------------------- 🚨 Failed to get price/pivot data for ${normalizedToken}, skipping signal creation. --------------------------- \n`)
                        await prisma.sourcePost.delete({
                            where: {
                                id: postCreated.id
                            }
                        })
                        continue
                    }
                    const entryPrice = pivotResult.data.priceAtStart || 0
                    const meta = pivotResult.data.meta
                    await createOrUpdateSignal({
                        coinId: coinInfo.id,
                        analysis: {
                            direction: analysis.direction!,
                            token: normalizedToken.toUpperCase(),
                            token_id: coinInfo.id.toString(),
                        },
                        newSourceId: newSource!.id,
                        postCreatedId: postCreated.id,
                        currencyLogo,
                        pnlAbsolute: pivotResult.data.theoreticalProfitAbsolute || 0,
                        pnlPercent: pivotResult.data.theoreticalProfitPercent || 0,
                        entryPrice,
                        exitPrice: pivotResult.data.bestPrice || null,
                        entryTimestamp: new Date(element.date!),
                        isComplete: pivotResult.data.isComplete || false,
                        pivotCalcDays: pivotResult.data.validDays || 0,
                        meta
                    })
                    verifiedPosts.push(postCreated.id)

                } else {
                    console.log(`Token ${analysis.token} not found in CoinMarketCap API`)
                }
            } else {
                console.log(`Invalid signal type: ${analysis.type}`)
            }
        }
        if (!verifiedPosts.length) {
            // Delete both source and user source link
            await prisma.userSource.deleteMany({
                where: { source_id: newSource!.id },
            })
            await prisma.source.delete({
                where: { id: newSource!.id },
            })
            return {
                status: false,
                message: `No valid signals detected for the source '${source.sourceId}'`
            }
        }

        // save last message id
        const currentMetadata = (newSource?.metadata || {}) as any
        currentMetadata.last_message_id = lastSavedPostId

        let sourceActivated: boolean = true

        // await 2 second
        await new Promise((resolve) => setTimeout(resolve, 2000))

        const createdSource = await prisma.source.findUnique({
            where: { id: newSource!.id },
            include: { Signal: true }
        })

        if (!createdSource) {
            return {
                status: false,
                message: `Source '${newSource!.user_username_source}' not found`
            }
        }

        console.log("----------------------- Adding Source : calculating Source > TOP Correlation ----------------------- \n")
        const userOtherSources = await prisma.userSource.findMany({
            where: {
                user_id: currentUser.id,
                source_id: { not: createdSource.id }
            },
            include: {
                Source: {
                    include: { Signal: true }
                }
            }
        })

        const otherSources = userOtherSources.filter(us => us.Source.source_status === SourceStatus.VALIDE).map(us => us.Source)
        let TIME_FRAME_HOURS = 72
        let signalsCountLast30d = 0
        const setup = await prisma.setup.findFirst({
            where: {
                user_db_id: currentUser.id,
            },
        })
        if (setup && setup.settings) {
            const userSetupSettings = (setup?.settings as unknown as Partial<GlobalSettings>)
            TIME_FRAME_HOURS = userSetupSettings.metasignal_time_window || 72
            signalsCountLast30d = userSetupSettings.source_suspend_by_count || 0
        }
        const topCorrelations = calculateTopCorrelations(
            createdSource,
            otherSources,
            TIME_FRAME_HOURS
        )


        const suspensionMetrics = calculateSuspensionMetrics(createdSource?.Signal || [])

        await prisma.source.update({
            where: {
                id: newSource!.id,
            },
            data: {
                source_status: SourceStatus.VALIDE,
                metadata: currentMetadata,
                bad_signals_count: suspensionMetrics.bad_signals_count,
                signals_count_last_30d: suspensionMetrics.signals_count_last_30d
            },
        })
        if (signalsCountLast30d && suspensionMetrics.signals_count_last_30d < signalsCountLast30d) {
            await prisma.userSource.update({
                where: {
                    id: userSource.id,
                },
                data: {
                    source_activated: false,
                    topCorrelations: topCorrelations as any
                }
            })
            sourceActivated = false
        } else {
            await prisma.userSource.update({
                where: {
                    id: userSource.id,
                },
                data: {
                    topCorrelations: topCorrelations as any
                }
            })
        }

        console.log("----------------------- Adding Source : calculating Source > Stat ----------------------- \n")
        const stats = calculateSourceStats(createdSource.Signal || [])

        console.log("----------------------- Adding Source : calculating Source > Recommendations ----------------------- \n")
        // const recommendations = await generateSourceRecommendations({
        //     sourceName: createdSource.user_name_source,
        //     platform: createdSource.platform,
        //     stats: stats,
        //     recentSignalsCount: createdSource.Signal?.length || 0,
        //     followers: createdSource.followers_count
        // })

        await prisma.sourceStats.create({
            data: {
                sourceId: newSource!.id,
                stats: stats,
                recommendations: [],
                // recommendations: recommendations,
                period: "ALL"
            }
        })

        return {
            status: true,
            id: newSource!.user_username_source,
            source_id: newSource!.id,
            source_activated: sourceActivated,
            signals_count_last_30d: suspensionMetrics.signals_count_last_30d,
            min_count: signalsCountLast30d,
            data: {
                type: createdSource.platform,
                name: createdSource.user_name_source,
                created_at: createdSource.createdAt,
                count_signals_found: createdSource.Signal.length,
                btc_count: stats.pieChatTokensData.find(t => t.name === "BTC")?.total_token_count || 0,
                eth_count: stats.pieChatTokensData.find(t => t.name === "ETH")?.total_token_count || 0,
                sol_count: stats.pieChatTokensData.find(t => t.name === "SOL")?.total_token_count || 0,
                alts_count: stats.pieChatTokensData.find(t => t.name === "ALTS")?.total_token_count || 0,
                bull_count: stats.globalStats.total_bull_signals,
                bear_count: stats.globalStats.total_bear_signals
                // global_stats: stats.globalStats
            }
        }
    } catch (error: any) {
        console.log(" 🚀   -->  error:", error)
        // Delete user source link if source processing failed
        await prisma.userSource.deleteMany({
            where: {
                user_id: currentUser.id,
                source_id: newSource!.id
            },
        })
        return {
            status: false,
            message: error.message
        }
    }
}

export const createSourceService = async (channelInfo: SourceType, source: any, currentUser: User) => {
    try {
        const globalSource = await prisma.source.findFirst({
            where: {
                user_username_source: channelInfo.user_username_source,
                platform: source.sourceType,
                source_status: SourceStatus.VALIDE,
            },
        })
        if (globalSource) {
            return {
                status: false,
                message: "Source already exists"
            }
        }
        let messages: SourcePost[] = []
        let lastSavedPostId = ""
        if (source.sourceType === PlatformName.TELEGRAM) {
            const { analysedPostsFiltered, lastSavedId } = await getTelegramChannelPosts(channelInfo?.user_id_source)
            messages = analysedPostsFiltered
            lastSavedPostId = lastSavedId
        } else {
            const { analysedPostsFiltered, lastSavedId } = await getTwitterChannelPosts(channelInfo?.user_id_source)
            messages = analysedPostsFiltered
            lastSavedPostId = lastSavedId
        }
        const result = await createSource(channelInfo, source, messages, currentUser, lastSavedPostId)

        getIO()
            .to("user_" + currentUser.id.toString())
            .emit("sources_creating_finished", result)

        if (result.status) {
            await createNotificationService(
                currentUser.id,
                NotificationType.SOURCE_ADDED,
                "Source Added",
                `Source ${channelInfo.user_name_source} has been added successfully`,
                `/sources?id=${result.source_id}`
            )
            await new Promise((resolve) => setTimeout(resolve, 3000))
            // if the new craeted source is inactive we send notification to user
            if (!result.source_activated) {
                await createNotificationService(
                    currentUser.id,
                    NotificationType.SOURCE_SUSPENDED,
                    "Source Suspended",
                    `Source ${channelInfo.user_name_source} has been suspended due to low activity (${result.signals_count_last_30d} signals in 30 days, required: ${result.min_count}).`,
                    `/sources?id=${result.source_id}`
                )
            }
        }
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}