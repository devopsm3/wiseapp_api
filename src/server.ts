import { User } from "@prisma/client"
import app from "./app"
import config from "./config/config"
import { initTelegram } from "./services/telegram/initTelegram"

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

app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`)
})