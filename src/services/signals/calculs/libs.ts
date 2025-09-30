import { SignalTrend, SignalTrendLvl } from "@prisma/client"

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
        // NEW أو PASSED → 
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
