import { NextFunction, Request, Response } from "express"
import { getSignalsService, getSignalByIdService, openSignalService } from "./signals.service"
import { getTokenPriceAtDate } from "../../providers/CoinMarketCap/coinmarketcap.provider"
// import { createOrUpdateSignal } from "../../providers/signals/signals.provider"

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
        const signalContent = await getSignalByIdService(Number(req.params.id), req.user!)

        if (!signalContent) {
            return res.status(404).json({ status: false, message: "Signal not found" })
        }
        return res.status(200).json({
            status: true,
            data: signalContent,
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

        const priceAtStart = await getTokenPriceAtDate(req.query.token as string, new Date(req.query.date as string))

        // const analyses = await agentAI_signal_analyzer("what on the picture: ",
        //     ["https://pbs.twimg.com/media/G6nDSO5XcAAu6gh?format=jpg&name=large"])
        // const url = "https://openrouter.ai/api/v1/models"
        // const options = {method: "GET"}
        // const response = await fetch(url, options)
        // const data = await response.json()
        return res.status(200).json({
            status: true,
            data: priceAtStart
        })
    } catch (error) {

        console.log(" 🚀   -->  error:", error)
        next(error)
    }
}