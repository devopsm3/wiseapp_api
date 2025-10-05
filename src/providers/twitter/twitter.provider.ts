 
import { PlatformName } from "@prisma/client"
import { TweetV2, TwitterApi } from "twitter-api-v2"
import { getStartTimeISO_LocalMidnight } from "./twitter.helpers"
import { countTokens } from "../AgentAI/agentai.helpers"
import { agentAI_signal_analyzer } from "../AgentAI/agentai.provider"

const client = new TwitterApi(process.env.X_BAREAR_TOKEN!)
const readOnlyClient = client.readOnly

export async function getTwitterChannelInfo(username: string) {

    try {
        const fields = [
            "username",  "created_at", "description", "id", "profile_banner_url", "profile_image_url", "verified", "public_metrics",
            "location", "name", "verified_type", "url"
        ].join(",")


        const user = await readOnlyClient.v2.userByUsername(username, {
            "user.fields": fields
        })

        if (user.errors) {
            return {
                channelInfo: null,
                error: user?.errors?.[0]?.detail
            }
        }
        const userInfo = user.data

        if (!userInfo) {
            return {
                channelInfo: null,
                error: "User not found"
            }
        }
        // const userInfo = {
        //     "description": "This account is for sale",
        //     "profile_banner_url": "https://pbs.twimg.com/profile_banners/371027604/1625304362",
        //     "name": "Andrew Griffiths",
        //     "verified": false,
        //     "created_at": "2011-09-10T02:19:48.000Z",
        //     "profile_image_url": "https://pbs.twimg.com/profile_images/1411253688954494977/PQKpfmZx_normal.jpg",
        //     "public_metrics": {
        //         "followers_count": 26579,
        //         "following_count": 2457,
        //         "tweet_count": 155548,
        //         "listed_count": 11,
        //         "like_count": 121989,
        //         "media_count": 84037
        //     },
        //     "id": "371027604",
        //     "location": "Birmingham, England",
        //     "verified_type": "none",
        //     "username": "AndrewGriUK",
        //     "url": "https://twitter.com/AndrewGriUK"
        // }
        const userCreationDate = userInfo.created_at
            ? Math.floor(new Date(userInfo.created_at).getTime() / 1000)
            : 0

        const channelInfo = {
            platform_logo: PlatformName.X,
            platform_user_picture: userInfo.profile_image_url as string,
            user_name_source: userInfo.name as string,
            user_username_source: userInfo.username as string,
            user_id_source: userInfo.id as string,
            user_verified: userInfo.verified as boolean,
            followers_count: userInfo?.public_metrics?.followers_count as number,
            user_creation_date: userCreationDate,
            metadata: {
                description: userInfo.description as string,
                profile_banner_url: userInfo.profile_banner_url as string,
                location: userInfo.location as string,
                verified_type: userInfo.verified_type as string,
                url: userInfo?.url ? userInfo?.url : null,
                public_metrics: userInfo.public_metrics
            },
        }
        return {
            channelInfo,
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

export const getTwitterChannelPosts = async (userId: string) => {
    try {
        // const daysAgo = 0
        const daysAgo = Number(process.env.FETCH_DAYS_AGO) || 5
        const startTime = getStartTimeISO_LocalMidnight(daysAgo)
        const tweets = await readOnlyClient.v2.userTimeline(userId, {
            max_results: 10,
            "tweet.fields": ["created_at", "text", "id", "author_id"],
            "start_time": startTime
        })
        // const meta = tweets.data.meta
        const tweetsData: TweetV2[] = tweets.data.data
        const posts: any[] = []

        for (let index = 0; index < tweetsData.length; index++) {
            const message = tweetsData[index]

            const { postText, tokens } = countTokens(message.text)


            console.log(" -------------------------------------------------------------- ----------------------- ")
            console.log(" 🚀   -->  message.message:", message.text)
            console.log(" 🚀   -->  message.message:", postText, " 🚀   -->  tokens:", tokens)
            console.log(" ")
            console.log(" ")
            console.log(" ")
            if (tokens < 3) continue
            if (tokens > 90) continue
            posts.push({
                id: message.id,
                text: postText,
                originalText: message.text,
                timestamp: message?.created_at ? Math.floor(new Date(message?.created_at).getTime() / 1000) : null,
                date: message?.created_at,
                senderId: message?.author_id || null,
                mediaType: "text",
            })
        }

        const analyses = await Promise.all(
            posts.map(p => agentAI_signal_analyzer(p.text))
        )
        const analysedPosts = posts
            .map((post, i) => ({ ...post, analysis: analyses[i] }))
            .filter(p => p?.analysis?.type !== "Irrelevant")

        return analysedPosts

    } catch (error) {
        console.error("Error fetching tweets:", error)
        return []
    }
}