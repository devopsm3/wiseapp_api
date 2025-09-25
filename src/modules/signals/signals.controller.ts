import { NextFunction, Request, Response } from "express"
import { getSignalsService, getSignalByIdService } from "./signals.service"

export const getSignals = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const signals = await getSignalsService()
        if (!signals) {
            return res.status(404).json({ status: false, message: "Signals not found" })
        }
        res.status(200).json({
            status: true,
            data: signals,
        })
    } catch (error) {
        next(error)
    }
}

export const getSignalById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const signal = await getSignalByIdService(Number(req.params.id))
        if (!signal) {
            return res.status(404).json({ status: false, message: "Signal not found" })
        }
        res.status(200).json({
            status: true,
            data: signal,
        })
    } catch (error) {
        next(error)
    }
}