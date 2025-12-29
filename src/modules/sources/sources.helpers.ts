import { Source, Signal, PlatformName } from "@prisma/client"
import { PivotCalculationMeta } from "../../providers/CoinMarketCap/coinmarketcap.types"




export const calculateSuspensionMetrics = (signals: Signal[]) => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // 1. Calculate signals_count_last_30d
    const signals_count_last_30d = signals.filter(s => new Date(s.entry_timestamp) >= thirtyDaysAgo).length

    // 2. Calculate bad_signals_count (Consecutive losses)
    // Filter for closed signals (isComplete) or those that have PnL calculated
    // Sort by entry_timestamp ascending to process chronologically
    const sortedSignals = [...signals]
        .filter(s => s.pnlP !== null && s.pnlP !== undefined)
        .sort((a, b) => new Date(a.entry_timestamp).getTime() - new Date(b.entry_timestamp).getTime())

    let bad_signals_count = 0

    for (const signal of sortedSignals) {
        if ((signal.pnlP as number) < 0) {
            bad_signals_count++
        } else {
            // Reset on gain
            bad_signals_count = 0
        }
    }

    return {
        bad_signals_count,
        signals_count_last_30d
    }
}

export const getTokenProfitability = (token: string, signalDetails: Signal[]) => {

    const tokenSignals = signalDetails.filter(s => {
        switch (token) {
        case "BTC": return s.currency_label?.toUpperCase() === "BTC"
        case "ETH": return s.currency_label?.toUpperCase() === "ETH"
        case "SOL": return s.currency_label?.toUpperCase() === "SOL"
        case "ALTS": return !["BTC", "ETH", "SOL"].includes(s.currency_label?.toUpperCase() || "")
        case "BULL": return s.signal_trend === "LONG"
        case "BEAR": return s.signal_trend === "SHORT"
        case "ALL": return true
        default: return false
        }
    })

    if (tokenSignals.length === 0) {
        return {
            count: 0,
            goodSignals: 0,
            percentage: 0,
            profit: 0,
            goodAvgProfit: 0
        }
    }

    const totalProfit = tokenSignals.reduce((sum, s) => sum + (s.pnlP || 0), 0).toFixed(2)
    const goodSignals = tokenSignals.filter(s => (s.pnlP || 0) >= 0)
    const goodSignalsProfit = goodSignals.reduce((sum, s) => sum + (s.pnlP || 0), 0).toFixed(2)
    // const goodAvgProfit = ((goodSignals.length / tokenSignals.length) * 100).toFixed(2)
    const bestSignal = Math.max(...tokenSignals.map(s => s.pnlP || 0)).toFixed(2)
    const worstSignal = Math.min(...tokenSignals.map(s => s.pnlP || 0)).toFixed(2)
    const avgProfitPerSignal = (Number(totalProfit) / tokenSignals.length).toFixed(2)
    const avgProfitPerSignalGood = (Number(goodSignalsProfit) / goodSignals.length).toFixed(2)

    return {
        count: tokenSignals.length,
        goodSignals: goodSignals.length,
        percentage: ((tokenSignals.length / signalDetails.length) * 100).toFixed(2) + "%",
        profit: totalProfit + "%",
        // goodAvgProfit: goodAvgProfit + "%",
        goodSignalsProfit: goodSignalsProfit + "%",
        bestSignal: bestSignal + "%",
        worstSignal: worstSignal + "%",
        avgProfitPerSignal: avgProfitPerSignal + "%",
        avgProfitPerSignalGood: avgProfitPerSignalGood + "%"
    }
}

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

    let bull_profitability_d = 0
    let bull_profitability_w = 0
    let bull_profitability_m = 0
    let bull_profitability_3m = 0
    let bull_profitability_6m = 0
    let bull_profitability_y = 0

    let bear_profitability_d = 0
    let bear_profitability_w = 0
    let bear_profitability_m = 0
    let bear_profitability_3m = 0
    let bear_profitability_6m = 0
    let bear_profitability_y = 0

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
            if (signal.signal_trend === "LONG") { bull_count_d++; bull_profitability_d += pnl }
            if (signal.signal_trend === "SHORT") { bear_count_d++; bear_profitability_d += pnl }
        }
        if (signalDate >= oneWeekAgo) {
            signals_count_w++
            profitability_w += pnl
            token_profitability_w[tokenKey] += pnl
            token_count_w[tokenKey]++
            if (signal.signal_trend === "LONG") { bull_count_w++; bull_profitability_w += pnl }
            if (signal.signal_trend === "SHORT") { bear_count_w++; bear_profitability_w += pnl }
        }
        if (signalDate >= oneMonthAgo) {
            signals_count_m++
            profitability_m += pnl
            token_profitability_m[tokenKey] += pnl
            token_count_m[tokenKey]++
            if (signal.signal_trend === "LONG") { bull_count_m++; bull_profitability_m += pnl }
            if (signal.signal_trend === "SHORT") { bear_count_m++; bear_profitability_m += pnl }
        }
        if (signalDate >= threeMonthsAgo) {
            signals_count_3m++
            profitability_3m += pnl
            token_profitability_3m[tokenKey] += pnl
            token_count_3m[tokenKey]++
            if (signal.signal_trend === "LONG") { bull_count_3m++; bull_profitability_3m += pnl }
            if (signal.signal_trend === "SHORT") { bear_count_3m++; bear_profitability_3m += pnl }
        }
        if (signalDate >= sixMonthsAgo) {
            signals_count_6m++
            profitability_6m += pnl
            token_profitability_6m[tokenKey] += pnl
            token_count_6m[tokenKey]++
            if (signal.signal_trend === "LONG") { bull_count_6m++; bull_profitability_6m += pnl }
            if (signal.signal_trend === "SHORT") { bear_count_6m++; bear_profitability_6m += pnl }
        }
        if (signalDate >= oneYearAgo) {
            signals_count_y++
            profitability_y += pnl
            token_profitability_y[tokenKey] += pnl
            token_count_y[tokenKey]++
            if (signal.signal_trend === "LONG") { bull_count_y++; bull_profitability_y += pnl }
            if (signal.signal_trend === "SHORT") { bear_count_y++; bear_profitability_y += pnl }
        }

        // other stats
        allPnls.push(signal.pnlP)


        // pieChatTokensData 
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

    const sourceSignalsStats = {
        BTC: getTokenProfitability("BTC", signals),
        ETH: getTokenProfitability("ETH", signals),
        SOL: getTokenProfitability("SOL", signals),
        ALTS: getTokenProfitability("ALTS", signals),
        BULL: getTokenProfitability("BULL", signals),
        BEAR: getTokenProfitability("BEAR", signals),
        ALL: getTokenProfitability("ALL", signals)
    }

    const globalStats = {
        success_rate_value: `${sourceSignalsStats.ALL.goodSignals}/${sourceSignalsStats.ALL.count}`,
        success_rate_percentage: Number(((sourceSignalsStats.ALL.goodSignals / sourceSignalsStats.ALL.count) * 100).toFixed(2)),
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

        bull_profitability_d,
        bull_profitability_w,
        bull_profitability_m,
        bull_profitability_3m,
        bull_profitability_6m,
        bull_profitability_y,

        bear_profitability_d,
        bear_profitability_w,
        bear_profitability_m,
        bear_profitability_3m,
        bear_profitability_6m,
        bear_profitability_y,

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
        globalStats,
        sourceSignalsStats
    }
}


