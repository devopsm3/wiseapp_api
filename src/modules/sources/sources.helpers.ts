import { PivotCalculationMeta } from "../../providers/CoinMarketCap/coinmarketcap.types"

export const calculateSourceStats = (signals: any[]) => {

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

    // const dailyProfitMap: Record<string, number> = {}
    const clusters: Record<string, { day: number, profitRange: string, count: number, totalProfit: number }> = {}
    const allPnls: number[] = []

    const aggregatedSignals: { [key: string]: { name: string; value: number; fill: string, totalProfitPercentage: number, goodSignals: number, badSignals: number } } = {}
    let pieChatTokensData: any[] = []

    const tokenColors: { [key: string]: string } = {
        BTC: "#F7931A",
        ETH: "#627EEA",
        SOL: "#14F195",
        ALTS: "#8B5CF6"
    }

    signals.forEach((signal) => {

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
        // global stats
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

        // other stats
        allPnls.push(signal.pnlP)

        const signalMeta = signal.meta as unknown as PivotCalculationMeta
        const signalMetaPivotData = signalMeta?.pivotData || []

        if (signalMetaPivotData.length > 0) {
            let optimalDayIndex = -1
            if (signal.signal_trend === "LONG") {
                optimalDayIndex = signalMetaPivotData.findIndex(el => el.time === signalMeta.maxPivotDate)
            } else {
                optimalDayIndex = signalMetaPivotData.findIndex(el => el.time === signalMeta.minPivotDate)
            }

            if (optimalDayIndex !== -1) {
                const optimalDay = optimalDayIndex + 1
                const optimalPivot = signalMetaPivotData[optimalDayIndex].pivot
                const priceAtStart = signal.entry_price
                let optimalProfit = 0

                if (signal.signal_trend === "LONG") {
                    optimalProfit = ((optimalPivot - priceAtStart) / priceAtStart) * 100
                } else {
                    optimalProfit = ((priceAtStart - optimalPivot) / priceAtStart) * 100
                }

                // Group by Day and Profit Range (Specific buckets: 1-5, 5-10, >10)
                let rangeLabel = ""
                if (optimalProfit < 5) {
                    rangeLabel = "<5"
                } else if (optimalProfit >= 5 && optimalProfit < 10) {
                    rangeLabel = "5-10"
                } else if (optimalProfit >= 10) {
                    rangeLabel = ">10"
                }

                if (rangeLabel) {
                    const key = `${optimalDay}-${rangeLabel}`

                    if (!clusters[key]) {
                        clusters[key] = { day: optimalDay, profitRange: rangeLabel, count: 0, totalProfit: 0 }
                    }
                    clusters[key].count += 1
                    clusters[key].totalProfit += optimalProfit
                }
            }
        }

        // update aggregatedSignals
        if (!aggregatedSignals[tokenKey]) {
            aggregatedSignals[tokenKey] = {
                name: tokenKey,
                value: 0,
                fill: tokenColors[tokenKey],
                totalProfitPercentage: 0,
                goodSignals: 0,
                badSignals: 0
            }
        }
        aggregatedSignals[tokenKey].value += 1
        aggregatedSignals[tokenKey].totalProfitPercentage += signal.pnlP

        if (signal.pnlP >= 0) {
            aggregatedSignals[tokenKey].goodSignals += 1
        } else {
            aggregatedSignals[tokenKey].badSignals += 1
        }
    })

    const globalStats = {
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
    }

    pieChatTokensData = Object.values(aggregatedSignals).map(item => ({
        name: item.name,
        fill: item.fill,
        total_token_profit_percentage: Number(item.totalProfitPercentage.toFixed(2)),
        total_token_count: item.value,
        good_signals: item.goodSignals,
        bad_signals: item.badSignals,
        win_rate: Number((item.goodSignals / (item.value)) * 100).toFixed(2)
    }))

    // Calculate Top Signals stats
    allPnls.sort((a, b) => b - a)
    const totalProfitAll = allPnls.reduce((a, b) => a + b, 0)
    const calculateTopStats = (percentage: number) => {
        const count = Math.ceil(allPnls.length * percentage)
        const topPnls = allPnls.slice(0, count)
        const topProfit = topPnls.reduce((a, b) => a + b, 0)
        const share = totalProfitAll !== 0 ? (topProfit / totalProfitAll) * 100 : 0
        return { profit: Number(topProfit.toFixed(2)), share: Number(share.toFixed(2)) }
    }
    const top1 = calculateTopStats(0.01)
    const top5 = calculateTopStats(0.05)
    const top10 = calculateTopStats(0.10)


    const optimal_exit = Object.values(clusters).map((c) => ({
        day: c.day,
        profit: Number((c.totalProfit / c.count).toFixed(2)), // Average profit for the cluster
        count: c.count,
        range_start: c.profitRange
    }))

    return {
        optimal_exit: optimal_exit.length > 0 ? optimal_exit : [
            {
                day: 0,
                profit: 0,
                count: 0,
                range_start: ""
            }
        ],
        top: [
            {
                percentage: "1%",
                weight: top1.share,
                profitability: top1.profit,
            },
            {
                percentage: "5%",
                weight: top5.share,
                profitability: top5.profit,
            },
            {
                percentage: "10%",
                weight: top10.share,
                profitability: top10.profit
            },
        ],
        pieChatTokensData,
        globalStats
    }
}
