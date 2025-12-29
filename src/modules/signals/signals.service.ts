import { User } from "@prisma/client"
import { prisma } from "../../prisma"
import { getSignalTrendLevel } from "../../providers/signals/signals.helpers"
import { PivotCalculationMeta } from "../../providers/CoinMarketCap/coinmarketcap.types"
import { GlobalSettings } from "../../types/setup.types"
import { getCoinInfo, getCoinMarketCapFearAndGreed, getCoinMarketCapFearAndGreedHistory, getCoinMarketCapLatestArticles, getCoinMarketCapLatestPosts, getCoinMarketCapTopPosts, QuotesLatest } from "../../providers/CoinMarketCap/coinmarketcap.provider"
import { generateTokenAnalysis, getAiAnalysis } from "../../providers/AgentAI/token_analysis.provider"

const getUserSettings = async (currentUser: User) => {
    let setupsettings: Partial<GlobalSettings> = {
        metasignal_quorum_min: 2,
        metasignal_time_window: 72,
        metasignal_filter_btc: true,
        metasignal_filter_eth: true,
        metasignal_filter_sol: true,
        metasignal_filter_alts: true,
        metasignal_filter_bullish: true,
        metasignal_filter_bearish: true
        // metasignal_filter_binance_only: false,
    }

    const setup = await prisma.setup.findFirst({
        where: {
            user_db_id: currentUser.id,
        },
    })
    if (setup && setup.settings) {
        setupsettings = (setup?.settings as unknown as Partial<GlobalSettings>)
    }

    const metasignal_quorum_min = setupsettings.metasignal_quorum_min ?? 3
    const metasignal_time_window = setupsettings.metasignal_time_window ?? 72
    const metasignal_filter_btc = setupsettings.metasignal_filter_btc ?? true
    const metasignal_filter_eth = setupsettings.metasignal_filter_eth ?? true
    const metasignal_filter_sol = setupsettings.metasignal_filter_sol ?? true
    const metasignal_filter_alts = setupsettings.metasignal_filter_alts ?? true
    const metasignal_filter_bullish = setupsettings.metasignal_filter_bullish ?? true
    const metasignal_filter_bearish = setupsettings.metasignal_filter_bearish ?? true
    // const metasignal_filter_binance_only = setupsettings.metasignal_filter_binance_only || true

    // Populate mandatory sources from UserSource
    const mandatoryUserSources = await prisma.userSource.findMany({
        where: {
            user_id: currentUser.id,
            is_mandatory: true,
        },
        select: {
            source_id: true,
        },
    })
    const metasignal_mandatory_sources_ids = mandatoryUserSources.map(us => us.source_id)

    return {
        metasignal_quorum_min,
        metasignal_time_window,
        metasignal_filter_btc,
        metasignal_filter_eth,
        metasignal_filter_sol,
        metasignal_filter_alts,
        metasignal_filter_bullish,
        metasignal_filter_bearish,
        metasignal_mandatory_sources_ids
    }
}

