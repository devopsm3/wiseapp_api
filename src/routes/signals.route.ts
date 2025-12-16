import { Router } from "express"
import { getSignals, getSignalPostsArticles, getFearAndGreedHistory, getSignalAiPriceTraceAnalysis, getSignalAiTokenAnalysis, getFearAndGreed } from "../modules/signals/signals.controller"

const SignalsRouter = Router()

SignalsRouter.get("/get-signals", getSignals)
// SignalsRouter.get("/get-signal/:id", getSignalById)
SignalsRouter.get("/get-signal/:id/posts-articles", getSignalPostsArticles)
SignalsRouter.get("/get-signal/:id/ai-price-trace-analysis", getSignalAiPriceTraceAnalysis)
SignalsRouter.get("/get-signal/:id/ai-token-analysis", getSignalAiTokenAnalysis)
SignalsRouter.get("/get-fear-and-greed-index", getFearAndGreed)
SignalsRouter.get("/get-fear-and-greed-history", getFearAndGreedHistory)

export default SignalsRouter