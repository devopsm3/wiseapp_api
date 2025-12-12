import { PivotCalculationResult, CoinMarketCapOHLC, CoinInfoResponse, Post, LatestArticle } from "./coinmarketcap.types"

interface CachedCoinInfo {
    id: number;
    logo: string;
    name: string;
    symbol: string;
}

const coinInfoCache = new Map<string, CachedCoinInfo>()

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "a6986257-1eea-4411-a0ce-4670856da266"
const COINMARKETCAP_API_URL = process.env.COINMARKETCAP_API_URL || "https://pro-api.coinmarketcap.com"


export const getCoinMarketCapSymbolId = (symbol: string): number | null => {
    const normalizedSymbol = symbol.toUpperCase()

    if (coinInfoCache.has(normalizedSymbol)) {
        return coinInfoCache.get(normalizedSymbol)!.id
    }

    return null
}

export const getCoinInfo = async (symbol: string): Promise<{ id: number; logo: string; name: string; symbol: string } | null> => {
    const normalizedSymbol = symbol.toUpperCase()
    const a = false
    if (a) {
        coinInfoCache.set("ETH", {
            id: 1027,
            logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
            name: "Ethereum",
            symbol: "ETH"
        })
        return {
            id: 1027,
            logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
            name: "Ethereum",
            symbol: "ETH"
        }
    }
    if (coinInfoCache.has(normalizedSymbol)) {
        const cached = coinInfoCache.get(normalizedSymbol)!
        if (cached.logo) {
            return {
                id: cached.id,
                logo: cached.logo,
                name: cached.name,
                symbol: cached.symbol
            }
        }
    }

    const url = `${COINMARKETCAP_API_URL}/v2/cryptocurrency/info?symbol=${normalizedSymbol}`
    const options = {
        method: "GET",
        headers: {
            "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
            "Accept": "application/json"
        }
    }

    try {
        const response = await fetch(url, options)
        const data: CoinInfoResponse = await response.json()

        if (data.data && data.data[normalizedSymbol] && data.data[normalizedSymbol].length > 0) {
            const coinData = data.data[normalizedSymbol][0]
            // Cache the full coin info
            coinInfoCache.set(normalizedSymbol, {
                id: coinData.id,
                logo: coinData.logo,
                name: coinData.name,
                symbol: coinData.symbol
            })
            return {
                id: coinData.id,
                logo: coinData.logo,
                name: coinData.name,
                symbol: coinData.symbol
            }
        }

        console.warn(`No cryptocurrency info found for symbol: ${symbol}`)
        return null
    } catch (error) {
        console.error(`Error fetching cryptocurrency info for ${symbol}:`, error)
        return null
    }
}

export const getTokenPriceAtDate = async (symbol: string, targetDate: Date, retries: number = 3): Promise<number | null> => {
    // const coinId = symbol
    const coinId = getCoinMarketCapSymbolId(symbol)
    if (!coinId) {
        return null
    }

    const url = `${COINMARKETCAP_API_URL}/v3/cryptocurrency/quotes/historical`
    const params = new URLSearchParams({
        id: coinId.toString(),
        time_start: new Date(targetDate).toISOString(),
        interval: "5m",
        count: "1",
        convert: "USD"
    })

    console.log(" 🚀   -->  params price at date:", params)

    const options = {
        method: "GET",
        headers: {
            "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
            "Accept": "application/json"
        }
    }

    try {
        const response = await fetch(`${url}?${params}`, options)
        const data: any = await response.json()
        if (data.data && data.data[coinId.toString()]
            && data.data[coinId.toString()].quotes
            && data.data[coinId.toString()].quotes.length > 0) {
            const price = data.data[coinId.toString()].quotes[0].quote.USD.price
            return price
        }

        console.warn(`No price data found for ${symbol} on ${targetDate.toISOString()}`)
        if (retries > 0) {
            console.log(`Retrying for ${symbol} 10 minutes earlier. Retries left: ${retries - 1}`)
            const newTargetDate = new Date(targetDate.getTime() - 10 * 60 * 1000) // Subtract 10 minutes
            return getTokenPriceAtDate(symbol, newTargetDate, retries - 1)
        }
        return null
    } catch (error) {
        console.error(`Error fetching price for ${symbol} at ${targetDate}:`, error)
        return null
    }
}

