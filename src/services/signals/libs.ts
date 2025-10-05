import { Setup, Signal, SignalTrend } from "@prisma/client"
import { MetaSignalSetup } from "../../models/models"

export const getFilteredSignals = (signalsData: Signal[], setup: Setup) => {

    const setupMetaSignals = setup?.meta_signals as unknown as MetaSignalSetup

    const { BTC, ETH, SOL, ALTS, LONG, SHORT } = setupMetaSignals 

    const filteredSignals = signalsData.filter((signal) => {
        const label = signal.currency_label.toUpperCase()

        // Category filter
        let categoryMatch = false
        if (BTC && label.includes("BTC")) categoryMatch = true
        if (ETH && label.includes("ETH")) categoryMatch = true
        if (SOL && label.includes("SOL")) categoryMatch = true

        // ALTS → means not BTC/ETH/SOL
        if (
            ALTS &&
      !label.includes("BTC") &&
      !label.includes("ETH") &&
      !label.includes("SOL")
        ) {
            categoryMatch = true
        }

        // Trend filter
        let trendMatch = false
        if (LONG && signal.signal_trend === SignalTrend.LONG) trendMatch = true
        if (SHORT && signal.signal_trend === SignalTrend.SHORT) trendMatch = true

        return categoryMatch && trendMatch
    })

    return filteredSignals
}
