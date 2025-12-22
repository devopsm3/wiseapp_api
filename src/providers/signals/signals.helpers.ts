import { SignalTrendLvl } from "@prisma/client"

// export const getFilteredSignals = (signalsData: any[], setup: Setup) => {

//     const setupMetaSignals = setup?.meta_signals as unknown as MetaSignalSetup

//     const { BTC, ETH, SOL, ALTS, LONG, SHORT } = setupMetaSignals 

//     const filteredSignals = signalsData.filter((signal) => {
//         const label = signal.currency_label.toUpperCase()

//         // Category filter
//         let categoryMatch = false
//         if (BTC && label.includes("BTC")) categoryMatch = true
//         if (ETH && label.includes("ETH")) categoryMatch = true
//         if (SOL && label.includes("SOL")) categoryMatch = true

//         // ALTS → means not BTC/ETH/SOL
//         if (
//             ALTS &&
//       !label.includes("BTC") &&
//       !label.includes("ETH") &&
//       !label.includes("SOL")
//         ) {
//             categoryMatch = true
//         }

//         // Trend filter
//         let trendMatch = false
//         if (LONG && signal.signal_trend === SignalTrend.LONG) trendMatch = true
//         if (SHORT && signal.signal_trend === SignalTrend.SHORT) trendMatch = true

//         return categoryMatch && trendMatch
//     })

//     return filteredSignals
// }

export const getSignalTrendLevel = (direction: "LONG" | "SHORT", signalSum: number, A: number): SignalTrendLvl => {
    const isLong = direction === "LONG"

    if (signalSum === A) {
        return isLong ? SignalTrendLvl.VTC : SignalTrendLvl.RTC
    } else if (signalSum > A && signalSum < A * 2) {
        return isLong ? SignalTrendLvl.VC : SignalTrendLvl.RC
    } else if (signalSum >= A * 2) {
        return isLong ? SignalTrendLvl.V100 : SignalTrendLvl.R100
    }

    return isLong ? SignalTrendLvl.VTC : SignalTrendLvl.RTC
}

export const normalizeToken = (token: string): string => {
    if (!token) return ""

    const map: Record<string, string> = {
        bitcoin: "BTC",
        btc: "BTC",

        ethereum: "ETH",
        ether: "ETH",
        eth: "ETH",

        solana: "SOL",
        sol: "SOL",
    }

    const key = token.trim().toUpperCase()
    return map[key] || key
}

