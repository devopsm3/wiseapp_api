import { TwitterApi } from "twitter-api-v2"

const client = new TwitterApi(process.env.X_BAREAR_TOKEN!)

// const client = new TwitterApi({
//     appKey: "DldttdqvNBaIyyrdgjEnztwd4",
//     appSecret: "U0lnk1tMXD0VkNvTlGH3H8fCd5dhCeD3gdniybRgofC4IBPEqZ",
//     accessToken: "1724832837906677760-4vv2OtJSzWRDc7sQE57lb6UE6QoSzY",
//     accessSecret: "StFRKlLLHPjzvybL8HxJKeOzhR79xr2zY7Z71ii7oCeEX",
// });
// const user = await client.v2.userTimeline('1724832837906677760', {max_results: 10});
export const getUserTweets = async (username: string) => {
    try {
        const user = await client.v2.userByUsername(username)
        const userId = user.data.id

        const tweets = await client.v2.userTimeline(userId, {
            max_results: 5,
            "tweet.fields": ["created_at", "text"],
        })

        return tweets.data
    } catch (error) {
        console.error("Error fetching tweets:", error)
        return null
    }
}