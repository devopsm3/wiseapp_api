

import { encodingForModel, TiktokenModel } from "js-tiktoken"

const encoder = encodingForModel(process.env.OPENROUTER_API_MODEL as TiktokenModel) // or "gpt-3.5-turbo", etc.

export const extractTradingInfo = (text: string): string => {
    let cleaned = text

    // Normalize whitespace
    cleaned = cleaned
        .replace(/\s+/g, " ")         // spaces/newlines into single space
        .replace(/https?:\/\/\S+/g, "") // remove URLs
    //     .replace(/[@#]\w+/g, "")       // remove @mentions and #hashtags
    // eslint-disable-next-line no-control-regex
        .replace(/[^\x00-\x7F]/g, "")  // remove non-ASCII (emojis, symbols)
        .trim()

    // Keep only useful info: tickers, numbers, buy/sell, target, stop loss
    // const matches = cleaned.match(
    //     /\b(Buy|Sell)\b.*?[\d.]+|\bTarget\d*=?\s*[\d.]+|\bStop\s*Loss=?\s*[\d.]+|[A-Z]{2,10}USDT|\b[A-Z]{2,10}\b/g
    // )

    // if (!matches) return ""

    // return matches.join(" ")
    return cleaned
}

export const countTokens = (text: string): { postText: string; tokens: number } => {
    const tx = extractTradingInfo(text)
    const tokens = encoder.encode(tx)
    return { postText: tx, tokens: tokens.length }
}

// If you want to check an array of posts:
// export const countTokensForPosts = (posts: string[]): { postText: string; tokens: number }[] => {
//     return posts.reduce((sum, post) => sum + countTokens(post).tokens, 0)
// }