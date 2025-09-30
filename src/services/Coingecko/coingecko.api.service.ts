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
        return error
    }
}