export const getOHLCVData = async (
    coinId: number,
    startDate: Date,
    endDate: Date
): Promise<any[] | null> => {
    const timeStart = new Date(startDate)
    timeStart.setUTCHours(0, 0, 0, 0)

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    if (timeStart.getTime() === today.getTime()) {
        console.warn(`Skipping OHLCV data fetch for today (${timeStart.toISOString()}) as it's not yet available.`)
        return null
    }

    const timeEnd = new Date(endDate)
    timeEnd.setUTCHours(23, 59, 59, 999)

    const url = `${COINMARKETCAP_API_URL}/v2/cryptocurrency/ohlcv/historical`
    const params = new URLSearchParams({
        id: coinId.toString(),
        time_start: timeStart.toISOString(),
        time_end: timeEnd.toISOString(),
        interval: "daily",
        convert: "USD"
    })

    console.log(" 🚀   -->  params OHLCV:", params)

    const options = {
        method: "GET",
        headers: {
            "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
            "Accept": "application/json"
        }
    }

    try {
        const response = await fetch(`${url}?${params}`, options)
        const data: any = await response.json()

        if (!data.data || !data.data.quotes || data.data.quotes.length === 0) {
            console.warn(`No OHLC data found from ${startDate.toISOString()} to ${endDate.toISOString()}`)
            return null
        }

        return data.data.quotes
    } catch (error) {
        console.error("Error fetching OHLCV data:", error)
        return null
    }
}

/**
 * Calculate pivot values for the next 21 days from the start date
 * Returns the maximum and minimum pivot values and validates signal success
 * 
 * Logic:
 * 1. Get the price at the post creation date (startDate)
 * 2. Fetch OHLC data for the next 21 days from startDate
 * 3. Calculate pivot for each day: pivot = (high + low + close) / 3
 * 4. Track both maximum and minimum pivot values
 * 5. Validate signal success:
 *    - LONG (LONG): Success if max pivot > entry price
 *    - SHORT (SHORT): Success if min pivot < entry price
 * 6. Determine if signal is complete (21 days have passed)
 */
export const calculateMaxPivotFrom21Days = async (
    symbol: string,
    startDate: Date,
    direction: "LONG" | "SHORT"
): Promise<PivotCalculationResult | null> => {

    const coinId = getCoinMarketCapSymbolId(symbol)
    if (!coinId) {
        console.warn(`Could not find CoinMarketCap ID for ${symbol}`)
        return null
    }

    // const priceAtStart = 200
    const priceAtStart = await getTokenPriceAtDate(symbol, startDate)

    console.log(" 🚀   -->  priceAtStart:", priceAtStart)
    if (!priceAtStart) {
        console.warn(`Could not fetch price for ${symbol} at ${startDate.toISOString()}`)
        return null
    }

    const endDate = new Date(startDate)
    endDate.setUTCDate(endDate.getUTCDate() + 21)

    const quotes = await getOHLCVData(coinId, startDate, endDate)

    if (!quotes || quotes.length === 0) {
        console.warn(`No OHLC data found for ${symbol} from ${startDate.toISOString()}`)
        return {
            priceAtStart,
            validDays: 0,
            isComplete: false,
            theoreticalProfitAbsolute: 0,
            theoreticalProfitPercent: 0,
            bestPrice: 0,
            meta: {
                signalSuccess: false,
                maxPivot: 0,
                maxPivotDate: null,
                minPivot: 0,
                minPivotDate: null,
                pivotData: []
            }
        }
    }

    const pivotData: CoinMarketCapOHLC[] = []
    let maxPivot = priceAtStart
    let maxPivotDate: Date | null = null
    let minPivot = priceAtStart
    let minPivotDate: Date | null = null

    for (const quote of quotes) {
        const quoteDate = new Date(quote.time_open)

        const usdQuote = quote.quote.USD
        const pivot = (usdQuote.high + usdQuote.low + usdQuote.close) / 3
        const pivotDataElement = {
            time: quoteDate,
            open: usdQuote.open,
            high: usdQuote.high,
            low: usdQuote.low,
            close: usdQuote.close,
            pivot: pivot
        }
        pivotData.push(pivotDataElement)

        if (pivot > maxPivot) {
            maxPivot = pivot
            maxPivotDate = quoteDate
        }

        if (pivot < minPivot) {
            minPivot = pivot
            minPivotDate = quoteDate
        }
    }

    const now = new Date()
    const daysSinceSignal = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const isComplete = daysSinceSignal >= 21


    let theoreticalProfitAbsolute = 0
    let theoreticalProfitPercent = 0

    let bestPrice = 0

    if (direction === "LONG") {
        // For LONG: Check if price actually went UP
        if (maxPivot > priceAtStart) {
            // Signal was CORRECT - price went up, show profit
            theoreticalProfitAbsolute = maxPivot - priceAtStart
            theoreticalProfitPercent = ((maxPivot - priceAtStart) / priceAtStart) * 100
            bestPrice = maxPivot
        } else {
            // Signal was WRONG - price went down, show loss using minPivot
            theoreticalProfitAbsolute = minPivot - priceAtStart  // Will be negative
            theoreticalProfitPercent = ((minPivot - priceAtStart) / priceAtStart) * 100
            bestPrice = minPivot
        }
    } else {
        // For SHORT: Check if price actually went DOWN
        if (minPivot < priceAtStart) {
            // Signal was CORRECT - price went down, show profit
            theoreticalProfitAbsolute = priceAtStart - minPivot
            theoreticalProfitPercent = ((priceAtStart - minPivot) / priceAtStart) * 100
            bestPrice = minPivot
        } else {
            // Signal was WRONG - price went up, show loss using maxPivot
            theoreticalProfitAbsolute = -(maxPivot - priceAtStart)  // Negative to show loss
            theoreticalProfitPercent = -((maxPivot - priceAtStart) / priceAtStart) * 100
            bestPrice = maxPivot
        }
    }

    let signalSuccess: boolean | null = null

    if (isComplete) {
        if (direction === "LONG") {
            signalSuccess = maxPivot > priceAtStart
        } else {
            signalSuccess = minPivot < priceAtStart
        }
    }

    const successEmoji = signalSuccess === true ? "✅" : signalSuccess === false ? "❌" : "⏳"
    const profitEmoji = theoreticalProfitPercent > 0 ? "📈" : "📉"
    console.log(`📊 ${successEmoji} ${symbol} (${direction}): ${pivotData.length} days
        Entry: $${priceAtStart.toFixed(2)}
        Max: $${maxPivot.toFixed(2)} | Min: $${minPivot.toFixed(2)}
        Best Price: $${bestPrice.toFixed(2)}
        ${profitEmoji} Theoretical Profit: $${theoreticalProfitAbsolute.toFixed(2)} (${theoreticalProfitPercent > 0 ? "+" : ""}${theoreticalProfitPercent.toFixed(2)}%)
        Success: ${signalSuccess === null ? "PENDING" : signalSuccess}`)
    console.log(" ")
    console.log(" ")
    console.log(" ")
    return {
        priceAtStart,
        validDays: pivotData.length,
        isComplete,
        theoreticalProfitAbsolute,
        theoreticalProfitPercent,
        bestPrice,
        meta: {
            signalSuccess,
            maxPivot,
            maxPivotDate,
            minPivot,
            minPivotDate,
            pivotData
        }
    }
}


