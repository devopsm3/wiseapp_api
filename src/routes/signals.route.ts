import { Router } from "express"
import { getSignals, openSignal } from "../modules/signals/signals.controller"

const SignalsRouter = Router()

SignalsRouter.get("/get-signals", getSignals)
// SignalsRouter.get("/get-signal/:id", getSignalById)
SignalsRouter.get("/open-signal/:id", openSignal)

export default SignalsRouter