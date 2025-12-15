import config from "../../config/config"

export const generateSourceRecommendations = async (sourceStats: any) => {

    // console.log(" 🚀   -->  sourceStats:", sourceStats)
    // return []
    const url = "https://openrouter.ai/api/v1/chat/completions"
    const headers = {
        Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
    }

    const systemPrompt = `
    You are an expert crypto trading analyst. Your job is to analyze the performance statistics of a crypto signal provider (source) and generate at least 3 specific recommendations for a user who is following this source.
    Add success rate of each token in the reasoning and u can find the information in the stats.pieChatTokensData.win_rate for each token. 
    The recommendations should be in JSON format and follow this structure:
    [
      {
        "id": "1",
        "type": "buy" | "hold" | "sell" | "avoid",
        "priority": "high" | "medium" | "low",
        "title": "Short title",
        "description": "Brief description",
        "confidence": 85,
        "reasoning": "Detailed reasoning based on the stats provided."
      }
    ]

    Analyze the provided stats (profitability, signal counts, win rates, etc.) to give meaningful advice.
    For example:
    - If accuracy on BTC is high but low on ALTS, recommend following BTC signals only.
    - If overall profitability is negative recently, recommend avoiding or waiting.
    - If win rate is high, recommend increasing position size (cautiously).

    Return ONLY the valid JSON array.
    `

    const messages = [
        {
            role: "system",
            content: systemPrompt
        },
        {
            role: "user",
            content: `Here are the stats for the source: ${JSON.stringify(sourceStats)}`
        }
    ]

    const payload = {
        model: process.env.OPENROUTER_API_MODEL || "openai/chatgpt-4o-latest",
        messages: messages,
        temperature: 0.7,
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

        console.log(" 🚀   -->  AI Recommendation raw:", raw)

        const clean = raw
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim()

        const recommendations = JSON.parse(clean)

        // Ensure it's an array and has the required fields ? 
        // For now, trust the AI but maybe wrap in a 'recommendations' key if the AI returns an object with a key.
        // The prompt asks for an array.

        if (Array.isArray(recommendations)) {
            return recommendations.map((rec: any, index: number) => ({ ...rec, id: (index + 1).toString() }))
        } else if (recommendations.recommendations && Array.isArray(recommendations.recommendations)) {
            return recommendations.recommendations.map((rec: any, index: number) => ({ ...rec, id: (index + 1).toString() }))
        }

        return []

    } catch (error) {
        console.log("Error generating recommendations:", error)
        return []
    }
}
