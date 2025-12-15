import { prisma } from "../../prisma"

import { sourcesQueue } from "../../jobs/sources.job"
import { PlatformName, SourceStatus, User } from "@prisma/client"
import { getIO } from "../../config/socket"
import { getTelegramChannelInfo } from "../../providers/telegram/telegram.provider"
import { getTwitterChannelInfo } from "../../providers/twitter/twitter.provider"
import { SourceType } from "../../providers/sources/sources.types"
import { normalizeSourceId } from "../../utils/global.helpers"
import { PivotCalculationMeta } from "../../providers/CoinMarketCap/coinmarketcap.types"
import { calculateSourceStats } from "./sources.helpers"

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

        const sourcesData = sources.map((source) => {
            let source_url = ""

            if (source.platform_logo === "TELEGRAM") {
                source_url = `https://t.me/${source.user_username_source}`
            } else {
                source_url = `https://x.com/${source.user_username_source}`
            }

            const now = new Date()
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
            const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

            let signals_count_d = 0
            let signals_count_w = 0
            let signals_count_m = 0
            let signals_count_3m = 0
            let signals_count_6m = 0
            let signals_count_y = 0

            let bull_count_d = 0
            let bull_count_w = 0
            let bull_count_m = 0
            let bull_count_3m = 0
            let bull_count_6m = 0
            let bull_count_y = 0

            let bear_count_d = 0
            let bear_count_w = 0
            let bear_count_m = 0
            let bear_count_3m = 0
            let bear_count_6m = 0
            let bear_count_y = 0

            let profitability_d = 0
            let profitability_w = 0
            let profitability_m = 0
            let profitability_3m = 0
            let profitability_6m = 0
            let profitability_y = 0

            let total_count_signals = 0

            let total_bull_signals = 0
            let total_bear_signals = 0

            const token_profitability_d: any = { BTC: 0, ETH: 0, SOL: 0, ALTS: 0 }
            const token_profitability_w: any = { BTC: 0, ETH: 0, SOL: 0, ALTS: 0 }
            const token_profitability_m: any = { BTC: 0, ETH: 0, SOL: 0, ALTS: 0 }
            const token_profitability_3m: any = { BTC: 0, ETH: 0, SOL: 0, ALTS: 0 }
            const token_profitability_6m: any = { BTC: 0, ETH: 0, SOL: 0, ALTS: 0 }
            const token_profitability_y: any = { BTC: 0, ETH: 0, SOL: 0, ALTS: 0 }

            const token_count_d: any = { BTC: 0, ETH: 0, SOL: 0, ALTS: 0 }
            const token_count_w: any = { BTC: 0, ETH: 0, SOL: 0, ALTS: 0 }
            const token_count_m: any = { BTC: 0, ETH: 0, SOL: 0, ALTS: 0 }
            const token_count_3m: any = { BTC: 0, ETH: 0, SOL: 0, ALTS: 0 }
            const token_count_6m: any = { BTC: 0, ETH: 0, SOL: 0, ALTS: 0 }
            const token_count_y: any = { BTC: 0, ETH: 0, SOL: 0, ALTS: 0 }

            const dailyProfitMap: Record<string, number> = {}

            if (source.Signal) {
                source.Signal.forEach(signal => {
                    const signalMeta = signal.meta as unknown as PivotCalculationMeta
                    const priceAtStart = signal.entry_price
                    const signalMetaPivotData = signalMeta?.pivotData || []
                    const signalDailyProfit: Record<string, number> = {}

                    for (let index = 0; index < signalMetaPivotData.length; index++) {
                        const element = signalMetaPivotData[index]
                        const date = new Date(element.time).toISOString().split("T")[0]
                        const pivot = element.pivot
                        let theoreticalProfitPercent = 0

                        if (signal.signal_trend === "LONG") {
                            theoreticalProfitPercent = ((pivot - priceAtStart) / priceAtStart) * 100
                        } else {
                            theoreticalProfitPercent = ((priceAtStart - pivot) / priceAtStart) * 100
                        }

                        // Store/Overwrite to get the latest PnL for this date for this signal
                        signalDailyProfit[date] = theoreticalProfitPercent
                    }

                    // Add this signal's daily PnL to the source's total daily PnL
                    Object.keys(signalDailyProfit).forEach(date => {
                        if (!dailyProfitMap[date]) {
                            dailyProfitMap[date] = 0
                        }
                        dailyProfitMap[date] += signalDailyProfit[date]
                    })

                    const signalDate = new Date(signal.entry_timestamp)
                    const pnl = signal.pnlP || 0
                    const token = signal.currency_label ? signal.currency_label.toUpperCase() : "ALTS"
                    const tokenKey = ["BTC", "ETH", "SOL"].includes(token) ? token : "ALTS"
                    total_count_signals++
                    if (signal.signal_trend === "LONG") {
                        total_bull_signals++
                    } else {
                        total_bear_signals++
                    }

                    if (signalDate >= oneDayAgo) {
                        signals_count_d++
                        profitability_d += pnl
                        token_profitability_d[tokenKey] += pnl
                        token_count_d[tokenKey]++
                        if (signal.signal_trend === "LONG") bull_count_d++
                        if (signal.signal_trend === "SHORT") bear_count_d++
                    }
                    if (signalDate >= oneWeekAgo) {
                        signals_count_w++
                        profitability_w += pnl
                        token_profitability_w[tokenKey] += pnl
                        token_count_w[tokenKey]++
                        if (signal.signal_trend === "LONG") bull_count_w++
                        if (signal.signal_trend === "SHORT") bear_count_w++
                    }
                    if (signalDate >= oneMonthAgo) {
                        signals_count_m++
                        profitability_m += pnl
                        token_profitability_m[tokenKey] += pnl
                        token_count_m[tokenKey]++
                        if (signal.signal_trend === "LONG") bull_count_m++
                        if (signal.signal_trend === "SHORT") bear_count_m++

                    }
                    if (signalDate >= threeMonthsAgo) {
                        signals_count_3m++
                        profitability_3m += pnl
                        token_profitability_3m[tokenKey] += pnl
                        token_count_3m[tokenKey]++
                        if (signal.signal_trend === "LONG") bull_count_3m++
                        if (signal.signal_trend === "SHORT") bear_count_3m++
                    }
                    if (signalDate >= sixMonthsAgo) {
                        signals_count_6m++
                        profitability_6m += pnl
                        token_profitability_6m[tokenKey] += pnl
                        token_count_6m[tokenKey]++
                        if (signal.signal_trend === "LONG") bull_count_6m++
                        if (signal.signal_trend === "SHORT") bear_count_6m++
                    }
                    if (signalDate >= oneYearAgo) {
                        signals_count_y++
                        profitability_y += pnl
                        token_profitability_y[tokenKey] += pnl
                        token_count_y[tokenKey]++
                        if (signal.signal_trend === "LONG") bull_count_y++
                        if (signal.signal_trend === "SHORT") bear_count_y++
                    }
                })
            }

            return {
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

                bull_count_d,
                bull_count_w,
                bull_count_m,
                bull_count_3m,
                bull_count_6m,
                bull_count_y,

                bear_count_d,
                bear_count_w,
                bear_count_m,
                bear_count_3m,
                bear_count_6m,
                bear_count_y,

                profitability_d: Number(profitability_d.toFixed(2)),
                profitability_w: Number(profitability_w.toFixed(2)),
                profitability_m: Number(profitability_m.toFixed(2)),
                profitability_3m: Number(profitability_3m.toFixed(2)),
                profitability_6m: Number(profitability_6m.toFixed(2)),
                profitability_y: Number(profitability_y.toFixed(2)),

                signals_count_d,
                signals_count_w,
                signals_count_m,
                signals_count_3m,
                signals_count_6m,
                signals_count_y,

                token_profitability_d,
                token_profitability_w,
                token_profitability_m,
                token_profitability_3m,
                token_profitability_6m,
                token_profitability_y,

                token_count_d,
                token_count_w,
                token_count_m,
                token_count_3m,
                token_count_6m,
                token_count_y,

                total_count_signals,
                total_bull_signals,
                total_bear_signals,

                // focus
                followers_count: source.followers_count,
                account_created_at: new Date(source.user_creation_date * 1000),
                deleted_posts: source.source_validation_deleted_count,
                source_url,
                daily_profit_history: Object.keys(dailyProfitMap).map(date => ({
                    date,
                    pnl: Number(dailyProfitMap[date].toFixed(2))
                })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            }
        })

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
        return error
    }
}

