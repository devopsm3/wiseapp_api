import config from "../../config/config"

export const agentAI_signal_analyzer = async (postText: string, images: string[] = []) => {
    const url = "https://openrouter.ai/api/v1/chat/completions"
    const headers = {
        Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
    }

    const messages: any[] = [
        {
            role: "system",
            content: `
            You are an AI that extracts and converts crypto trading signals (from text or image) and ignore Liquidations, updates, or news or any other text that has relation with trading signals.
          
            Return ONLY valid, parsable JSON — no extra text, no markdown, no explanations, no labels.
          
            JSON format:
            {
              "type": "Signal" | "Irrelevant",
              "token": string | null,
              "currency": string | null,
              "direction": "bullish" | "bearish" | null,
              "entry_price": number | null,
              "exit_price": number | null,
              "target": number[] | null,
              "stop_loss": number | null,
              "leverage": number[] | null
            }
            `
        },
        {
            role: "user",
            content: [
                {
                    type: "text",
                    text: "Analyze the following trading signal and respond ONLY with JSON."
                }
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
        images.forEach((el: string) => (
            messages[1].content.push({
                type: "image_url",
                image_url: el
            })
        ))
    }

    const payload = {
        model: process.env.OPENROUTER_API_MODEL || "openai/chatgpt-4o-latest",
        messages: messages,
        temperature: 0,
        user: "user_wise_app",
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
        if (!raw) {
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
        const clean = raw
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim()

        const reply = JSON.parse(clean)
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
            stop_loss: null,
            // unit: null,
            leverage: null,
            // timeframe: null
        }
    }
}