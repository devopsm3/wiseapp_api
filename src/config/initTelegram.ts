const input: any = require("input")
import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"
import config from "./config"
import fs from "fs"


const sessionFile = "tel_api.session"

let sessionString = ""
if (fs.existsSync(sessionFile)) {
    sessionString = fs.readFileSync(sessionFile, "utf-8")
}

const session = new StringSession(sessionString)

export const client = new TelegramClient(session, Number(config.TELEGRAM_API_ID!), config.TELEGRAM_API_HASH_CODE!, {
    connectionRetries: 5,
})

export async function initTelegram() {
    if (!client.connected) {
        console.log("Connecting to Telegram...")
        await client.start({
            phoneNumber: async () => await input.text("📱 Enter phone number: "),
            password: async () => await input.text("🔑 Enter 2FA password: "),
            phoneCode: async () => await input.text("📨 Enter the code you received: "),
            onError: (err) => console.error(err),
        })
        console.log("✅ Telegram connected")
        const sessionString = client.session.save()
        fs.writeFileSync(sessionFile, String(sessionString), "utf-8")
    }
}
