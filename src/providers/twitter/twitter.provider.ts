import { PlatformName } from "@prisma/client"
import { TwitterApi } from "twitter-api-v2"
import { getStartTimeISO_LocalMidnight } from "./twitter.helpers"
import { agentAI_signal_analyzer } from "../AgentAI/agentai.provider"
import fs from "fs"
import path from "path"

const client = new TwitterApi(process.env.X_BAREAR_TOKEN!)
const readOnlyClient = client.readOnly

export async function getTwitterChannelInfo(username: string) {
    try {
        const fields = [
            "username",
            "created_at",
            "description",
            "id",
            "profile_banner_url",
            "profile_image_url",
            "verified",
            "public_metrics",
            "location",
            "name",
            "verified_type",
            "url",
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
        const userCreationDate = userInfo.created_at
            ? Math.floor(new Date(userInfo.created_at).getTime() / 1000)
            : 0

        const channelInfo = {
            platform: PlatformName.X,
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
        return {
            channelInfo: null,
            error: err.message
        }
    }
}

export const getTwitterChannelPosts = async (userId: string, lastSavedId: string = "") => {
    try {

        const daysAgo = Number(process.env.FETCH_DAYS_AGO) || 5
        const startTime = getStartTimeISO_LocalMidnight(daysAgo)
        
        const options: any = {
            max_results: 5,
            "tweet.fields": ["created_at", "text", "id", "author_id", "attachments", "referenced_tweets"],
            expansions: ["attachments.media_keys", "referenced_tweets.id.author_id"],
            "media.fields": ["url", "preview_image_url", "type"],
        }

        if (lastSavedId) {
            options.since_id = lastSavedId
        } else {
            options.start_time = startTime
        }

        const tweets = await readOnlyClient.v2.userTimeline(userId, options)
        // save tweets in json file called tweets.json
        // Ensure folder exists
        const outputDir = path.join(process.cwd(), "data")
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }

        const filePath = path.join(outputDir, `tweets-${userId}.json`)

        fs.writeFileSync(
            filePath,
            JSON.stringify(tweets.data, null, 2),
            "utf-8"
        )
        const tweetsData = tweets.data.data || []
        const tweetsMedia = tweets.data?.includes?.media || []
        const tweetsMeta = tweets.data.meta || []
        // const includesTweets = tweets.data?.includes?.tweets || []
        const mediaMap = new Map((tweetsMedia || []).map((m) => [m.media_key, m]))
        const posts: any[] = []

        for (let index = 0; index < tweetsData.length; index++) {
            const message = tweetsData[index]

            // Skip retweets (reposts) to avoid duplicate signals
            // Keep "quoted" tweets as they might contain new signal context
            // if (message.referenced_tweets?.some((ref: any) => ref.type === "retweeted")) {
            //     continue
            // }

            // const retweetRef = message.referen   ced_tweets?.find(ref => ref.type === "retweeted")

            // if (retweetRef) {
            //     // 2. Find the original tweet in the "includes" data to see its author
            //     const originalTweet = includesTweets.find(t => t.id === retweetRef.id)
        
            //     if (originalTweet?.author_id === message.author_id) {
            //         console.log(`Tweet ${message.id} is a SELF-RETWEET (Reposted own post)`)
            //     } else {
            //         console.log(`Tweet ${message.id} is a REPOST of someone else`)
            //     }
            // } else {
            //     console.log(`Tweet ${message.id} is an ORIGINAL post`)
            // }

            const mediaKeys = message?.attachments?.media_keys || []
            // const { postText, tokens } = countTokens(message.text)

            // if (tokens < 2 || mediaKeys.length === 0) continue
            // if (tokens > 100) continue

            const media = mediaKeys.map((key) => mediaMap.get(key)).filter(Boolean)
            posts.push({
                id: message.id,
                text: message.text,
                originalText: message.text,
                timestamp: message?.created_at
                    ? Math.floor(new Date(message?.created_at).getTime() / 1000)
                    : null,
                date: message?.created_at,
                senderId: message?.author_id || null,
                mediaType: media.length ? "photo" : "text",
                mediaPhotos: media.length
                    ? media.filter((m) => m?.type === "photo").map((m) => m?.url)
                    : [],
            })
        }

        const analyses = await Promise.all(
            posts.map((p) => agentAI_signal_analyzer(p.text, p.mediaPhotos))
        )

        const analysedPosts = posts.map((post, i) => ({ ...post, analysis: analyses[i] }))
        const analysedPostsFiltered = analysedPosts.filter(
            (p) => p?.analysis?.type === "Signal" && p?.analysis?.token
        )
        return {
            analysedPostsFiltered,
            lastSavedId: tweetsMeta.newest_id ? String(tweetsMeta.newest_id) : ""
        }
    } catch (error) {
        console.error("Error fetching tweets:", error)
        return {
            analysedPostsFiltered: [],
            lastSavedId: ""
        }
    }
}

// Check if a Twitter post (tweet) still exists
export async function checkTwitterPostExists(tweetId: string): Promise<{
    exists: boolean
    error?: string
}> {
    try {
        const tweet = await readOnlyClient.v2.singleTweet(tweetId, {
            "tweet.fields": ["id"]
        })

        if (tweet.errors && tweet.errors.length > 0) {
            const error = tweet.errors[0]
            // Tweet not found or deleted
            if (error.title === "Not Found Error" || error.type === "https://api.twitter.com/2/problems/resource-not-found") {
                return { exists: false }
            }
            // Other errors (rate limit, auth, etc.)
            return { exists: true, error: error.detail || error.title }
        }

        // Tweet exists if we got data back
        return { exists: !!tweet.data }
    } catch (err: any) {
        // Network or other errors - assume exists to avoid false positives
        console.error(`Error checking tweet ${tweetId}:`, err.message)
        return { exists: true, error: err.message }
    }
}
