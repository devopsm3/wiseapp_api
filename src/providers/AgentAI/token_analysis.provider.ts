import config from "../../config/config"

export interface AiAnalysisInput {
    token: string
    price_at_start: number
    signal_trend: "bullish" | "bearish"
    historical_pivot_prices?: any[]
}

export const getAiAnalysis = async (input: AiAnalysisInput): Promise<string> => {

    const url = "https://openrouter.ai/api/v1/chat/completions"
    const headers = {
        Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
    }

    // const systemPrompt = `
    // You are an expert crypto technical analyst.
    // Analyze the provided token signal data.

    // Data provided:
    // - Token: ${input.token}
    // - Entry Price: ${input.price_at_start}
    // - Signal Trend: ${input.signal_trend}
    // - Historical Pivot Data: ${JSON.stringify(input.historical_pivot_prices)}

    // Your task:
    // Provide a concise but insightful technical analysis of this setup.
    // Consider the trend direction relative to the pivot points if available.
    // Explain why this might be a good or risky entry based on general market principles applied to this specific data point.

    // Output format:
    // A single paragraph of text as HTML. Do NOT use Markdown or JSON. Just div HTML element.
    // and make token name and price and the information you see is important bold
    // make it more readable and easy to understand u can use tailwind css classes
    // `

    const systemPrompt = `
    You are an expert crypto technical analyst. Your task is to provide a **comprehensive and detailed technical analysis** of the provided token signal data, focusing on market structure, momentum, and the implications of known future pivot levels.

    **Data Provided for Analysis:**
    - Token: ${input.token}
    - Entry Price: ${input.price_at_start}
    - Signal Trend: ${input.signal_trend}
    - Historical Pivot Data: ${JSON.stringify(input.historical_pivot_prices)}

    **CRITICAL CONTEXT on Pivot Data:**
    The 'Historical Pivot Data' is unique. It represents the **known daily pivot points (Support and Resistance levels) for the days *following* the signal creation (up to 21 days max).** This allows for a structural analysis of how the **Entry Price** is positioned relative to the dynamic support and resistance path over the expected signal holding period.

    **Your Analysis Requirements (Detailed Sections Required):**

    ### 1. Market Structure and Trend Validation
    * Analyze the current **Signal Trend** (${input.signal_trend}) and its implied momentum.
    * Validate the trend by assessing the overall trajectory of the future 21-day pivot path. Are the supports (S1/S2) generally rising (confirming a bullish structure) or falling (suggesting weakness)?

    ### 2. Future Pivot Path Interpretation
    * **Initial Entry Position:** Determine if the **Entry Price** is immediately consolidating above or below the first 3 days' key levels (Pivots, R1, S1).
    * **Key Future Obstacles/Targets:** Identify the most significant Resistance level (R2 or R3) within the 21-day dataset that represents a high-probability target for the trade.

    ### 3. Risk/Reward and Volatility Assessment
    * Use the immediate future pivot points (Day 1-3 S1/S2) to suggest a conservative **Stop Loss** level.
    * Use a higher-level resistance (R2/R3 further out) to suggest a **Take Profit** level.
    * Calculate and discuss the implied Risk/Reward ratio given the **21-day time horizon** and the known structural levels.

    ### 4. Final Strategy + Conclusion & Decision
    * Provide a concise **Final Strategy** (e.g., 'Aggressive entry, scale-in on pullback to S1').
    * Offer a clear **Conclusion** summarizing the technical advantages and disadvantages of this entry based on the known future pivot path.
    * State the definitive **Decision** (e.g., 'GO: High conviction', 'WAIT: Consolidate first', or 'AVOID: Poor structural integrity').

    **Output Format Strict Rules:**
    1.  The entire output **MUST be a single HTML <div> element**.
    2.  **DO NOT USE Markdown, JSON, or any formatting other than pure HTML and CSS (via Tailwind classes).**
    3.  Utilize **Tailwind CSS classes** to make the output highly readable, visually appealing, and well-structured with clear sections.
    4.  **Bold** the **Token Name**, **Entry Price**, **Signal Trend**, and all key numerical levels and final decisions.
`

    const messages = [
        {
            role: "system",
            content: systemPrompt
        }
    ]

    const payload = {
        model: process.env.OPENROUTER_API_MODEL || "openai/chatgpt-4o-latest",
        messages: messages,
        temperature: 0.7,
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        })
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) return ""

        return content.trim()

    } catch (error) {
        console.log("Error generating token analysis:", error)
        return ""
    }
}
