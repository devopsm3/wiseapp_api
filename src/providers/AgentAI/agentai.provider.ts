import config from "../../config/config"

const SYSTEM_PROMPT = `
You are an elite Crypto Trading Signal Classifier and Parser. Your role is to act as an intelligent filter for a professional trading signal aggregation system.

═══════════════════════════════════════════════════════
PRIMARY OBJECTIVE
═══════════════════════════════════════════════════════
Distinguish ACTIONABLE TRADING SIGNALS from all other content types (news, analysis, questions, general discussion, price commentary, memes, etc.).

═══════════════════════════════════════════════════════
WHAT IS A VALID TRADING SIGNAL?
═══════════════════════════════════════════════════════
A signal MUST contain ALL of the following:
1. A specific cryptocurrency token (BTC, ETH, SOL, etc.)
2. A clear directional trading intent (LONG/buy or SHORT/sell)
3. Actionable language indicating a trading recommendation or entry point

═══════════════════════════════════════════════════════
CRITICAL CLASSIFICATION RULES
═══════════════════════════════════════════════════════
1. ⚠ News or announcements, even if bullish → Irrelevant
2. ⚠ Personal trading updates ("I bought BTC") without explicit recommendation → Irrelevant
3. ⚠ Questions or polls → Irrelevant
4. ⚠ Price observations ("BTC is pumping!") without entry recommendation → Irrelevant
5. ⚠ General market commentary → Irrelevant

═══════════════════════════════════════════════════════
OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════════════════════════════
Return valid JSON. 
For a single post analysis:
{
  "type": "Signal",
  "token": "BTC",
  "direction": "LONG"
}
(or "type": "Irrelevant", "token": null, "direction": null)

For batch analysis, return an array of objects, each containing the "id" provided and the analysis:
[
  {
    "id": "123",
    "type": "Signal",
    "token": "BTC",
    "direction": "LONG"
  },
  ...
]
`

/**
 * Individual analyzer for a single post (supports images)
 */
export const agentAI_signal_analyzer = async (
    postText: string,
    images: string[] = []
) => {
    const url = "https://openrouter.ai/api/v1/chat/completions"
    const headers = {
        Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
    }

    const messages: any[] = [
        {
            role: "system",
            content: SYSTEM_PROMPT,
        },
        {
            role: "user",
            content: [
                {
                    type: "text",
                    text: "Analyze the following trading signal and respond ONLY with JSON.",
                },
            ],
        },
    ]

    if (postText?.trim()) {
        messages[1].content.push({
            type: "text",
            text: postText,
        })
    }
    if (images.length) {
        images.forEach((el: string) =>
            messages[1].content.push({
                type: "image_url",
                image_url: el,
            })
        )
    }

    const payload = {
        model: process.env.OPENROUTER_API_MODEL || "openai/chatgpt-4o-latest",
        messages: messages,
        temperature: 0,
        user: "user_wise_app",
        response_format: { type: "json_object" }
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        })
        const data = await response.json()
        const raw = data.choices?.[0]?.message?.content
        
        if (!raw || (raw && raw.trim() === "")) {
            return { type: "Irrelevant", token: null, currency: null, direction: null }
        }

        const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim()
        const reply = JSON.parse(clean)

        if (reply.type === "Signal") {
            reply.currency = "USDT"
            if (reply.token) reply.token = reply.token.toUpperCase()
        }

        return reply
    } catch (error: any) {
        console.log(" 🚀   -->  error:", error)
        return { type: "Irrelevant", token: null, currency: null, direction: null }
    }
}

/**
 * Batch analyzer for multiple posts (text-only)
 */
export const agentAI_batch_analyzer = async (
    posts: { id: string | number, text: string }[]
) => {

    console.log(" 🚀   -->  posts.length:", posts.length)
    if (!posts.length) return []

    const url = "https://openrouter.ai/api/v1/chat/completions"
    const headers = {
        Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
    }

    const batchText = posts.map(p => `ID: ${p.id}\nText: ${p.text}`).join("\n\n---\n\n")

    const messages: any[] = [
        {
            role: "system",
            content: SYSTEM_PROMPT + "\nYou are processing a batch of posts. Return a JSON array of objects, one for each ID provided.",
        },
        {
            role: "user",
            content: `Analyze these posts and return a JSON array of results:\n\n${batchText}`,
        },
    ]

    const payload = {
        model: process.env.OPENROUTER_API_MODEL || "openai/chatgpt-4o-latest",
        messages: messages,
        temperature: 0,
        user: "user_wise_app",
        response_format: { type: "json_object" }
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        })
        const data = await response.json()
        const raw = data.choices?.[0]?.message?.content

        if (!raw || (raw && raw.trim() === "")) {
            return posts.map(p => ({ id: p.id, type: "Irrelevant", token: null, direction: null }))
        }

        const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim()
        const parsed = JSON.parse(clean)
        // Handle cases where model returns { results: [...] } or just [...]
        const results = Array.isArray(parsed) ? parsed : (parsed.results || [])

        return posts.map(p => {
            const found = results.find((r: any) => String(r.id) === String(p.id))
            if (found) {
                if (found.type === "Signal") {
                    found.currency = "USDT"
                    if (found.token) found.token = found.token.toUpperCase()
                }
                return found
            }
            return { id: p.id, type: "Irrelevant", token: null, direction: null }
        })

    } catch (error: any) {
        console.log(" 🚀   --> batch error:", error)
        return posts.map(p => ({ id: p.id, type: "Irrelevant", token: null, direction: null }))
    }
}
