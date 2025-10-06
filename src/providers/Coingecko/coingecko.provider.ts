import { OHLC } from "../signals/signals.types"

export const coingeckoApiServiceMarket = async (coinSymbol: string) => {

    //     try {

    //         const url = `${process.env.COINGECKO_API_URL}/simple/price?vs_currencies=usd&x_cg_demo_api_key=${process.env.COINGECKO_API_KEY}`
    //         // const url = `${process.env.COINGECKO_API_URL}/simple/supported_vs_currencies?x_cg_demo_api_key=${process.env.COINGECKO_API_KEY}`
    //         // const url = `${process.env.COINGECKO_API_URL}/coins/markets?vs_currency=usd&x_cg_demo_api_key=${process.env.COINGECKO_API_KEY}`
    //         const response = await fetch(url, {
    //             method: "GET",
    //         });

    //         const data = await response.json();
    //         return data;
    //     } catch {
    //         return null
    //     }

    // const url = 'https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&symbols=btc&include_tokens=top';
    // const url = 'https://api.coingecko.com/api/v3/asset_platforms';
    // const url2 = `${process.env.COINGECKO_API_URL}/coins/markets?vs_currency=usd&symbols=${coinSymbol}&include_tokens=top&price_change_percentage=1h,24h,7d,14d,30d,60d,200d,1y`;
    // const url3 = 'https://api.coingecko.com/api/v3/simple/token_price/ethereum?vs_currencies=usd';
    // const url4 = 'https://api.coingecko.com/api/v3/coins/ethereum';

    const url = `${process.env.COINGECKO_API_URL}/coins/markets?vs_currency=usd&symbols=${coinSymbol}&include_tokens=top&price_change_percentage=1h,24h,7d,14d,30d,60d,200d,1y`
    const options = {
        method: "GET",
        headers: { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY as string }
    }

    try {
        const response = await fetch(url, options)
        const data: any = await response.json()
        return data
    } catch (error) {
        console.error(error)
        return []
    }
}

export const getOHLC = async (coinId: string, targetDate: Date): Promise<OHLC | null> => {

    const now = new Date()
    const targetTime = targetDate.getTime()
    const diffInDays = Math.max(
        0,
        Math.ceil((now.getTime() - targetTime) / (1000 * 60 * 60 * 24))
    )
    const availableDays = [1, 7, 14, 30, 90, 180, 365]
    let days = availableDays.find(d => diffInDays <= d) || 365
    
    const url = `${process.env.COINGECKO_API_URL}/coins/${coinId.toLowerCase()}/ohlc?days=${days}&vs_currency=usd&precision=18`
    const options = {
        method: "GET",
        headers: { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY as string },
    }
    const tolerance =
        days <= 2 ? 60 * 60 * 1000 :
            days <= 30 ? 4 * 60 * 60 * 1000 : 
                2 * 24 * 60 * 60 * 1000  

    try {
        const response = await fetch(url, options)
        const data = await response.json()
        if (!Array.isArray(data) || data.length === 0) {
            console.warn(`No OHLC data returned for ${coinId}`)
            return null
        }
        let entry: any
        if (days === 1) {            
            entry = data.reduce((prev: any, curr: any) => {
                return Math.abs(curr[0] - targetTime) < Math.abs(prev[0] - targetTime)
                    ? curr
                    : prev
            }, data[0])
            
        } else {
            entry = data.find(([time]: any) =>
                Math.abs(time - targetTime) < tolerance
            )    
        }

        return entry
            ? {
                time: new Date(entry[0]),
                open: entry[1],
                high: entry[2],
                low: entry[3],
                close: entry[4],
            }
            : null
    } catch (error) {
        console.error(error)
        return null
    }
}
