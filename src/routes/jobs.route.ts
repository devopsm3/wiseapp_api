import { Router } from "express"
import { triggerJob } from "../controllers/jobs.controller"

const jobsRouter = Router()

jobsRouter.post("/trigger", triggerJob)

export default jobsRouter
