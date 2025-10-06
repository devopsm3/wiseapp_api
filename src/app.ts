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

app.get("/", (req: Request, res: Response) => {
    res.send(`
        <html>
            <head><title>Server Status</title></head>
            <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                <h1>🚀 Server is running!</h1>
                <p>Visit <a href="/health">/health</a> to check API status.</p>
            </body>
        </html>
    `)
})

// Health route — returns JSON
app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "healthy",
    })
})
app.get("/favicon.ico", (req: Request, res: Response) => res.status(204).end())

// Routes
app.use("/api/v1", apiRouter)

// Error handler middleware
app.use(errorHandler)

export default app