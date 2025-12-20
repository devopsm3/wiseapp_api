import { User } from "@prisma/client"
import app from "./app"
import config from "./config/config"
import { initTelegram } from "./config/initTelegram"
import http from "http"
import { initSocket } from "./config/socket"
// import { scheduleSignalPivotUpdate } from "./jobs/updateSignalPivots.job"
// import { schedulePostValidation } from "./jobs/validatePosts.job"
import { scheduleStatsCalculation } from "./jobs/calculateStats.job"

declare global {
  interface BigInt {
    toJSON(): string;
  }
}
BigInt.prototype.toJSON = function () {
    return this.toString()
}

declare global {
  namespace Express {
    export interface Request {
      user?: undefined | User;
    }
  }
}

if (process.env.TELEGRAM_API_STATUS === "activated") {
    initTelegram()
}
const server = http.createServer(app)

initSocket(server)

// Start BullMQ jobs
// scheduleSignalPivotUpdate()
scheduleStatsCalculation()
// schedulePostValidation()

server.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`)
})
