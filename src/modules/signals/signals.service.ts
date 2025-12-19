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
    }

    const setup = await prisma.setup.findFirst({
        where: {
            user_db_id: currentUser.id,
        },
    })
    if (setup && setup.settings) {
        setupsettings = (setup?.settings as unknown as Partial<GlobalSettings>)
    }

    const metasignal_quorum_min = setupsettings.metasignal_quorum_min || 3
    const metasignal_time_window = setupsettings.metasignal_time_window || 72
    return { metasignal_quorum_min, metasignal_time_window }
}
export const getSignalsService = async (currentUser: User) => {
    try {
        const signalsData = await prisma.signal.findMany({
            where: {
                user_db_id: currentUser.id,
            },
            include: {
                Source: true,
                SourcePost: true,
            }
        })

        // Format signals data
        const signalsInfo = []
        for (let i = 0; i < signalsData.length; i++) {
            const signal = signalsData[i]
            const source = signal.Source
            let post_url = ""
            let source_url = ""

            if (source.platform_logo === "TELEGRAM") {
                post_url = `https://t.me/${source.user_username_source}/${String(signal.SourcePost.originalId)}`
                source_url = `https://t.me/${source.user_username_source}`
            } else {
                post_url = `https://x.com/${source.user_username_source}/status/${String(signal.SourcePost.originalId)}`
                source_url = `https://x.com/${source.user_username_source}`
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
                        platform: source.platform_logo,
                        source_name: source.user_name_source,
                        is_verified: source.user_verified,
                        source_id: source.user_username_source,
                        source_url,
                        post_url: [post_url],
                        id: source.id

                    }
                ]
            })
        }

        // Format Meta signals data
        let filteredSignals = signalsData
        filteredSignals.sort((a, b) => new Date(a.entry_timestamp).getTime() - new Date(b.entry_timestamp).getTime())
        const metaSignalsInfo = []
        const processedSignals = []
        const tempGroups: { [key: string]: { signals: typeof filteredSignals, sourceIds: Set<number> } } = {}
        const { metasignal_quorum_min, metasignal_time_window } = await getUserSettings(currentUser)
        
        for (const signal of filteredSignals) {
            const key = `${signal.currency_label.toUpperCase()}-${signal.signal_trend.toUpperCase()}`
            const sourceId = signal.Source.id

            if (!tempGroups[key]) {
                tempGroups[key] = {
                    signals: [signal],
                    sourceIds: new Set([sourceId])
                }
            } else {
                const currentGroup = tempGroups[key]

                // Skip if this source is already in the current group
                if (currentGroup.sourceIds.has(sourceId)) {
                    continue
                }

                const firstSignal = currentGroup.signals[0]
                const timeDiff = new Date(signal.entry_timestamp).getTime() - new Date(firstSignal.entry_timestamp).getTime()
                const daysDiff = timeDiff / (1000 * 3600 * 24)

                if (daysDiff <= (metasignal_time_window * 24)) {
                    currentGroup.signals.push(signal)
                    currentGroup.sourceIds.add(sourceId)
                } else {
                    // Push the completed group to processed list
                    processedSignals.push([...currentGroup.signals])

                    // Start new group
                    tempGroups[key] = {
                        signals: [signal],
                        sourceIds: new Set([sourceId])
                    }
                }
            }
        }

        // Add remaining groups
        Object.values(tempGroups).forEach(group => processedSignals.push(group.signals))

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
                let post_url = ""
                let source_url = ""

                if (source.platform_logo === "TELEGRAM") {
                    post_url = `https://t.me/${source.user_username_source}/${String(signal.SourcePost.originalId)}`
                    source_url = `https://t.me/${source.user_username_source}`
                } else {
                    post_url = `https://x.com/${source.user_username_source}/status/${String(signal.SourcePost.originalId)}`
                    source_url = `https://x.com/${source.user_username_source}`
                }

                sources.push({
                    source_image_url: source.platform_user_picture,
                    platform: source.platform_logo,
                    source_name: source.user_name_source,
                    is_verified: source.user_verified,
                    source_id: source.user_username_source,
                    source_url,
                    post_url: [post_url],
                    id: source.id
                })
            }

            const signalTrendLevel = getSignalTrendLevel(oldestSignal.signal_trend === "LONG" ? "bullish" : "bearish", totalAlignment, metasignal_quorum_min)
            metaSignalsInfo.push({
                trend: oldestSignal.signal_trend === "LONG" ? "bullish" : "bearish",
                id: oldestSignal.id, // Use oldest signal ID as representative
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
                user_db_id: currentUser.id,
            }
        })

        if (!signal) {
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
                user_db_id: currentUser.id,
            }
        })

        if (!signal) {
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
                        user_db_id: currentUser.id,
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
                user_db_id: currentUser.id,
            }
        })

        if (!signal) {
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
                        user_db_id: currentUser.id,
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
