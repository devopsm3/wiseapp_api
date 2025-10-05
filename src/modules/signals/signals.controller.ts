import { NextFunction, Request, Response } from "express"
import { getSignalsService, getSignalByIdService } from "./signals.service"
import { getStartTimeISO_LocalMidnight } from "../../providers/twitter/twitter.helpers"
import { TwitterApi } from "twitter-api-v2"

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
        const client = new TwitterApi(process.env.X_BAREAR_TOKEN!)
        const readOnlyClient = client.readOnly
        const daysAgo = Number(process.env.FETCH_DAYS_AGO) || 5
        const startTime = getStartTimeISO_LocalMidnight(daysAgo)
        const tweets = await readOnlyClient.v2.userTimeline("371027604", {
            max_results: 5,
            "tweet.fields": ["created_at", "text", "id", "author_id", "attachments", ],
            "start_time": startTime,
            expansions: ["attachments.media_keys", "attachments.poll_ids"], // 👈 expands attached media
            "media.fields": ["url", "preview_image_url", "type", "width", "height", "alt_text"],
        })
        // const meta = tweets.data.meta
        const tweetsData = tweets
        return res.status(200).json({
            status: true,
            data: tweetsData
        })
    } catch (error) {

        console.log(" 🚀   -->  error:", error)
        next(error)
    }
}