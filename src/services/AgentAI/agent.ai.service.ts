import config from "../../config/config"

export const agentAI_signal_analyzer = async (postText: string) => {
    try {
        const url = "https://openrouter.ai/api/v1/chat/completions"
        const headers = {
            Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
        }
        const payload = {
            model: "openai/chatgpt-4o-latest",
            // model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `
                    You are an AI analyzer that classifies crypto trading posts and extracts signals . 
                    - PreSignal (Protosignal):
                      A predictive post that indicates for a given token: "IF a certain condition is met in the future, THEN the token price will rise/fall."
                    - Signal (Direct Signal):
                      A predictive post that indicates for a given token: "The token price will rise/fall."
                    - Irrelevant:
                      Posts unrelated to trade ideas (memes, news, generic updates).
                    📌 Output format:
                    Return ONLY valid JSON with these keys:
                    {
                      "type": "Signal" | "PreSignal" | "Irrelevant",
                      "token": string | null,
                      "currency": string | null,
                      "direction": "bullish" | "bearish" | null,
                      "condition": string | null,
                      "entry_price": number | null,
                      "exit_price": number | null,
                      "target": number[] | null,
                      "stop_loss": number | null,
                      "unit": "dollar" | "percent" | null,
                      "leverage": number[] | null,
                      "timeframe": "Swing" | "Intraday" | "Scalping"
                    }
                    `
                },
                // {
                //     role: "system",
                //     content: `
                //     You are an AI analyzer that classifies crypto trading posts and extracts structured data.  
                //     You must detect whether a post is a **Signal**, a **Protosignal**, or **Irrelevant**,  
                //     and output ONLY valid JSON (no text outside JSON).
                    
                //     📌 Definitions:
                //     - Signal: A clear, unconditional trading idea or prediction.  
                //       Example: "BTC will go up to $70k", "ETH will go down".  
                //       → Must always include "direction".  
                    
                //     - Protosignal: A **conditional** prediction.  
                //       Example: "If BTC breaks $50k, then it will go up to $55k".  
                //       → Must always include "direction" and a "condition".  
                //       → Condition is what differentiates it from a Signal and should be a trading condition and meaningful.
                    
                //     - Irrelevant: Posts unrelated to trade ideas (memes, news, generic updates).
                    
                //     📌 Extraction rules:
                //     - token: The trading pair (e.g., "BTC/USDT") or single token (e.g., "BTC"). Null if missing.  
                //     - currency: The base/main token (e.g., "BTC" from "BTC/USDT"). Null if missing.  
                //     - direction: Always required for both Signal and Protosignal → "bullish" or "bearish".   
                //     - entry_price, exit_price: Extract numeric values if mentioned, else null.  
                //     - target: One or more numeric targets. If multiple → return array [t1, t2, ...]. Null if absent.  
                //     - stop_loss: Extract if explicitly mentioned. Null if absent.  
                //     - unit: "percent" or "dollar". Detect from context (e.g., "5%" → percent, "$200" → dollar).  
                //     - leverage: Extract numeric leverage values if mentioned (e.g., "10x", "25x" → [10, 25]). Null if absent.  
                //     - timeframe: Decide from context:  
                //       * "Scalping" = horizon < 5 min  
                //       * "Intraday" = horizon < 24h  
                //       * "Swing" = horizon 1–21 days  
                //       * Default "Swing" if no time is mentioned.
                    
                //     📌 Special rules:
                //     - If both unconditional and conditional parts exist in the same post → classify as Protosignal (condition dominates).  
                //     - Direction mappings:
                //       * LONG / BUY / RISE / UP = bullish  
                //       * SHORT / SELL / DROP / DOWN = bearish  
                    
                //     📌 Output format:
                //     Return ONLY valid JSON with these keys:
                //     {
                //       "type": "Signal" | "Protosignal" | "Irrelevant",
                //       "token": string | null,
                //       "currency": string | null,
                //       "direction": "bullish" | "bearish" | null,
                //       "condition": string | null,
                //       "entry_price": number | null,
                //       "exit_price": number | null,
                //       "target": number[] | null,
                //       "stop_loss": number | null,
                //       "unit": "dollar" | "percent" | null,
                //       "leverage": number[] | null,
                //       "timeframe": "Swing" | "Intraday" | "Scalping"
                //     }
                //     `
                // },
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
    } catch {
        return {
            type: "Irrelevant",
            token: null,
            currency: null,
            condition: null,
            direction: null,
            entry_price: null,
            exit_price: null,
            target: null,
            stop_loss: null,
            unit: null,
            leverage: null,
            timeframe: null
        }
    }
    // return data
}
