import config from "../../config/config"

export interface AiAnalysisInput {
    token: string
    price_at_start: number
    signal_trend: "bullish" | "bearish"
    historical_pivot_prices?: any[]
}

export const getAiAnalysis = async (input: AiAnalysisInput): Promise<{ status: boolean; data: string }> => {

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
    sections: 
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
    4.  **STRICT STYLE:** The main <div> container and major background elements must **NOT** use any background color (bg- classes).
    5.  **COLOR & READABILITY:** Use Tailwind CSS classes to **add color** to key textual elements for emphasis, hierarchy, and professional styling and white color with font-bold for sections titles.
    6.  **Bold** the **Token Name**, **Entry Price**, **Signal Trend**, and all key numerical levels and final decisions.

    make it more readable and easy to understand u can use tailwind css classes
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

        if (!content) return { status: false, data: "" }

        return { status: true, data: content.trim() }

    } catch (error) {
        console.log("Error generating token analysis:", error)
        return { status: false, data: "" }
    }
}


interface TokenInput {
    token: string;
    quoteLatest: any;
}
interface AnalysisResult {
    analytic: string; // The HTML div using Tailwind classes
    sources: { name: string; url: string }[]; // Array of source objects
}

export const generateTokenAnalysis = async (input: TokenInput): Promise<{ status: boolean; message: string; data: string | null }> => {

    const today = new Date()
    const todayString = today.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })

    const config = {
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "YOUR_OPENROUTER_KEY",
    }
    const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

    const systemPrompt = `
    You are a **Senior Crypto Research Analyst** providing institutional-grade, real-world analysis. Your task is to deliver a **maximally comprehensive, deep-dive analysis** of the roadmap and current price dynamics for the token: ${input.token}.   
    
    **Goal:** Produce a highly accurate, useful, and actionable report that connects the token's status to macro trends and development reality.
    
    **Research Directive (Crucial):**
    You **MUST** perform active web searches for current data and information.
    The analysis must be grounded in real-time facts gathered from the internet. When gathering information, ensure you check major data aggregators and relevant news sites.
    
    Specifically, use the following as research starting points:
    - https://coinmarketcap.com/currencies/${input.token.toLowerCase()}
    - https://www.coingecko.com/en/coins/${input.token.toLowerCase()}
    - https://crypto.com/en/price/${input.token.toLowerCase()}


    **Use the following Latest Coin Quotes :** ${JSON.stringify(input.quoteLatest)}
    
    **CRITICAL DATE CHECK:** You MUST verify and use market data as of **today, ${todayString}**. Any price or technical data must reflect the current market reality (can be found on coingecko, coinmarketcap, crypto.com).
    
    **User's Questions:**
    1. What is next on ${input.token}’s roadmap?
    2. Why is ${input.token} Price today like that?

    **Output Structure Strict Requirements:**
    The entire response MUST be a single, valid JSON object with two top-level keys: 'analytic' and 'at leat 10 sources'.
    
    {
        "analytic": "...", 
        "sources": [...]
    }

    ---

    ### 'analytic' Key Requirements (HTML Content)
    1.  The value of the 'analytic' key MUST be a single HTML <div> element containing the full analysis.
    2.  **STRICT STYLE:** The main <div> container and major background elements must **NOT** use any background color (bg- classes).
    3.  **COLOR & READABILITY:** Use Tailwind CSS classes to **add color** to key textual elements for emphasis, hierarchy, and professional styling (e.g., 'text-blue-600' for headings, 'text-green-500' for bullish points, 'text-red-500' for risks).
    4.  **BOLDING:** Use the <b> tag (or Tailwind class 'font-bold') precisely for the **Token Name**, **Current Price**, **24-hour change**, **Key Roadmap Milestones**, **Important Dates**, and **Macro Indicators**.
    5.  The analysis must be **LONG** and segmented into logical sections.
    6.  **DO NOT USE Markdown or JSON other than the outer structure and the sources array.**
    7.  Utilize **Tailwind CSS classes** to make the output highly readable, easy to understand, visually appealing, and well-structured with clear sections.
    8.  If you use grid or flex make sure to use gap-2, or make spaces between inline elements (flex/grid).
    9.  If you use list make sure to use list-disc or list-decimal.

    ### Analysis Content Directives (Detailed Sections Required):
    * ** Reply for What is next on ${input.token}’s roadmap? 
    * ** Reply for Why is ${input.token} Price today like that?

    ### 'sources' Key Requirements (JSON Array)
    1.  The value of the 'sources' key MUST be a JSON array of objects.
    2.  Each object MUST have two keys: 'name' and 'url'.
    3.  **You MUST provide at least four distinct, high-quality sources, including specific URLs found during your web research.**
    `

    const headers = {
        Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
    }

    const messages = [
        {
            role: "system",
            content: systemPrompt
        }
    ]

    const payload = {
        // model: "anthropic/claude-sonnet-4.5",
        // model: "openai/gpt-4o-search-preview/",
        model: "openai/gpt-4o:online",
        messages: messages,
        temperature: 0.6,
        response_format: { type: "json_object" }
    }

    try {

        console.log(`Sending analysis request for token: ${input.token}`)

        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        })
        // Check for non-OK HTTP status
        if (!response.ok) {
            const errorText = await response.text()
            return {
                status: false,
                message: `OpenRouter API call failed with status ${response.status}: ${errorText}`,
                data: null
            }
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) {
            return {
                status: false,
                message: "API response was successful, but no content was returned.",
                data: null
            }
        }

        // --- 2. JSON VALIDATION ---
        let parsedData: AnalysisResult

        try {
            // The API response content should be a JSON string
            parsedData = JSON.parse(content.trim().replace("```json", "").replace("```", ""))
        } catch (error) {

            console.log(" 🚀   -->  error:", error)
            console.error("Failed to parse AI response as JSON:", content)
            return {
                status: false,
                message: "AI response was not valid JSON as requested.",
                data: null
            }
        }

        // Validate the structure of the parsed data
        if (!parsedData.analytic || !parsedData.sources || !Array.isArray(parsedData.sources)) {
            return {
                status: false,
                message: "AI response JSON structure is invalid (missing 'analytic' or 'sources').",
                data: null
            }
        }

        // Final success: return the stringified JSON output
        return {
            status: true,
            message: "Token analysis generated successfully.",
            data: JSON.stringify(parsedData, null, 2)
        }

    } catch (error) {
        console.error("Error generating token analysis:", error)
        // Return a structured error message
        return {
            status: false,
            message: "Failed to generate analysis.",
            data: null
        }
    }
}
