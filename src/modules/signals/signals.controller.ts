import { NextFunction, Request, Response } from "express"
import { getSignalsService, getSignalPostsArticlesService, getSignalAiPriceTraceAnalysisService, getSignalAiTokenAnalysisService, getFearAndGreedService } from "./signals.service"
import { getCoinMarketCapFearAndGreedHistory, getTokenPriceAtDate } from "../../providers/CoinMarketCap/coinmarketcap.provider"
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

export const getFearAndGreed = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fearAndGreed = await getFearAndGreedService()
        if (!fearAndGreed) {
            return res.status(404).json({ status: false, message: "Fear and greed not found" })
        }
        return res.status(200).json({
            status: true,
            data: fearAndGreed
        })
    } catch (error) {
        next(error)
    }
}


export const getSignalPostsArticles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const signalContent = await getSignalPostsArticlesService(Number(req.params.id), req.user!)

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

export const getSignalAiPriceTraceAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await getSignalAiPriceTraceAnalysisService(Number(req.params.id), req.user!)

        if (!data) {
            return res.status(404).json({ status: false, message: "Signal not found" })
        }
        return res.status(200).json({
            status: true,
            data,
        })
    } catch (error) {
        next(error)
    }
}

export const getSignalAiTokenAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await getSignalAiTokenAnalysisService(Number(req.params.id), req.user!)

        if (!data) {
            return res.status(404).json({ status: false, message: "Signal not found" })
        }
        return res.status(200).json({
            status: true,
            data,
        })
    } catch (error) {
        next(error)
    }
}

export const getFearAndGreedHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const fearAndGreed = await getCoinMarketCapFearAndGreedHistory()
        if (!fearAndGreed) {
            return res.status(404).json({ status: false, message: "Fear and greed history not found" })
        }
        return res.status(200).json({
            status: true,
            data: fearAndGreed
        })
    } catch (error) {
        next(error)
    }
}

// 

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