const input: any = require("input")
import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"
import config from "../config/config"

const stringSession = new StringSession(config.TELEGRAM_API_SESSION)

export const client = new TelegramClient(stringSession, Number(config.TELEGRAM_API_ID!), config.TELEGRAM_API_HASH_CODE!, {
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
        // await client.sendMessage("me", { message: "Hello! 2" });

        console.log("✅ Telegram connected!")
    // console.log("Session string:", client.session.save()); // Save this!
    }
}
