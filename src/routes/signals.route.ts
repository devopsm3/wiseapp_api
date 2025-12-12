import { Router } from "express"
import { getSignals, getSignalById, getFearAndGreedHistory } from "../modules/signals/signals.controller"

const SignalsRouter = Router()

SignalsRouter.get("/get-signals", getSignals)
SignalsRouter.get("/get-signal/:id", getSignalById)
SignalsRouter.get("/get-fear-and-greed-history", getFearAndGreedHistory)

export default SignalsRouter