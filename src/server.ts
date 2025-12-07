import { User } from "@prisma/client"
import app from "./app"
import config from "./config/config"
import { initTelegram } from "./config/initTelegram"
import http from "http"
import { initSocket } from "./config/socket"
import { scheduleSignalPivotUpdate } from "./jobs/updateSignalPivots.job"

declare global {
    interface BigInt {
        toJSON(): Number;
    }
}
BigInt.prototype.toJSON = function () { return Number(this) }

declare global {
  namespace Express {
    export interface Request {
      user?: undefined | User;
    }
  }
}

if (process.env.TELEGRAM_API_STATUS === "activted") {
    initTelegram()
}
const server = http.createServer(app)

initSocket(server)

// Start BullMQ jobs
scheduleSignalPivotUpdate()

server.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`)
})