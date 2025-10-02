import express from "express"
import { errorHandler } from "./middlewares/errorHandler"
import { Request, Response } from "express"
import helmet from "helmet"
import cors from "cors"
import morgan from "morgan"
import apiRouter from "./routes"
import cookieParser from "cookie-parser"
import path from "path"
import { allowList } from "./allowList"

const app = express()

app.use(morgan("dev"))
app.use(express.json())
app.use(cookieParser())

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(cors({
    origin: allowList,
    credentials: true
}))

// Public storage folder
// app.use("/storage", express.static(path.join(__dirname, "../storage")))
app.use(
    "/storage",
    cors({ origin: allowList }),
    express.static(path.join(__dirname, "../storage"))
)

app.get("/health", (req: Request, res: Response) => {
    res.status(200).send("healthy")
})

// Routes
app.use("/api/v1", apiRouter)

// Error handler middleware
app.use(errorHandler)

export default app