import { prisma } from "../../prisma"

import { sourcesQueue } from "../../jobs/sources.job"
import { PlatformName, Prisma, SourceStatus, User } from "@prisma/client"
import { getIO } from "../../config/socket"
import { getTelegramChannelInfo } from "../../providers/telegram/telegram.provider"
import { getTwitterChannelInfo } from "../../providers/twitter/twitter.provider"
import { SourceType } from "../../providers/sources/sources.types"
import { normalizeSourceId } from "../../utils/global.helpers"
import { calculateSourceStats, calculateTopCorrelations, getTokenProfitability } from "./sources.helpers"
import { generateSourceRecommendations } from "../../providers/AgentAI/recommendations.provider"
import { GlobalSettings } from "../../types/setup.types"

// get all sources
export const getSourcesService = async (currentUser: User) => {
    try {
        const sources = await prisma.source.findMany({
            where: {
                user_db_id: currentUser.id,
                source_status: SourceStatus.VALIDE
            },
            include: {
                Signal: true
            }
        })
        const sourcesData: any[] = []
        for (let index = 0; index < sources.length; index++) {
            const source = sources[index]

            let source_url = ""
            if (source.platform_logo === "TELEGRAM") {
                source_url = `https://t.me/${source.user_username_source}`
            } else {
                source_url = `https://x.com/${source.user_username_source}`
            }

            const sourceStats = await prisma.sourceStats.findUnique({
                where: {
                    sourceId_period: {
                        sourceId: source.id,
                        period: "ALL"
                    }
                }
            })


            let stats
            const dbStats = sourceStats?.stats
            const hasStatsObject = dbStats !== null && typeof dbStats === "object" && !Array.isArray(dbStats) && Object.keys(dbStats).length > 0

            if (hasStatsObject) {
                console.log(" 🚀   -->  Stats already calculated in Getting Sources --------------- :")
                stats = dbStats as any
            } else {
                console.log(" 🚀   -->  Stats calculating in Getting Sources --------------- :")
                stats = calculateSourceStats(source.Signal || [])
                await prisma.sourceStats.upsert({
                    where: {
                        sourceId_period: {
                            sourceId: source.id,
                            period: "ALL",
                        },
                    },
                    update: {
                        stats: stats as any,
                    },
                    create: {
                        sourceId: source.id,
                        period: "ALL",
                        stats: stats as any,
                    },
                })
            }

            sourcesData.push({
                id: source.id,
                source_image_url: source.platform_user_picture,
                platform: source.platform_logo,
                is_active: source.source_activated,
                is_paid: source.source_price !== "FREE",
                reverse_signal: source.source_reverse_signal_activated,
                source_name: source.user_name_source,
                source_id: source.user_username_source,
                price_monthly: source.source_price_value,
                is_verified: source.user_verified,

                ...stats.globalStats,

                // focus
                followers_count: source.followers_count,
                account_created_at: new Date(source.user_creation_date * 1000),
                deleted_posts: source.source_validation_deleted_count,
                source_url,
                stats: {
                    optimal_exit: stats.optimal_exit,
                    pieChatTokensData: stats.pieChatTokensData,
                    top: stats.top,
                },
            })

        }

        // Calculate rankings
        const sortedByProfitability = [...sourcesData].sort((a, b) => b.profitability_y - a.profitability_y)
        const sortedBySignals = [...sourcesData].sort((a, b) => b.total_count_signals - a.total_count_signals)
        const sortedByBull = [...sourcesData].sort((a, b) => b.total_bull_signals - a.total_bull_signals)
        const sortedByBear = [...sourcesData].sort((a, b) => b.total_bear_signals - a.total_bear_signals)

        const sourcesWithRankings = sourcesData.map(source => {
            const ranking_profitability = sortedByProfitability.findIndex(s => s.id === source.id) + 1
            const ranking_signals = sortedBySignals.findIndex(s => s.id === source.id) + 1
            const ranking_bull = sortedByBull.findIndex(s => s.id === source.id) + 1
            const ranking_bear = sortedByBear.findIndex(s => s.id === source.id) + 1
            return {
                ...source,
                ranking_profitability,
                ranking_signals,
                ranking_bull,
                ranking_bear,
            }
        })

        return sourcesWithRankings

    } catch (error) {

        console.log(" 🚀   -->  error:", error)
        return error
    }
}

