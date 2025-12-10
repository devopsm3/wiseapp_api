import { User } from "@prisma/client"
import { prisma } from "../../prisma"
// import { coingeckoApiServiceMarket } from "../../providers/Coingecko/coingecko.provider"
import { getSignalTrendLevel } from "../../providers/signals/signals.helpers"
import { formatDateTime, formatTimeFromNow } from "../../utils/global.helpers"
import { getFilteredSignals } from "../../providers/signals/signals.helpers"
import { MetaSignalSetup } from "../../providers/signals/signals.types"
import { PivotCalculationMeta } from "../../providers/CoinMarketCap/coinmarketcap.types"

export const getSignalsService = async (currentUser: User, type: "signals" | "meta_signals") => {
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

        // const setup = await prisma.setup.findFirst({
        //     where: {
        //         user_db_id: currentUser.id,
        //     },
        // })

        let filteredSignals = signalsData

        // if (setup) {
        //     filteredSignals = getFilteredSignals(signalsData, setup)
        // }
        const signalsInfo = []
        // const alignmentPostsForMetaSignals = (setup?.meta_signals as unknown as MetaSignalSetup)?.alignment_posts_for_meta_signals || 3
        const alignmentPostsForMetaSignals = 3

        if (type === "signals") {
            for (let i = 0; i < filteredSignals.length; i++) {
                const signal = filteredSignals[i]
                const source = signal.Source
                const signalTrendLevel = getSignalTrendLevel(signal.signal_trend === "LONG" ? "bullish" : "bearish", signal.sources_nbr || 1, 1)
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
                    // ...signal,
                    // entry_price: Number(signal.entry_price).toFixed(2),
                    // exit_price: signal.exit_price ? Number(signal.exit_price).toFixed(2) : null,
                    // signal_trend_level: signalTrendLevel,
                    // pnlAbsolute: signal.pnlA ? Number(signal.pnlA).toFixed(2) : 0,
                    // pnlPercent: signal.pnlP ? Number(signal.pnlP).toFixed(2) : 0,
                    // timeFromNow: signal.entry_timestamp ? formatTimeFromNow(signal.entry_timestamp) : "",
                    // readableDate: signal.entry_timestamp ? formatDateTime(signal.entry_timestamp) : "",
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
                    signal_trend_level: signalTrendLevel,
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
                    ],
                    // trend: signal.____________,
                    // trend: signal.____________,
                    // trend: signal.____________,
                    // trend: signal.____________,
                })
            }
        }
        if (type === "meta_signals") {
            // Sort signals by date (oldest first) to ensure correct grouping timeline
            filteredSignals.sort((a, b) => new Date(a.entry_timestamp).getTime() - new Date(b.entry_timestamp).getTime())

            // Linear processing to handle multiple groups for same token/trend correctly
            const processedSignals = []
            const tempGroups: { [key: string]: { signals: typeof filteredSignals, sourceIds: Set<number> } } = {}

            for (const signal of filteredSignals) {
                const key = `${signal.currency_label}-${signal.signal_trend}`
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

                    if (daysDiff <= 3) {
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
                // Skip groups with only 1 signal (need at least 2 different sources)
                if (group.length < 2) {
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

                const signalTrendLevel = getSignalTrendLevel(oldestSignal.signal_trend === "LONG" ? "bullish" : "bearish", totalAlignment, alignmentPostsForMetaSignals)

                signalsInfo.push({
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
        } 
        return signalsInfo
    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return null
    }
}

// get signal by id
export const getSignalByIdService = async (id: number, currentUser: User) => {
    try {
        const signal = await prisma.signal.findUnique({
            where: {
                id: id,
                user_db_id: currentUser.id,
            },
            include: {
                Source: true,
                // {
                //     select: {
                //         platform_logo: true,
                //     }
                // },
                SourcePost: true
                // {
                //     select: {
                //         analysis: true,
                //     }
                // },
            }
        })
        if (!signal) {
            return null
        }
        let filteredSignal: any = signal
        const setup = await prisma.setup.findFirst({
            where: {
                user_db_id: currentUser.id,
            },
        })
        const alignmentPostsForMetaSignals = (setup?.meta_signals as unknown as MetaSignalSetup)?.alignment_posts_for_meta_signals || 3
        if (setup) {
            filteredSignal = getFilteredSignals([signal], setup)
            filteredSignal = filteredSignal[0]
            if (!filteredSignal) {
                return null
            }
        }
        const signalTrendLevel = getSignalTrendLevel(signal.signal_trend === "LONG" ? "bullish" : "bearish", signal.sources_nbr || 1, alignmentPostsForMetaSignals)

        const signalInfo = {
            ...signal,
            Source: {
                ...signal.Source,
                postId: String(signal.SourcePost.originalId)
            },
            entry_price: Number(signal.entry_price).toFixed(2),
            exit_price: signal.exit_price ? Number(signal.exit_price).toFixed(2) : null,
            signal_trend_level: signalTrendLevel,
            pnlAbsolute: signal.pnlA ? Number(signal.pnlA).toFixed(2) : 0,
            pnlPercent: signal.pnlP ? Number(signal.pnlP).toFixed(2) : 0,
            timeFromNow: signal.entry_timestamp ? formatTimeFromNow(signal.entry_timestamp) : "",
            readableDate: signal.entry_timestamp ? formatDateTime(signal.entry_timestamp) : "",
        }
        return signalInfo

    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return null
    }
}

export const openSignalService = async (id: number, currentUser: User) => {
    try {
        const signal = await prisma.signal.update({
            where: {
                id: id,
                user_db_id: currentUser.id,
            },
            data: {
                status: "OPEN",
            },
        })
        return signal
    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return null
    }
}
