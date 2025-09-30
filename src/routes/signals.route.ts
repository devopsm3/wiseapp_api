import { Router } from "express"
import { getSignalById, getSignals, test } from "../modules/signals/signals.controller"

const SignalsRouter = Router()

SignalsRouter.get("/get-signals", getSignals)
SignalsRouter.get("/get-signal/:id", getSignalById)
SignalsRouter.get("/test", test)

export default SignalsRouter