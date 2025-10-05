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

export async function getTwitterChannelInfo(username: string) {

    try {
        console.log(" 🚀   -->  username:", username)
       

        // const channelInfo = {
        //     platform_logo: PlatformName.TELEGRAM,
        //     platform_user_picture: `storage/telegram/sources/${channelName}/channelPic.jpg`,
        //     user_name_source: (channel as Api.Channel).title,
        //     user_username_source: (channel as Api.Channel).username || "",
        //     user_id_source: (channel as Api.Channel).id.toString(),
        //     user_verified: (channel as Api.Channel).verified || false,
        //     followers_count: (channel as Api.Channel).participantsCount || 0,
        //     user_creation_date: creationDate,
        //     metadata: {
        //         title: (channel as Api.Channel).title,
        //         username: (channel as Api.Channel).username || "",
        //         broadcast: (channel as Api.Channel).broadcast || false,
        //         megagroup: (channel as Api.Channel).megagroup || false,
        //     },
        // }
        await new Promise(resolve => setTimeout(resolve, 1000))
        return {
            channelInfo: null,
            error: null
        }
    } catch (err: any) {
        console.log(" 🚀   -->  err:", err)
        return {
            channelInfo: null,
            error: err.message
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getTwitterChannelPosts(channelName: string, lastSavedId: number = 0) {
    

    const posts: any[] = []

    const analyses: any[] = [
        {
            type: "Signal",
            token: "BTC",
            currency: "USDT",
            direction: "bullish",
            entry_price: 12.74,
            exit_price: null,
            target: [ 12.82, 13.01, 13.2 ],
            stop_loss: 12.49,
            leverage: null
        },
        {
            type: "Signal",
            token: "ICX",
            currency: "USDT",
            direction: "bullish",
            entry_price: 0.119,
            exit_price: null,
            target: [ 0.1198, 0.1215, 0.1233 ],
            stop_loss: 0.1167,
            leverage: null
        }
    ]
       
    const analysedPosts = posts
        .map((post, i) => ({ ...post, analysis: analyses[i] }))
        .filter(p => p?.analysis?.type !== "Irrelevant")
    return analysedPosts
}