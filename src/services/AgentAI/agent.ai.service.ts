import config from "../../config/config"

export const agentAI_signal_analyzer = async (postText: string) => {
    try {
        const url = "https://openrouter.ai/api/v1/chat/completions"
        const headers = {
            Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
        }
        const payload = {
            model: process.env.OPENROUTER_API_MODEL || "openai/chatgpt-4o-latest",
            // model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `
                    You are an AI analyzer that classifies crypto trading posts/signals . 
                    - Irrelevant:
                      Posts unrelated to trade ideas (memes, news, generic updates).
                    Return ONLY valid JSON with these keys:
                    {
                      "type": "Signal" | "Irrelevant",
                      "token": string | null,
                      "currency": string | null,
                      "direction": "bullish" | "bearish" | null,
                      "entry_price": number | null,
                      "exit_price": number | null,
                      "target": number[] | null,
                      "stop_loss": number | null,
                      "leverage": number[] | null,
                    }
                    `
                },
                { role: "user", content: postText },
            ],
            temperature: 0,
            user: "user_wise_app",
        }

        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        })

        const data = await response.json()
        return JSON.parse(data.choices[0].message.content)
    } catch(error: any) {
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
            stop_loss: null,
            // unit: null,
            leverage: null,
            // timeframe: null
        }
    }
    // return data
}