export const getSignalsService = async (currentUser: User) => {
    try {
        // Get user's sources through UserSource
        const userSources = await prisma.userSource.findMany({
            where: {
                user_id: currentUser.id,
                source_activated: true,
            },
            include: {
                SourceSetup: true,
                Source: {
                    include: {
                        Signal: {
                            include: {
                                Source: true,
                                SourcePost: true
                            }
                        }
                    }
                }
            }
        })

        // Flatten signals from all user's sources
        const signalsData = userSources.flatMap(us => us.Source.Signal)

        // 1- signals data
        const signalsInfo = []
        for (let i = 0; i < signalsData.length; i++) {
            const signal = signalsData[i]
            const source = signal.Source

            // Check if signal matches user preference for filter
            const userSource = userSources.find(us => us.source_id === source.id)

            if (userSource && userSource.SourceSetup) {
                const setup = userSource.SourceSetup
                const isBullish = signal.signal_trend === "LONG"
                const isBearish = signal.signal_trend === "SHORT"
                const coinLabel = signal.currency_label.toUpperCase()
                const isBtc = coinLabel === "BTC"
                const isEth = coinLabel === "ETH"
                const isSol = coinLabel === "SOL"
                const isAlts = !isBtc && !isEth && !isSol

                if (!setup.source_setup_filter_btc && isBtc) continue
                if (!setup.source_setup_filter_eth && isEth) continue
                if (!setup.source_setup_filter_sol && isSol) continue
                if (!setup.source_setup_filter_alts && isAlts) continue
                if (!setup.source_setup_filter_bullish && isBullish) continue
                if (!setup.source_setup_filter_bearish && isBearish) continue
                // if (setup.source_setup_filter_binance_only && ...) // Logic for binance only if needed
            }

            signalsInfo.push({
                trend: signal.signal_trend === "LONG" ? "bullish" : "bearish",
                id: signal.id,
                pnl_value: signal.pnlA ? Number(signal.pnlA) : 0,
                pnl_percent: signal.pnlP ? Number(signal.pnlP) : 0,
                status: signal.status.toLowerCase(),
                token_symbol: signal.currency_label,
                token_logo: signal.currency_logo,
                created_at: signal.entry_timestamp,
                entry_price: Number(signal.entry_price),
                exit_price: signal.exit_price ? Number(signal.exit_price) : null,
                alignment_count: signal.sources_nbr,
                signal_trend_level: signal.signal_trend === "LONG" ? "V100" : "R100",
                price_analytics: (signal.meta as unknown as PivotCalculationMeta).pivotData || [],
                sources: [
                    {
                        source_image_url: source.platform_user_picture,
                        platform: source.platform,
                        source_name: source.user_name_source,
                        is_verified: source.user_verified,
                        source_id: source.user_username_source,
                        source_url: source.source_url,
                        post_url: [signal.SourcePost.post_url],
                        id: source.id,
                        is_mandatory: userSource?.is_mandatory || false

                    }
                ]
            })
        }

        // 2- Meta_signals data
        let filteredSignals = signalsData
        filteredSignals.sort((a, b) => new Date(a.entry_timestamp).getTime() - new Date(b.entry_timestamp).getTime())
        const metaSignalsInfo = []
        const processedSignals = []
        const { metasignal_quorum_min,
            metasignal_time_window,
            metasignal_filter_btc,
            metasignal_filter_eth,
            metasignal_filter_sol,
            metasignal_filter_alts,
            metasignal_filter_bullish,
            metasignal_filter_bearish,
            metasignal_mandatory_sources_ids } = await getUserSettings(currentUser)

        // 1. Bucket signals by Currency-Trend
        const buckets: { [key: string]: typeof filteredSignals } = {}
        for (const signal of filteredSignals) {
            const coinLabel = signal.currency_label.toUpperCase()
            const isMajor = ["BTC", "ETH", "SOL"].includes(coinLabel)

            if (!metasignal_filter_btc && coinLabel === "BTC") continue
            if (!metasignal_filter_eth && coinLabel === "ETH") continue
            if (!metasignal_filter_sol && coinLabel === "SOL") continue
            if (!metasignal_filter_alts && !isMajor) continue

            if (!metasignal_filter_bullish && signal.signal_trend === "LONG") continue
            if (!metasignal_filter_bearish && signal.signal_trend === "SHORT") continue

            const key = `${coinLabel}-${signal.signal_trend}`

            if (!buckets[key]) {
                buckets[key] = []
            }
            buckets[key].push(signal)
        }

        // 2. Cluster signals within each bucket
        const usedSignalIds = new Set<number>()

        for (const key in buckets) {
            const groupSignals = buckets[key]
            
            for (let i = 0; i < groupSignals.length; i++) {
                const rootSignal = groupSignals[i]
                
                // Skip if this signal is already part of a valid group
                if (usedSignalIds.has(rootSignal.id)) continue

                const potentialGroup = [rootSignal]
                const groupSourceIds = new Set([rootSignal.Source.id])

                // Look ahead for compatible signals
                for (let j = i + 1; j < groupSignals.length; j++) {
                    const nextSignal = groupSignals[j]
                    
                    // Skip if used
                    if (usedSignalIds.has(nextSignal.id)) continue

                    // Check time window (hours)
                    const timeDiffMs = new Date(nextSignal.entry_timestamp).getTime() - new Date(rootSignal.entry_timestamp).getTime()
                    const hoursDiff = timeDiffMs / (1000 * 3600)

                    if (hoursDiff > metasignal_time_window) {
                        // Since signals are sorted, any further signals will also be outside the window
                        break
                    }

                    // Check source uniqueness
                    if (groupSourceIds.has(nextSignal.Source.id)) {
                        // Duplicate source in this window - skip for this group, 
                        // but don't mark as used so it can potentially form its own group later
                        continue
                    }

                    // Add to group
                    potentialGroup.push(nextSignal)
                    groupSourceIds.add(nextSignal.Source.id)
                }

                // Check Quorum and Mandatory Sources
                if (potentialGroup.length >= metasignal_quorum_min) {
                    const hasAllMandatory = metasignal_mandatory_sources_ids.every(id => groupSourceIds.has(id))                    
                    if (hasAllMandatory) {
                        processedSignals.push(potentialGroup)
                        // Mark all signals in this group as used
                        potentialGroup.forEach(s => usedSignalIds.add(s.id))
                    }
                }
            }
        }

        for (const group of processedSignals) {
            // Skip groups with less than metasignal_quorum_min signals (need at least 2 different sources)
            if (group.length < metasignal_quorum_min) {
                continue
            }

            const oldestSignal = group[0] // Already sorted

            let totalPnlA = 0
            let totalPnlP = 0
            let totalAlignment = 0
            const sources = []

            for (const signal of group) {
                totalPnlA += signal.pnlA ? Number(signal.pnlA) : 0
                totalPnlP += signal.pnlP ? Number(signal.pnlP) : 0
                totalAlignment += signal.sources_nbr || 0

                const source = signal.Source

                sources.push({
                    source_image_url: source.platform_user_picture,
                    platform: source.platform,
                    source_name: source.user_name_source,
                    is_verified: source.user_verified,
                    source_id: source.user_username_source,
                    source_url: source.source_url,
                    post_url: [signal.SourcePost.post_url],
                    id: source.id,
                    is_mandatory: userSources.find(us => us.source_id === source.id)?.is_mandatory || false
                })
            }

            const signalTrendLevel = getSignalTrendLevel(oldestSignal.signal_trend, totalAlignment, metasignal_quorum_min)
            metaSignalsInfo.push({
                trend: oldestSignal.signal_trend === "LONG" ? "bullish" : "bearish",
                id: oldestSignal.id,
                pnl_value: totalPnlA,
                pnl_percent: totalPnlP,
                status: oldestSignal.status.toLowerCase(),
                token_symbol: oldestSignal.currency_label,
                token_logo: oldestSignal.currency_logo,
                created_at: oldestSignal.entry_timestamp,
                entry_price: Number(oldestSignal.entry_price),
                exit_price: oldestSignal.exit_price ? Number(oldestSignal.exit_price) : null,
                alignment_count: totalAlignment,
                signal_trend_level: signalTrendLevel,
                price_analytics: (oldestSignal.meta as unknown as PivotCalculationMeta).pivotData || [],
                sources: sources,
            })
        }

        return {
            signals: signalsInfo,
            meta_signals: metaSignalsInfo
        }
    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return null
    }
}

