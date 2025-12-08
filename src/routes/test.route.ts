import { Router } from "express"
import { test } from "../modules/signals/signals.controller"

const TestRouter = Router()

TestRouter.get("/test", test)

export default TestRouter