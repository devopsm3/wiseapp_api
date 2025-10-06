import { User } from "@prisma/client"
import { prisma } from "../../prisma"
import { coingeckoApiServiceMarket } from "../../providers/Coingecko/coingecko.provider"
import { calculatePnl, getSignalTrendLevel } from "../../providers/signals/signals.helpers"
import { formatDateTime, formatTimeFromNow } from "../../utils/global.helpers"
import { getFilteredSignals } from "../../providers/signals/signals.helpers"
import { SourcePostAnalysis } from "../../providers/sources/sources.types"
import { MetaSignalSetup } from "../../providers/signals/signals.types"

export const getSignalsService = async (currentUser: User) => {
    try {
        const signalsData = await prisma.signal.findMany({
            where: {
                user_db_id: currentUser.id,
            },
            include: {
                Source: {
                    select: {
                        platform_logo: true,
                    }
                },
                SourcePost: {
                    select: {
                        analysis: true,
                    }
                },
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
            const coinInfo = await coingeckoApiServiceMarket(signal.currency_label!.toLowerCase())
            if (coinInfo.length) {
                const { pnlAbsolute, pnlPercent } = calculatePnl({
                    currentPrice: coinInfo[0].current_price,
                    entryPrice: Number(signal.entry_price),
                    exitPrice: signal.exit_price ? Number(signal.exit_price) : null,
                    direction: signal.signal_trend!,
                    leverage: (signal.SourcePost.analysis! as unknown as SourcePostAnalysis).leverage?.[0] || 1,
                    quantity: 1,
                    fees: 0,
                    status: signal.status,
                })
                const signalTrendLevel = getSignalTrendLevel(signal.signal_trend === "LONG" ? "bullish" : "bearish", signal.sources_nbr || 1, alignmentPostsForMetaSignals)
                signalsInfo.push({
                    ...signal,
                    signal_trend_level: signalTrendLevel,
                    pnlAbsolute: pnlAbsolute,
                    pnlPercent: pnlPercent,
                    timeFromNow: signal.entry_timestamp ? formatTimeFromNow(signal.entry_timestamp) : "",
                    readableDate: signal.entry_timestamp ? formatDateTime(signal.entry_timestamp) : "",
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
                Source: {
                    select: {
                        platform_logo: true,
                    }
                },
                SourcePost: {
                    select: {
                        analysis: true,
                    }
                },
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
        }
        filteredSignal = filteredSignal[0]
        if (!filteredSignal) {
            return null
        }
        const coinInfo = await coingeckoApiServiceMarket(signal.currency_label.toLowerCase())
        
        if (coinInfo.length) {
            const { pnlAbsolute, pnlPercent } = calculatePnl({
                currentPrice: coinInfo[0].current_price,
                entryPrice: Number(signal.entry_price),
                exitPrice: signal.exit_price ? Number(signal.exit_price) : null,
                direction: signal.signal_trend,
                leverage: (signal.SourcePost.analysis! as unknown as SourcePostAnalysis).leverage?.[0] || 1,
                quantity: 1,
                fees: 0,
                status: signal.status,
            })
            const signalTrendLevel = getSignalTrendLevel(signal.signal_trend === "LONG" ? "bullish" : "bearish", signal.sources_nbr || 1, alignmentPostsForMetaSignals)

            return {
                ...signal,
                signal_trend_level: signalTrendLevel,
                pnlAbsolute: pnlAbsolute,
                pnlPercent: pnlPercent,
                timeFromNow: signal.entry_timestamp ? formatTimeFromNow(signal.entry_timestamp) : "",
                readableDate: signal.entry_timestamp ? formatDateTime(signal.entry_timestamp) : "",
            }
        }
        return null
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