export const getFearAndGreedService = async () => {
    try {
        const fearAndGreedIndex = await getCoinMarketCapFearAndGreed()

        if (!fearAndGreedIndex) {
            return null
        }
        return {
            fear_and_greed_index: fearAndGreedIndex
        }
    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return null
    }
}

export const getSignalPostsArticlesService = async (id: number, currentUser: User) => {
    try {
        const signal = await prisma.signal.findUnique({
            where: {
                id: id,
            },
            include: {
                Source: true
            }
        })

        if (!signal) {
            return null
        }

        // Verify user has access to this signal's source
        const userSource = await prisma.userSource.findUnique({
            where: {
                user_id_source_id: {
                    user_id: currentUser.id,
                    source_id: signal.Source.id
                }
            }
        })

        if (!userSource) {
            return null
        }

        const coinmarketcapTopPosts = await getCoinMarketCapTopPosts(signal.coin_id!)
        const coinmarketcapLatestPosts = await getCoinMarketCapLatestPosts(signal.coin_id!)
        const coinmarketcapLatestArticles = await getCoinMarketCapLatestArticles(signal.coin_id!)


        return {
            coinmarketcapTopPosts: coinmarketcapTopPosts || [],
            coinmarketcapLatestPosts: coinmarketcapLatestPosts || [],
            coinmarketcapLatestArticles: coinmarketcapLatestArticles || []
        }

    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return null
    }
}

