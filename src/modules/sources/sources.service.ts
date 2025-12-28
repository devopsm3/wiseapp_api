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
import { removeSourceFromMandatoryListService } from "../setups/setups.service"

// get all sources
export const getSourcesService = async (currentUser: User) => {
    try {
        // Get user's sources through UserSource
        const userSources = await prisma.userSource.findMany({
            where: {
                user_id: currentUser.id,
            },
            include: { Source: true }
        })

        // Filter out sources that aren't VALIDE
        const validUserSources = userSources.filter(us => us.Source.source_status === SourceStatus.VALIDE)
        const sourcesData: any[] = []
        for (let index = 0; index < validUserSources.length; index++) {
            const userSource = validUserSources[index]
            const source = userSource.Source

            const sourceStats = await prisma.sourceStats.findUnique({
                where: {
                    sourceId_period: {
                        sourceId: source.id,
                        period: "ALL"
                    }
                }
            })

            const stats = sourceStats?.stats as any

            sourcesData.push({
                id: source.id,
                source_image_url: source.platform_user_picture,
                platform: source.platform,
                is_active: userSource.source_activated,
                is_paid: source.source_subscription_plan !== "FREE",
                reverse_signal: userSource.source_reverse_signal_activated,
                source_name: source.user_name_source,
                source_id: source.user_username_source,
                price_monthly: source.source_subscription_price,
                is_verified: source.user_verified,

                ...stats.globalStats,
                // focus
                followers_count: source.followers_count,
                account_created_at: new Date(source.user_creation_date * 1000),
                deleted_posts: source.deleted_count,
                source_url: source.source_url,
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

// add source
export const addSourceService = async (source: any, currentUser: User) => {

    try {
        const normalizedSourceId = normalizeSourceId(source.sourceId)

        const globalSource = await prisma.source.findFirst({
            where: {
                user_username_source: normalizedSourceId,
                platform: source.sourceType,
                source_status: SourceStatus.VALIDE,
            },
        })


        if (globalSource) {
            const userSourceExists = await prisma.userSource.findUnique({
                where: {
                    user_id_source_id: {
                        user_id: currentUser.id,
                        source_id: globalSource.id
                    }
                }
            })

            if (userSourceExists) {
                return {
                    status: false,
                    message: "Source already exists in your account"
                }
            }

            getIO().to("user_" + currentUser.id.toString()).emit("sources_creating_init")


            await prisma.userSource.create({
                data: {
                    user_id: currentUser.id,
                    source_id: globalSource.id,
                    source_activated: true,
                    source_reverse_signal_activated: false
                }
            })

            const sourceWithSignals = await prisma.source.findUnique({
                where: { id: globalSource.id },
                include: { Signal: true }
            })

            let sourceStats = await prisma.sourceStats.findUnique({
                where: {
                    sourceId_period: {
                        sourceId: globalSource.id,
                        period: "ALL"
                    }
                }
            })

            let stats
            const dbStats = sourceStats?.stats
            const hasStatsObject = dbStats !== null && typeof dbStats === "object" && !Array.isArray(dbStats) && Object.keys(dbStats).length > 0

            if (hasStatsObject) {
                stats = dbStats as any
            } else {
                stats = calculateSourceStats(sourceWithSignals!.Signal || [])
            }

            getIO().to("user_" + currentUser.id.toString()).emit("sources_creating_finished", {
                status: true,
                id: sourceWithSignals!.user_username_source,
                data: {
                    type: sourceWithSignals!.platform,
                    name: sourceWithSignals!.user_name_source,
                    created_at: sourceWithSignals!.createdAt,
                    count_signals_found: sourceWithSignals!.Signal.length,
                    btc_count: stats.pieChatTokensData?.find((t: any) => t.name === "BTC")?.total_token_count || 0,
                    eth_count: stats.pieChatTokensData?.find((t: any) => t.name === "ETH")?.total_token_count || 0,
                    sol_count: stats.pieChatTokensData?.find((t: any) => t.name === "SOL")?.total_token_count || 0,
                    alts_count: stats.pieChatTokensData?.find((t: any) => t.name === "ALTS")?.total_token_count || 0,
                    bull_count: stats.globalStats.total_bull_signals,
                    bear_count: stats.globalStats.total_bear_signals
                }
            })


            return {
                status: true,
                message: "Source added to your account successfully"
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

// delete source
export const deleteSourceByIdService = async (id: number, currentUser: User) => {
    try {
        const deletedSource = await prisma.userSource.delete({
            where: {
                user_id_source_id: {
                    user_id: currentUser.id,
                    source_id: id
                }
            },
        })

        await removeSourceFromMandatoryListService(id, currentUser)

        return deletedSource
    } catch (error) {
        return error
    }
}

// toggle source activation
export const toggleSourceActivationService = async (id: number, currentUser: User, body: any) => {

    try {
        // Update UserSource activation settings
        const updatedUserSource = await prisma.userSource.update({
            where: {
                user_id_source_id: {
                    user_id: currentUser.id,
                    source_id: id
                }
            },
            data: {
                source_activated: body.is_active,
                source_reverse_signal_activated: body.reverse_signal,
            },
        })

        if (body.is_active === false) {
            await removeSourceFromMandatoryListService(id, currentUser)
        }

        return {
            status: true,
            updatedUserSource
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
                source_status: SourceStatus.VALIDE,
            }
        })

        if (!focusSource) {
            return {
                status: false,
                message: "Source not found"
            }
        }

        // Verify user has access to this source
        const userSource = await prisma.userSource.findUnique({
            where: {
                user_id_source_id: {
                    user_id: currentUser.id,
                    source_id: focusSourceId
                }
            }
        })

        if (!userSource) {
            return {
                status: false,
                message: "You don't have access to this source"
            }
        }

        const signals = await prisma.signal.findMany({
            where: {
                sourceId: focusSourceId,
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

            // Get user's other sources through UserSource
            const userOtherSources = await prisma.userSource.findMany({
                where: {
                    user_id: currentUser.id,
                    source_id: { not: focusSourceId }
                },
                include: {
                    Source: {
                        include: { Signal: true }
                    }
                }
            })

            // Filter valid sources and map to Source objects
            const otherSources = userOtherSources
                .filter(us => us.Source.source_status === SourceStatus.VALIDE)
                .map(us => us.Source)
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

        const sourceSignalsStats = (sourceStats?.stats as any)?.sourceSignalsStats ||  {
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
                signalsStats: sourceSignalsStats,
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
                source_status: SourceStatus.VALIDE,
            },
        })

        if (!source) {
            return {
                status: false,
                message: "Source not found"
            }
        }

        // Verify user has access to this source
        const userSource = await prisma.userSource.findUnique({
            where: {
                user_id_source_id: {
                    user_id: currentUser.id,
                    source_id: sourceId
                }
            }
        })

        if (!userSource) {
            return {
                status: false,
                message: "You don't have access to this source"
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
                platform: source.platform,
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

export const getSourceSetupService = async (sourceId: number, currentUser: User) => {
    try {
        const source = await prisma.source.findUnique({
            where: {
                id: sourceId,
            },
        })

        if (!source) {
            return {
                status: false,
                message: "Source not found"
            }
        }

        const userSource = await prisma.userSource.findUnique({
            where: {
                user_id_source_id: {
                    user_id: currentUser.id,
                    source_id: sourceId
                }
            },
            include: {
                SourceSetup: true
            }
        })

        if (!userSource) {
            return {
                status: false,
                message: "You don't have access to this source"
            }
        }

        if (userSource.SourceSetup) {
            return {
                status: true,
                data: {
                    source_setup_filter_btc: userSource.SourceSetup.source_setup_filter_btc,
                    source_setup_filter_eth: userSource.SourceSetup.source_setup_filter_eth,
                    source_setup_filter_sol: userSource.SourceSetup.source_setup_filter_sol,
                    source_setup_filter_alts: userSource.SourceSetup.source_setup_filter_alts,
                    source_setup_filter_bullish: userSource.SourceSetup.source_setup_filter_bullish,
                    source_setup_filter_bearish: userSource.SourceSetup.source_setup_filter_bearish,
                    source_setup_filter_binance_only: userSource.SourceSetup.source_setup_filter_binance_only
                }
            }
        }

        // Return default setup if not exists (all true except binance)
        const defaultSetup: any = {
            source_setup_filter_btc: true,
            source_setup_filter_eth: true,
            source_setup_filter_sol: true,
            source_setup_filter_alts: true,
            source_setup_filter_bullish: true,
            source_setup_filter_bearish: true,
            source_setup_filter_binance_only: false
        }

        return {
            status: true,
            data: defaultSetup
        }

    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}

export const setSourceSetupService = async (sourceId: number, setupData: any, currentUser: User) => {
    try {
        const userSource = await prisma.userSource.findUnique({
            where: {
                user_id_source_id: {
                    user_id: currentUser.id,
                    source_id: sourceId
                }
            }
        })

        if (!userSource) {
            return {
                status: false,
                message: "You don't have access to this source"
            }
        }

        const setup = await prisma.sourceSetup.upsert({
            where: {
                userSourceId: userSource.id
            },
            update: {
                source_setup_filter_btc: setupData.source_setup_filter_btc,
                source_setup_filter_eth: setupData.source_setup_filter_eth,
                source_setup_filter_sol: setupData.source_setup_filter_sol,
                source_setup_filter_alts: setupData.source_setup_filter_alts,
                source_setup_filter_bullish: setupData.source_setup_filter_bullish,
                source_setup_filter_bearish: setupData.source_setup_filter_bearish,
                source_setup_filter_binance_only: setupData.source_setup_filter_binance_only ?? false
            },
            create: {
                userSourceId: userSource.id,
                source_setup_filter_btc: setupData.source_setup_filter_btc ?? true,
                source_setup_filter_eth: setupData.source_setup_filter_eth ?? true,
                source_setup_filter_sol: setupData.source_setup_filter_sol ?? true,
                source_setup_filter_alts: setupData.source_setup_filter_alts ?? true,
                source_setup_filter_bullish: setupData.source_setup_filter_bullish ?? true,
                source_setup_filter_bearish: setupData.source_setup_filter_bearish ?? true,
                source_setup_filter_binance_only: setupData.source_setup_filter_binance_only ?? false
            }
        })

        return {
            status: true,
            data: {
                source_setup_filter_btc: setup.source_setup_filter_btc,
                source_setup_filter_eth: setup.source_setup_filter_eth,
                source_setup_filter_sol: setup.source_setup_filter_sol,
                source_setup_filter_alts: setup.source_setup_filter_alts,
                source_setup_filter_bullish: setup.source_setup_filter_bullish,
                source_setup_filter_bearish: setup.source_setup_filter_bearish,
                source_setup_filter_binance_only: setup.source_setup_filter_binance_only
            }
        }

    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}

export const getSourcePostsService = async (sourceId: number, currentUser: User) => {
    try {
        const userSource = await prisma.userSource.findUnique({
            where: {
                user_id_source_id: {
                    user_id: currentUser.id,
                    source_id: sourceId
                }
            }
        })

        if (!userSource) {
            return {
                status: false,
                message: "You don't have access to this source"
            }
        }

        const posts = await prisma.sourcePost.findMany({
            where: {
                sourceId
            },
            include: {
                Signal: true
            }
        })
        return {
            status: true,
            data: posts.map((post) => {
                const signal = post.Signal.find((signal) => signal.source_post_id === post.id)
                let signal_id = null
                if (signal) {
                    signal_id = signal.id
                }
                return {
                    id: post.id,
                    post_url: post.post_url,
                    text: post.originalText,
                    posted_at: post.date,
                    post_type: (post.analysis as any).type,
                    post_trend: (post.analysis as any).direction,
                    post_token: (post.analysis as any).token,
                    signal_id: signal_id
                }
            })
        }
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}