// get source by id or username
export const getSourceByIdService = async (id: string, currentUser: User) => {

    try {
        const n = Number(id)
        const sourceId = isNaN(n) ? null : n
        let source
        if (sourceId) {
            source = await prisma.source.findUnique({
                where: {
                    id: sourceId,
                    user_db_id: currentUser.id,
                    // source_status: SourceStatus.VALIDE,
                },
            })
        } else {
            source = await prisma.source.findFirst({
                where: {
                    user_username_source: id,
                    user_db_id: currentUser.id,
                    source_status: SourceStatus.VALIDE,
                },
            })
        }
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
export const getSourceSignalsDetailsService = async (sourceId: number, currentUser: User) => {
    try {
        const signals = await prisma.signal.findMany({
            where: {
                sourceId: sourceId,
                user_db_id: currentUser.id,
            },
            orderBy: {
                entry_timestamp: "desc"
            }
        })

        const formattedSignals = signals.map(signal => ({
            id: signal.id.toString(),
            token_symbol: signal.currency_label,
            token_logo: signal.currency_logo,
            trend: signal.signal_trend === "LONG" ? "bullish" : "bearish",
            pnl_percent: signal.pnlP,
            created_at: signal.entry_timestamp.toISOString(),
            entry_price: signal.entry_price,
            exit_price: signal.exit_price || 0
        }))

        let stats
        const sourceStats = await prisma.sourceStats.findUnique({
            where: {
                sourceId_period: {
                    sourceId: sourceId,
                    period: "ALL"
                }
            }
        })

        if (sourceStats && sourceStats.stats) {
            stats = sourceStats.stats as any
        } else {
            stats = calculateSourceStats(signals)
        }

        return {
            status: true,
            data: {
                signals: formattedSignals,
                optimal_exit: stats.optimal_exit,
                top: stats.top
            }
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
            // status: "CLOSED", // Only finished signals
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
