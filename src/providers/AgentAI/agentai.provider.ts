import config from "../../config/config"

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
            content: `
                    You are an expert Crypto Trading Signal Analyst/Parser. Return ONLY valid JSON.
                    Your goal: Identify from the post text/images if it is a valid signal that refers to a crypto trading and if so,
                    extract the TOKEN, the DIRECTION, and the STOP LOSS value. and make sure it is a valid signal.
                    
                    TASK:
                    - Extract Token Symbol (e.g. BTC, ETH, SOL, etc.) and Currency (e.g. USDT).
                    - Determine Direction: "LONG" (Buy/bullish/or any meaning of buy) or "SHORT" (Sell/bearish/or any meaning of sell).
                    - Extract Stop Loss (SL) as a number. Ignore percentages.
                    
                    CONSTRAINTS:
                    - If no Token or no Direction is found, return type: "Irrelevant".
                    - Ignore Entry prices.
                    - Ignore any mention of Leverage.

                    
                    JSON SCHEMA:
                    {
                    "type": "Signal" | "Irrelevant",
                    "token": "string",
                    "currency": "string", 
                    "direction": "LONG" | "SHORT",
                    "stop_loss": number | null
                    }
                    `,
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
        // return JSON.parse(data.choices[0].message.content)
        // return data.choices[0].message.content
        const raw = data.choices?.[0]?.message?.content
        const clean = raw
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim()

        const reply = JSON.parse(clean)

        if (reply.type === "Signal") {
            // If AI found 'BTC' but missed 'USDT', default to USDT
            if (reply.token && !reply.currency) {
                reply.currency = "USDT"
            }
            // Ensure token is Uppercase
            if (reply.token) reply.token = reply.token.toUpperCase()
            if (reply.currency) reply.currency = reply.currency.toUpperCase()
        }

        return reply
    } catch (error: any) {
        console.log(" 🚀   -->  error:", error)
        return {
            type: "Irrelevant",
            token: null,
            currency: null,
            // condition: null,
            // direction: null,
            entry_price: null,
            exit_price: null,
            target: null,
            // stop_loss: null,
            // unit: null,
            // leverage: null,
            // timeframe: null
        }
    }
}
