import { Router } from "express"

import AuthRouter from "./auth.route"
import SourceRouter from "./sources.route"
import UsersRouter from "./users.route"
import { authMiddleware } from "../middlewares/authValidation"
import SignalsRouter from "./signals.route"
import SetupsRouter from "./setups.route"
import TestRouter from "./test.route"

const apiRouter = Router()

apiRouter.use("/auth", AuthRouter)

apiRouter.use("/users", authMiddleware, UsersRouter)
apiRouter.use("/sources", authMiddleware, SourceRouter)
// apiRouter.use("/signals", SignalsRouter)
apiRouter.use("/signals", authMiddleware, SignalsRouter)
apiRouter.use("/setups", authMiddleware, SetupsRouter)
apiRouter.use("/test", TestRouter)

export default apiRouter