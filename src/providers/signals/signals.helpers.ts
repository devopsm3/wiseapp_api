import { Setup, SignalTrend, SignalTrendLvl} from "@prisma/client"
import { MetaSignalSetup } from "./signals.types"


type SignalStatus = "NEW" | "OPEN" | "CLOSED" | "PASSED";
type Direction = "LONG" | "SHORT";

interface PnlInput {
    currentPrice: number;
    entryPrice: number;
    exitPrice?: number | null;
    direction: Direction;
    leverage?: number;
    quantity: number;
    status: SignalStatus;
}

interface PnlResult {
    pnlAbsolute: number | null;
    pnlPercent: number | null;
};

export const calculatePnl = ({
    currentPrice,
    entryPrice,
    exitPrice,
    direction,
    leverage,
    quantity,
    status,
}: PnlInput): PnlResult => {
    let priceForCalc: number

    if ((status === "CLOSED") && exitPrice) {
        priceForCalc = exitPrice
    } else if (status === "OPEN" || status === "NEW") {
        priceForCalc = currentPrice
    } else {
        //PASSED → 
        return { pnlAbsolute: null, pnlPercent: null }
    }

    let priceDiff =
        direction === "LONG"
            ? priceForCalc - entryPrice
            : entryPrice - priceForCalc

    let pnl = priceDiff * quantity

    if (leverage) {
        pnl *= leverage
    }

    let capital = (entryPrice * quantity)
    if (leverage) {
        capital /= leverage
    }
    const pnlPercent = Number(((pnl / capital) * 100).toFixed(4))
    const pnlAbsolute = Number(pnl.toFixed(2))

    return { pnlAbsolute, pnlPercent }
}


// signal_trend_level calculate
export const calculateSignalTrendLevel = (signalPostsCount: number, signalTrend: SignalTrend): SignalTrendLvl => {
    const alignmentPostsForMetaSignals = 3
    if (signalPostsCount <= alignmentPostsForMetaSignals) {
        return signalTrend === "LONG" ? "VTC" : "RTC"
    }
    if (signalPostsCount > alignmentPostsForMetaSignals && signalPostsCount < alignmentPostsForMetaSignals * 2) {
        return signalTrend === "LONG" ? "VC" : "RC"
    }
    return signalTrend === "LONG" ? "V100" : "R100"
}

type PivotLevels = {
    pivot: number;
    r1: number;
    s1: number;
    r2: number;
    s2: number;
    r3: number;
    s3: number;
  };
  
export const calculatePivot = (high: number, low: number, close: number): PivotLevels => {
    const pivot = (high + low + close) / 3
  
    return {
        pivot,
        r1: (2 * pivot) - low,
        s1: (2 * pivot) - high,
        r2: pivot + (high - low),
        s2: pivot - (high - low),
        r3: high + 2 * (pivot - low),
        s3: low - 2 * (high - pivot),
    }
}

export const getFilteredSignals = (signalsData: any[], setup: Setup) => {

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
