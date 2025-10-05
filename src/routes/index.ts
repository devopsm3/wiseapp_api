import { Router } from "express"

import AuthRouter from "./auth.route"
import SourceRouter from "./sources.route"
import UsersRouter from "./users.route"
import { authMiddleware } from "../middlewares/authValidation"
import SignalsRouter from "./signals.route"
import SetupsRouter from "./setups.route"

const apiRouter = Router()
// const prefix = '/api/v1';   

apiRouter.use("/auth", AuthRouter)

apiRouter.use("/users", authMiddleware, UsersRouter)
apiRouter.use("/sources", authMiddleware, SourceRouter)
apiRouter.use("/signals", authMiddleware, SignalsRouter)
apiRouter.use("/setups", authMiddleware, SetupsRouter)

export default apiRouter