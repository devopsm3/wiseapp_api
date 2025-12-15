import { PivotCalculationMeta } from "../../providers/CoinMarketCap/coinmarketcap.types"

export const calculateSourceStats = (signals: any[]) => {
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

        const rawSymbol = signal.currency_label
        const symbol = ["BTC", "ETH", "SOL"].includes(rawSymbol) ? rawSymbol : "ALTS"

        if (!aggregatedSignals[symbol]) {
            aggregatedSignals[symbol] = {
                name: symbol,
                value: 0,
                fill: tokenColors[symbol],
                totalProfitPercentage: 0,
                goodSignals: 0,
                badSignals: 0
            }
        }

        // Update stats
        aggregatedSignals[symbol].value += 1
        aggregatedSignals[symbol].totalProfitPercentage += signal.pnlP

        if (signal.pnlP >= 0) {
            aggregatedSignals[symbol].goodSignals += 1
        } else {
            aggregatedSignals[symbol].badSignals += 1
        }
        // other stats

        const signalMeta = signal.meta as unknown as PivotCalculationMeta
        const signalMetaPivotData = signalMeta?.pivotData || []
        allPnls.push(signal.pnlP)

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
    })

    pieChatTokensData = Object.values(aggregatedSignals).map(item => ({
        name: item.name,
        fill: item.fill,
        total_token_profit_percentage: Number(item.totalProfitPercentage.toFixed(2)),
        total_token_count: item.value,
        good_signals: item.goodSignals,
        bad_signals: item.badSignals
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

    return {
        optimal_exit: Object.values(clusters).map((c) => ({
            day: c.day,
            profit: Number((c.totalProfit / c.count).toFixed(2)), // Average profit for the cluster
            count: c.count,
            range_start: c.profitRange
        })),
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
        pieChatTokensData
    }
}