type SourceWithSignals = Source & { Signal: Signal[] };

const isMatch = (sigA: Signal, sigB: Signal, hours: number) => {
    const timeDiff = Math.abs(new Date(sigA.entry_timestamp).getTime() - new Date(sigB.entry_timestamp).getTime())
    const hoursDiff = timeDiff / (1000 * 60 * 60)

    return (
        sigA.currency_label === sigB.currency_label &&
        sigA.signal_trend === sigB.signal_trend &&
        hoursDiff <= hours
    )
}

export const calculateTopCorrelations = (
    focusSource: SourceWithSignals,
    otherSources: SourceWithSignals[],
    metaSignalTimeframeHours: number = 72
) => {
    if (!focusSource || !focusSource.Signal || !focusSource.Signal.length) {
        return []
    }

    const correlations = otherSources.map(otherSource => {
        let matchesTotal = 0
        let matchesBull = 0
        let matchesBear = 0

        let matchesBTC = 0
        let matchesETH = 0
        let matchesSOL = 0
        let matchesALTS = 0

        // Filter Focus signals by direction for denominator usage
        const focusBullSignals = focusSource.Signal.filter(s => s.signal_trend === "LONG")
        const focusBearSignals = focusSource.Signal.filter(s => s.signal_trend === "SHORT")

        const focusBTCSignals = focusSource.Signal.filter(s => s.currency_label === "BTC")
        const focusETHSignals = focusSource.Signal.filter(s => s.currency_label === "ETH")
        const focusSOLSignals = focusSource.Signal.filter(s => s.currency_label === "SOL")
        const focusALTSSignals = focusSource.Signal.filter(s => s.currency_label !== "BTC" && s.currency_label !== "ETH" && s.currency_label !== "SOL")

        // Compare Focus signals against Other Source signals
        focusSource.Signal.forEach(focusSig => {
            const hasMatch = otherSource.Signal.some(otherSig =>
                isMatch(focusSig, otherSig, metaSignalTimeframeHours)
            )

            if (hasMatch) {
                matchesTotal++
                if (focusSig.signal_trend === "LONG") matchesBull++
                if (focusSig.signal_trend === "SHORT") matchesBear++
                if (focusSig.currency_label === "BTC") matchesBTC++
                if (focusSig.currency_label === "ETH") matchesETH++
                if (focusSig.currency_label === "SOL") matchesSOL++
                if (focusSig.currency_label !== "BTC" && focusSig.currency_label !== "ETH" && focusSig.currency_label !== "SOL") matchesALTS++
            }
        })

        if (matchesTotal === 0) {
            return {
                show: false,
                stats: {
                    total_correlation: {
                        value: 0,
                    }
                }
            }
        }

        // Percentage Calculations
        // Green Column (Bull): Matches / Total Bull Signals of Focus Source
        const bullPct = focusBullSignals.length === 0 ? 0 : (matchesBull / focusBullSignals.length) * 100

        // Red Column (Bear): Matches / Total Bear Signals of Focus Source
        const bearPct = focusBearSignals.length === 0 ? 0 : (matchesBear / focusBearSignals.length) * 100

        // Blue Column (Total): Matches / Total Signals of Focus Source
        const totalPct = focusSource.Signal.length === 0 ? 0 : (matchesTotal / focusSource.Signal.length) * 100

        const btcPct = focusBTCSignals.length === 0 ? 0 : (matchesBTC / focusBTCSignals.length) * 100
        const ethPct = focusETHSignals.length === 0 ? 0 : (matchesETH / focusETHSignals.length) * 100
        const solPct = focusSOLSignals.length === 0 ? 0 : (matchesSOL / focusSOLSignals.length) * 100
        const altPct = focusALTSSignals.length === 0 ? 0 : (matchesALTS / focusALTSSignals.length) * 100

        let source_url = ""
        if (otherSource.platform === PlatformName.TELEGRAM) {
            source_url = `https://t.me/${otherSource.user_username_source}`
        } else {
            source_url = `https://x.com/${otherSource.user_username_source}`
        }

        return {
            id: otherSource.id,
            source_url,
            source_image_url: otherSource.platform_user_picture,
            platform: otherSource.platform,
            source_name: otherSource.user_name_source,
            source_id: otherSource.user_username_source,
            is_verified: otherSource.user_verified,

            show: bullPct > 0 || bearPct > 0 || totalPct > 0 || btcPct > 0 || ethPct > 0 || solPct > 0 || altPct > 0,

            stats: {
                bull_correlation: {
                    value: Number(bullPct.toFixed(2)),
                    matches: matchesBull,
                    total: focusBullSignals.length
                },
                bear_correlation: {
                    value: Number(bearPct.toFixed(2)),
                    matches: matchesBear,
                    total: focusBearSignals.length
                },
                total_correlation: {
                    value: Number(totalPct.toFixed(2)),
                    matches: matchesTotal,
                    total: focusSource.Signal.length
                },
                btc_correlation: {
                    value: Number(btcPct.toFixed(2)),
                    matches: matchesBTC,
                    total: focusBTCSignals.length
                },
                eth_correlation: {
                    value: Number(ethPct.toFixed(2)),
                    matches: matchesETH,
                    total: focusETHSignals.length
                },
                sol_correlation: {
                    value: Number(solPct.toFixed(2)),
                    matches: matchesSOL,
                    total: focusSOLSignals.length
                },
                alt_correlation: {
                    value: Number(altPct.toFixed(2)),
                    matches: matchesALTS,
                    total: focusALTSSignals.length
                }
            }
        }
    })

    // Sort by Total Correlation (Highest first) and take top 3
    return correlations
        .filter(c => c.show)
        .sort((a, b) => b.stats.total_correlation.value - a.stats.total_correlation.value)
        .slice(0, 3)
}