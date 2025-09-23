import config from "../../config/config"

export const agentAI_Analyzer = async (postText: string) => {
    try{
        const url = "https://openrouter.ai/api/v1/chat/completions"
        const headers = {
            "Authorization": `Bearer ${config.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        }
        const payload = {
        // model: "gpt-4o-mini", // or another available model
            model: "openai/chatgpt-4o-latest",
            messages: [
                {
                    role: "system",
                    content: `You are an analyzer that classifies trading posts. 
                    Output ONLY JSON with these keys (token can be pair):
                    { 
                    "type": "Signal" | "PreSignal" | "Irrelevant",
                    "token": string | null,
                    "condition": string | null,
                    "direction": "bullish" | "bearish" | null,
                    "target": number | null,
                    "unit": string | null }
                `,
                },
                { role: "user", content: postText },
            ],
            temperature: 0,
        }

        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        })

        const data = await response.json()
        return JSON.parse(data.choices[0].message.content)
    } catch {
        return { type: "Irrelevant", token: null, condition: null, direction: null, target: null, unit: null }
    }
    // return data

}