// get source by id or username
export const getSourceByIdService = async (id: string, currentUser: User) => {

    try {
        const source = await prisma.source.findUnique({
            where: {
                id: Number(id),
                user_db_id: currentUser.id,
                source_status: SourceStatus.VALIDE,
            },
        })

        if (!source) {
            return {
                status: false,
                message: "Source not found"
            }
        }

        return {
            status: true,
            source: source
        }
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}

// add source
export const addSourceService = async (source: any, currentUser: User) => {

    try {
        const normalizedSourceId = normalizeSourceId(source.sourceId)
        const sourceExists = await prisma.source.findFirst({
            where: {
                user_username_source: normalizedSourceId,
                user_db_id: currentUser.id,
                platform_logo: source.sourceType,
                source_status: SourceStatus.VALIDE,
            },
        })
        if (sourceExists) {
            return {
                status: false,
                message: "Source already exists in your account"
            }
        }
        let channelInfo: SourceType | null = null
        if (source.sourceType === PlatformName.TELEGRAM) {
            const channel = await getTelegramChannelInfo(normalizedSourceId)
            channelInfo = channel.channelInfo
        }
        if (source.sourceType === PlatformName.X) {
            const channel = await getTwitterChannelInfo(normalizedSourceId)
            channelInfo = channel.channelInfo
        }
        if (!channelInfo) {
            return {
                status: false,
                message:
                    source.sourceType === PlatformName.TELEGRAM
                        ? `Telegram channel '${source.sourceId}' could not be found or is inaccessible.`
                        : `User '${source.sourceId}' could not be found or the profile is unavailable.`
            }
        }

        getIO().to("user_" + currentUser.id.toString()).emit("sources_creating_init")
        await sourcesQueue.add("createSourceJob", { channelInfo, source, currentUser })
        return {
            status: true
        }
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}

// update source
export const updateSourceByIdService = async (id: number, source: any) => {
    try {
        const updatedSource = await prisma.source.update({
            where: {
                id: id,
            },
            data: source,
        })
        return {
            status: true,
            updatedSource
        }
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}

// delete source
export const deleteSourceByIdService = async (id: number) => {
    try {
        const deletedSource = await prisma.source.delete({
            where: {
                id: id,
            },
        })
        return deletedSource
    } catch (error) {
        return error
    }
}

// toggle source activation
export const toggleSourceActivationService = async (id: number, currentUser: User, body: any) => {

    try {
        const updatedSource = await prisma.source.update({
            where: {
                id: id,
                user_db_id: currentUser.id,
            },
            data: {
                source_activated: body.is_active,
                source_reverse_signal_activated: body.reverse_signal,
            },
        })
        return {
            status: true,
            updatedSource
        }
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}

// get source signals details
export const getSourceSignalsDetailsService = async (focusSourceId: number, currentUser: User) => {
    try {
        const focusSource = await prisma.source.findUnique({
            where: {
                id: focusSourceId,
                user_db_id: currentUser.id,
                source_status: SourceStatus.VALIDE,
            }
        })

        if (!focusSource) {
            return {
                status: false,
                message: "Source not found"
            }
        }

        const signals = await prisma.signal.findMany({
            where: {
                sourceId: focusSourceId,
                user_db_id: currentUser.id,
            },
            orderBy: {
                entry_timestamp: "desc"
            }
        })


        const sourceStats = await prisma.sourceStats.findUnique({
            where: {
                sourceId_period: {
                    sourceId: focusSourceId,
                    period: "ALL"
                }
            }
        })

        const correlations = sourceStats?.topCorrelations
        const hasTopCorrelationsArray = Array.isArray(correlations) && correlations.length > 0

        let topCorrelations: any = []

        if (hasTopCorrelationsArray) {
            console.log(" 🚀   -->  Top correlations already calculated in Getting Signals Details -------:")
            topCorrelations = correlations as Prisma.JsonArray
        } else {
            console.log(" 🚀   -->  Top correlations calculating in Getting Signals Details -------:")
            const otherSources = await prisma.source.findMany({
                where: {
                    user_db_id: currentUser.id,
                    source_status: SourceStatus.VALIDE,
                    id: { not: focusSourceId }
                },
                include: { Signal: true }
            })
            let TIME_FRAME_HOURS = 48
            const setup = await prisma.setup.findFirst({
                where: {
                    user_db_id: currentUser.id,
                },
            })
            if (setup && setup.settings) {
                const setupsettings = (setup?.settings as unknown as Partial<GlobalSettings>)
                TIME_FRAME_HOURS = setupsettings.metasignal_time_window || 48
            }

            topCorrelations = calculateTopCorrelations(
                { ...focusSource, Signal: signals },
                otherSources,
                TIME_FRAME_HOURS
            )
            await prisma.sourceStats.upsert({
                where: {
                    sourceId_period: {
                        sourceId: focusSourceId,
                        period: "ALL",
                    },
                },
                update: {
                    topCorrelations: topCorrelations as any,
                },
                create: {
                    sourceId: focusSourceId,
                    period: "ALL",
                    topCorrelations: topCorrelations as any,
                    stats: {},
                    recommendations: []
                },
            })
        }


        const signalsStats = {
            BTC: getTokenProfitability("BTC", signals),
            ETH: getTokenProfitability("ETH", signals),
            SOL: getTokenProfitability("SOL", signals),
            ALTS: getTokenProfitability("ALTS", signals),
            BULL: getTokenProfitability("BULL", signals),
            BEAR: getTokenProfitability("BEAR", signals),
            ALL: getTokenProfitability("ALL", signals)
        }
        return {
            status: true,
            data: {
                signalsStats,
                topCorrelations
            }
        }
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}

export const getSourceRecommendationsService = async (sourceId: number, currentUser: User) => {
    try {
        const source = await prisma.source.findUnique({
            where: {
                id: sourceId,
                user_db_id: currentUser.id,
                source_status: SourceStatus.VALIDE,
            },
        })

        if (!source) {
            return {
                status: false,
                message: "Source not found"
            }
        }

        const sourceStats = await prisma.sourceStats.findUnique({
            where: {
                sourceId_period: {
                    sourceId: sourceId,
                    period: "ALL"
                }
            }
        })

        let stats
        const dbStats = sourceStats?.stats
        const hasStatsObject = dbStats !== null && typeof dbStats === "object" && !Array.isArray(dbStats) && Object.keys(dbStats).length > 0


        if (hasStatsObject) {
            console.log(" 🚀   -->  Stats already calculated in Getting Recommendations -------:")
            stats = dbStats as Prisma.JsonObject
        } else {
            console.log(" 🚀   -->  Stats calculating in Getting Recommendations -------:")
            const signals = await prisma.signal.findMany({
                where: {
                    sourceId: sourceId,
                    user_db_id: currentUser.id,
                },
                orderBy: {
                    entry_timestamp: "desc"
                }
            })
            stats = calculateSourceStats(signals)

            await prisma.sourceStats.upsert({
                where: {
                    sourceId_period: {
                        sourceId: sourceId,
                        period: "ALL"
                    }
                },
                update: {
                    stats: stats as any
                },
                create: {
                    sourceId: sourceId,
                    period: "ALL",
                    stats: stats as any
                }
            })
        }

        let recommendations
        const dbRecommendations = sourceStats?.recommendations
        const hasRecommendationsArray = Array.isArray(dbRecommendations) && dbRecommendations.length > 0

        if (hasRecommendationsArray) {
            console.log(" 🚀   -->  Recommendations already calculated in Getting Recommendations -------:")
            recommendations = dbRecommendations as Prisma.JsonArray
        } else {
            console.log(" 🚀   -->  Recommendations calculating in Getting Recommendations -------:")
            recommendations = await generateSourceRecommendations({
                sourceName: source.user_name_source,
                platform: source.platform_logo,
                stats,
                followers_count: source.followers_count
            })

            await prisma.sourceStats.upsert({
                where: {
                    sourceId_period: {
                        sourceId: sourceId,
                        period: "ALL"
                    }
                },
                update: {
                    recommendations: recommendations as any
                },
                create: {
                    sourceId: sourceId,
                    period: "ALL",
                    stats: stats as any,
                    recommendations: recommendations as any
                }
            })
        }

        return {
            status: true,
            data: recommendations
        }
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}

export const getSourceProfitHistory = async (sourceId: number, currentUser: User, tokenFilter?: string) => {
    const signals = await prisma.signal.findMany({
        where: {
            sourceId: sourceId,
            ...(tokenFilter && { token: tokenFilter })
        },
        orderBy: { entry_timestamp: "asc" },
    })

    const tokensCount = {
        BTC: 0,
        ETH: 0,
        SOL: 0,
        ALTS: 0
    }
    for (let i = 0; i < signals.length; i++) {
        if (signals[i].currency_label === "BTC") {
            tokensCount.BTC++
        } else if (signals[i].currency_label === "ETH") {
            tokensCount.ETH++
        } else if (signals[i].currency_label === "SOL") {
            tokensCount.SOL++
        } else {
            tokensCount.ALTS++
        }
    }
    let runningTotal = 0
    const chartData = signals.map(sig => {
        runningTotal += sig.pnlP // or sig.pnlAbsolute
        return {
            date: sig.entry_timestamp.toLocaleDateString(),
            token: sig.currency_label,
            pnl: sig.pnlP.toFixed(2),
            cumulative_pnl: Number(runningTotal.toFixed(2))
        }
    })


    return {
        status: true,
        data: {
            filter: tokenFilter || "ALL",
            chart_data: chartData,
            tokens_count: tokensCount
        }
    }
}