// CoinMarketCap Content
export const getCoinMarketCapTopPosts = async (coinId: number) => {
    try {

        const url = `${COINMARKETCAP_API_URL}/v1/content/posts/top?id=${String(coinId)}`

        const options = {
            method: "GET",
            headers: {
                "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
                "Accept": "application/json"
            }
        }

        const response = await fetch(`${url}`, options)
        const data: { data: { list: Post[] } } = await response.json()

        if (!data.data || !data.data.list || data.data.list.length === 0) {
            console.warn(`No top posts data found for ${coinId}`)
            return null
        }

        return data.data.list
    } catch (error) {
        console.log(error)
        return null
    }
}

export const getCoinMarketCapLatestPosts = async (coinId: number) => {
    try {

        const url = `${COINMARKETCAP_API_URL}/v1/content/posts/latest?id=${String(coinId)}`

        const options = {
            method: "GET",
            headers: {
                "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
                "Accept": "application/json"
            }
        }

        const response = await fetch(`${url}`, options)
        const data: { data: { list: Post[] } } = await response.json()

        if (!data.data || !data.data.list || data.data.list.length === 0) {
            console.warn(`No latest posts data found for ${coinId}`)
            return null
        }

        return data.data.list
    } catch (error) {
        console.log(error)
        return null
    }
}

export const getCoinMarketCapLatestArticles = async (coinId: number) => {
    try {

        const url = `${COINMARKETCAP_API_URL}/v1/content/latest?id=${String(coinId)}`

        console.log(" 🚀   -->  url:", url)


        const options = {
            method: "GET",
            headers: {
                "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
                "Accept": "application/json"
            }
        }

        const response = await fetch(`${url}`, options)
        const data: { data: LatestArticle[] } = await response.json()

        if (!data.data || !data.data || data.data.length === 0) {
            console.warn(`No latest articles data found for ${coinId}`)
            return null
        }

        return data.data
    } catch (error) {
        console.log(error)
        return null
    }
}

//v3/fear-and-greed/latest

export const getCoinMarketCapFearAndGreed = async () => {
    try {
        const url = `${COINMARKETCAP_API_URL}/v3/fear-and-greed/latest`

        const options = {
            method: "GET",
            headers: {
                "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
                "Accept": "application/json"
            }
        }

        const response = await fetch(`${url}`, options)
        const data = await response.json()

        if (!data.data) {
            console.warn("No fear and greed data found")
            return null
        }

        return data.data
    } catch (error) {
        console.log(error)
        return null
    }
}
    