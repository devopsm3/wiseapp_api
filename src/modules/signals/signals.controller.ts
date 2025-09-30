import { NextFunction, Request, Response } from "express"
import { getSignalsService, getSignalByIdService } from "./signals.service"
import { coingeckoApiServiceMarket } from "../../services/Coingecko/coingecko.api.service"

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
export const test = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const coingecko_Ping = await coingeckoApiServiceMarket(req.query.coinSymbol as string)

        return res.status(200).json({
            status: true,
            data: coingecko_Ping,
        })
    } catch (error) {
        next(error)
    }
}