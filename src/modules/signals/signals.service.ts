import { User } from "@prisma/client"
import { prisma } from "../../prisma"
// import { coingeckoApiServiceMarket } from "../../providers/Coingecko/coingecko.provider"
import { getSignalTrendLevel } from "../../providers/signals/signals.helpers"
import { formatDateTime, formatTimeFromNow } from "../../utils/global.helpers"
import { getFilteredSignals } from "../../providers/signals/signals.helpers"
import { MetaSignalSetup } from "../../providers/signals/signals.types"
import { PivotCalculationMeta } from "../../providers/CoinMarketCap/coinmarketcap.types"

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

        const setup = await prisma.setup.findFirst({
            where: {
                user_db_id: currentUser.id,
            },
        })

        let filteredSignals = signalsData

        if (setup) {
            filteredSignals = getFilteredSignals(signalsData, setup)
        }
        const signalsInfo = []
        const alignmentPostsForMetaSignals = (setup?.meta_signals as unknown as MetaSignalSetup)?.alignment_posts_for_meta_signals || 3

        for (let i = 0; i < filteredSignals.length; i++) {
            const signal = filteredSignals[i]
            const source = signal.Source
            const signalTrendLevel = getSignalTrendLevel(signal.signal_trend === "LONG" ? "bullish" : "bearish", signal.sources_nbr || 1, alignmentPostsForMetaSignals)
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
                        post_url,
                    }
                ],
                // trend: signal.____________,
                // trend: signal.____________,
                // trend: signal.____________,
                // trend: signal.____________,
            })
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