export const getSignalAiPriceTraceAnalysisService = async (id: number, currentUser: User) => {
    try {
        const signal = await prisma.signal.findUnique({
            where: {
                id: id,
            },
            include: {
                Source: true
            }
        })

        if (!signal) {
            return null
        }

        // Verify user has access to this signal's source
        const userSource = await prisma.userSource.findUnique({
            where: {
                user_id_source_id: {
                    user_id: currentUser.id,
                    source_id: signal.Source.id
                }
            }
        })

        if (!userSource) {
            return null
        }

        const today = new Date()
        const isAnalysisFromToday = signal.ai_price_trace_analysis_at
            ? new Date(signal.ai_price_trace_analysis_at!).toDateString() === today.toDateString()
            : false

        let ai_price_trace_analysis = signal.ai_price_trace_analysis

        if (!ai_price_trace_analysis || !isAnalysisFromToday) {
            const ai_price_trace_analysis_response = await getAiAnalysis({
                token: signal.currency_label,
                price_at_start: signal.entry_price,
                signal_trend: signal.signal_trend === "LONG" ? "bullish" : "bearish",
                historical_pivot_prices: (signal.meta as unknown as PivotCalculationMeta).pivotData || [],
            })
            if (ai_price_trace_analysis_response.status) {
                // save in db
                await prisma.signal.update({
                    where: {
                        id: id,
                    },
                    data: {
                        ai_price_trace_analysis: ai_price_trace_analysis_response.data || "",
                        ai_price_trace_analysis_at: new Date()
                    }
                })
            }
            ai_price_trace_analysis = ai_price_trace_analysis_response.data
        } else {
            ai_price_trace_analysis = signal.ai_price_trace_analysis
        }

        return {
            aiPriceTraceAnalysis: ai_price_trace_analysis || ""
        }

    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return null
    }
}

export const getSignalAiTokenAnalysisService = async (id: number, currentUser: User) => {
    try {
        const signal = await prisma.signal.findUnique({
            where: {
                id: id,
            },
            include: {
                Source: true
            }
        })

        if (!signal) {
            return null
        }

        // Verify user has access to this signal's source
        const userSource = await prisma.userSource.findUnique({
            where: {
                user_id_source_id: {
                    user_id: currentUser.id,
                    source_id: signal.Source.id
                }
            }
        })

        if (!userSource) {
            return null
        }

        const coinInfo = await getCoinInfo(signal.currency_label)
        const coinQuotesLatest = await QuotesLatest(signal.coin_id!.toString())

        const today = new Date()
        const isTokenAnalysisFromToday = signal.ai_token_analysis_at
            ? new Date(signal.ai_token_analysis_at!).toDateString() === today.toDateString()
            : false
        let token_analysis = signal.ai_token_analysis

        if (!token_analysis || !isTokenAnalysisFromToday) {
            const token_analysis_response = await generateTokenAnalysis(
                {
                    token: coinInfo?.name || signal.currency_label,
                    quoteLatest: coinQuotesLatest
                })

            if (token_analysis_response.status) {
                // save in db
                await prisma.signal.update({
                    where: {
                        id: id,
                    },
                    data: {
                        ai_token_analysis: token_analysis_response.data || "",
                        ai_token_analysis_at: new Date()
                    }
                })
            }
            token_analysis = token_analysis_response.data
        } else {
            token_analysis = signal.ai_token_analysis
        }

        return {
            aiTokenAnalysis: token_analysis ? JSON.parse(token_analysis as any) : null
        }

    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return null
    }
}

export const getFearAndGreedHistory = async () => {
    try {
        const fearAndGreed = await getCoinMarketCapFearAndGreedHistory()
        return fearAndGreed
    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return null
    }
}
