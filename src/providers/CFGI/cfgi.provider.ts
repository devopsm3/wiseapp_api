import { prisma } from "../../prisma"
import { isOlderThan15Min } from "../../utils/global.helpers"
import { CfgiIndex } from "./cfgi.types"

const CFGI_API_URL = process.env.CFGI_API_URL || "https://cfgi.io/api/api_request_v2.php"
const CFGI_API_KEY = process.env.CFGI_API_KEY

const ALLOWED_TOKENS = ["BTC", "ETH", "SOL"] as const

export const getTokenFeat_Greed = async (
    coinLabel: string
): Promise<CfgiIndex | null> => {

    // ❌ Reject unsupported tokens
    if (!ALLOWED_TOKENS.includes(coinLabel as any)) {
        return null
    }

    try {
    // 1️⃣ Check DB first
        const cached = await prisma.cfgiQuote.findUnique({
            where: { token: coinLabel }
        })

        if (cached) {
            return cached.payload as unknown as CfgiIndex
        }

        // 2️⃣ Fetch from CFGI API
        const url = `${CFGI_API_URL}?api_key=${CFGI_API_KEY}&token=${coinLabel}&period=1&values=1`

        const response = await fetch(url, {
            headers: { Accept: "application/json" }
        })

        if (!response.ok) {
            return null
        }

        const data: CfgiIndex[] = await response.json()

        // ❌ Empty array
        if (!Array.isArray(data) || data.length === 0) {
            return null
        }

        const latest = data[0] as any

        // 3️⃣ Save / update cache
        await prisma.cfgiQuote.upsert({
            where: { token: coinLabel },
            update: {
                payload: latest 
            },
            create: {
                token: coinLabel,
                payload: latest
            }
        })

        return latest

    } catch (error) {
        console.error("CFGI fetch error:", error)
        return null
    }
}
