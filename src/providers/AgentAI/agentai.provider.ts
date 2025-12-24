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
                ✅ EXAMPLES OF VALID SIGNALS
                ═══════════════════════════════════════════════════════
                • "BTC LONG - Entry: 42k, Target: 45k, SL: 40k"
                • "Going SHORT on ETH here, stop loss at 2300"
                • "SOL buy signal activated 🚀 Entry zone: $95-$98"
                • "SIGNAL: LONG #AVAX at 35.50"
                • "Opening long position on BTC, entry 43,000"
                • "SHORT SETUP: Sell BTC if it breaks below 41k"
                • "BUY $MATIC now, targets: 0.85, 0.90, 0.95"
                • [Image showing a chart with "BUY ZONE" annotation and entry arrow]
                • [Image with text overlay "LONG ETH Entry: 2250"]

                ═══════════════════════════════════════════════════════
                ❌ EXAMPLES OF NON-SIGNALS (MUST REJECT)
                ═══════════════════════════════════════════════════════
                News & Announcements:
                • "Bitcoin breaking news: SEC approves ETF"
                • "Ethereum upgrade scheduled for next week"
                • "Breaking: Coinbase lists new tokens"

                Predictions Without Action:
                • "I think BTC will hit 100k by end of year"
                • "ETH to $5000 soon 🚀"
                • "SOL looks like it could pump"

                Analysis Without Entry:
                • "ETH looking bullish on the daily chart"
                • "BTC formed a golden cross"
                • "Strong support at 40k for Bitcoin"

                Personal Updates (Not Recommendations):
                • "Just sold my ETH bags, feeling good"
                • "Bought some BTC during the dip"
                • "I'm bullish on crypto long term"

                Questions & Polls:
                • "What do you think about SOL?"
                • "Should I buy BTC now or wait?"
                • "Who's buying this dip?"

                Price Observations:
                • "BTC price is pumping!"
                • "ETH down 5% today"
                • "SOL hit $100!"

                General Sentiment:
                • "Bullish on crypto!"
                • "Bear market is here"
                • "Altseason incoming"

                Educational Content:
                • "How to trade crypto: always use stop losses"
                • "Top 10 altcoins to watch in 2024"

                Memes Without Signals:
                • "BTC go brrr 🚀"
                • "Wen moon ser?"
                • [Image: Just a price chart with no entry markers]

                ═══════════════════════════════════════════════════════
                DIRECTIONAL INDICATORS
                ═══════════════════════════════════════════════════════

                🟢 LONG (Bullish/Buy) - Indicators:

                Explicit Action Words:
                • BUY, LONG, ENTER LONG, OPEN LONG, GO LONG
                • BUY NOW, BUY ZONE, BUY SIGNAL, BUY SETUP
                • LONG POSITION, LONG ENTRY, LONG SIGNAL

                Entry/Accumulation:
                • ACCUMULATE, ADD POSITION, ENTRY, ENTER
                • BID, LOAD UP, STACK, SCOOP

                Bullish Sentiment (ONLY if paired with actionable context):
                • BULLISH SIGNAL, MOON SIGNAL, PUMP SIGNAL
                • TO THE MOON (with entry point)
                • 🚀 ROCKET (with entry point)

                Technical Setups:
                • BREAKOUT LONG, SUPPORT BOUNCE ENTRY
                • REVERSAL UP SIGNAL, GOLDEN CROSS LONG
                • BULLISH PATTERN CONFIRMED

                🔴 SHORT (Bearish/Sell) - Indicators:

                Explicit Action Words:
                • SELL, SHORT, ENTER SHORT, OPEN SHORT, GO SHORT
                • SELL NOW, SELL ZONE, SELL SIGNAL, SELL SETUP
                • SHORT POSITION, SHORT ENTRY, SHORT SIGNAL

                Exit/Profit Taking:
                • EXIT, CLOSE LONG, TAKE PROFIT, DUMP
                • SELL OFF, LIQUIDATE, REDUCE POSITION

                Bearish Sentiment (ONLY if paired with actionable context):
                • BEARISH SIGNAL, CRASH SIGNAL, DUMP SIGNAL
                • PLUMMET WARNING (with entry point)

                Technical Setups:
                • BREAKDOWN SHORT, RESISTANCE REJECTION ENTRY
                • REVERSAL DOWN SIGNAL, DEATH CROSS SHORT
                • BEARISH PATTERN CONFIRMED

                ═══════════════════════════════════════════════════════
                CRITICAL CLASSIFICATION RULES
                ═══════════════════════════════════════════════════════
                1. ⚠ News or announcements, even if bullish → Irrelevant
                2. ⚠ Personal trading updates ("I bought BTC") without explicit recommendation → Irrelevant
                3. ⚠ Questions or polls → Irrelevant
                4. ⚠ Price observations ("BTC is pumping!") without entry recommendation → Irrelevant
                5. ⚠ General market commentary → Irrelevant
                6. ✅ Direction must be CLEARLY stated OR strongly implied with specific entry language

                ═══════════════════════════════════════════════════════
                TOKEN EXTRACTION RULES
                ═══════════════════════════════════════════════════════
                • Support ticker symbols: BTC, ETH, SOL, AVAX, MATIC, etc.
                • Support full names: Bitcoin → BTC, Ethereum → ETH
                • Handle various formats: #BTC, $BTC, BTC/USDT, BTCUSDT → extract as "BTC"
                • Always return token in UPPERCASE
                • If multiple tokens mentioned, extract the PRIMARY one referenced in the signal

                ═══════════════════════════════════════════════════════
                IMAGE ANALYSIS (if images provided)
                ═══════════════════════════════════════════════════════
                Look for:
                ✅ Charts with entry/exit markers, arrows, or price zones
                ✅ Text overlays with "BUY", "SELL", "LONG", "SHORT"
                ✅ Support/resistance zones marked for specific entries
                ✅ Annotated entry points with target levels

                Reject:
                ❌ Plain price charts without actionable markers
                ❌ News screenshots
                ❌ Memes without trading setups
                ❌ Educational diagrams

                ═══════════════════════════════════════════════════════
                OUTPUT FORMAT (STRICT JSON)
                ═══════════════════════════════════════════════════════
                Return ONLY valid JSON with this exact schema:

                {
                "type": "Signal" | "Irrelevant",
                "token": "BTC" | "ETH" | null,
                "direction": "LONG" | "SHORT" | null
                }

                Rules:
                • If type = "Signal": token, and direction MUST be populated
                • If type = "Irrelevant": set token, direction to null
                • Token must be uppercase ticker (e.g., "BTC", not "Bitcoin" or "btc")
                • Direction must be exactly "LONG" or "SHORT"

                ═══════════════════════════════════════════════════════
                RESPONSE EXAMPLES
                ═══════════════════════════════════════════════════════

                Input: "BTC LONG signal - Entry: 43,000, Target: 45,000"
                Output: {"type": "Signal", "token": "BTC", "direction": "LONG"}

                Input: "SHORT ETH at 2300, tight stop"
                Output: {"type": "Signal", "token": "ETH", "direction": "SHORT"}

                Input: "Bitcoin breaking news: ETF approved!"
                Output: {"type": "Irrelevant", "token": null, "direction": null}

                Input: "I think BTC will moon soon 🚀"
                Output: {"type": "Irrelevant", "token": null, "direction": null}

                Input: "ETH looking bullish on the 4H chart"
                Output: {"type": "Irrelevant", "token": null, "direction": null}

                ═══════════════════════════════════════════════════════
                Remember: You are a precision filter. When in doubt, classify as "Irrelevant". Only return "Signal" when you are confident there is a clear, actionable trading recommendation with direction and token.
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
        const raw = data.choices?.[0]?.message?.content
        
        if (!raw || (raw && raw.trim() === "")) {
            return {
                type: "Irrelevant",
                token: null,
                currency: null,
                direction: null,
            }
        }
        const clean = raw
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim()

        const reply = JSON.parse(clean)

        if (reply.type === "Signal") {
            reply.currency = "USDT"
            if (reply.token) reply.token = reply.token.toUpperCase()
        }

        return reply
    } catch (error: any) {
        console.log(" 🚀   -->  error:", error)
        return {
            type: "Irrelevant",
            token: null,
            currency: null,
            direction: null,
        }
    }
}
