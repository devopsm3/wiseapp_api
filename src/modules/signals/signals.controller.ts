import { NextFunction, Request, Response } from "express"
import { getSignalsService, getSignalByIdService, openSignalService } from "./signals.service"
import { createOrUpdateSignal } from "../../providers/signals/signals.provider"

export const getSignals = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const signals = await getSignalsService(req.user!)

        if (!signals) {
            return res.status(404).json({ status: false, message: "Signals not found" })
        }
        return res.status(200).json({
            status: true,
            data: signals,
        })
    } catch (error) {
        next(error)
    }
}

export const getSignalById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const signal = await getSignalByIdService(Number(req.params.id), req.user!)
        if (!signal) {
            return res.status(404).json({ status: false, message: "Signal not found" })
        }
        return res.status(200).json({
            status: true,
            data: signal,
        })
    } catch (error) {
        next(error)
    }
}

export const openSignal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const signal = await openSignalService(Number(req.params.id), req.user!)
        if (!signal) {
            return res.status(404).json({ status: false, message: "Signal not found" })
        }
        return res.status(200).json({
            status: true
        })
    } catch (error) {
        next(error)
    }
}
export const test = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // const ohlc = await getOHLC(req.query.coin as string, new Date(req.query.date as string))
        
        await createOrUpdateSignal({
            analysis: {
                direction: "bullish",
                token: "BTC",
            },
            newSourceId: 23,
            postCreatedId: 52,
            currentUserId: 1,
            currencyLogo: "BTC",
            pnlAbsolute: 1,
            pnlPercent: 1,
            entryPrice: 1,
            exitPrice: 1,
            entryTimestamp: new Date(req.query.date as string),
        })
        return res.status(200).json({
            status: true,
        })
    } catch (error) {

        console.log(" 🚀   -->  error:", error)
        next(error)
    }
}