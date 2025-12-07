import { PlatformName } from "@prisma/client"
import { TwitterApi } from "twitter-api-v2"
import { getStartTimeISO_LocalMidnight } from "./twitter.helpers"
import { agentAI_signal_analyzer } from "../AgentAI/agentai.provider"

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
        return {
            channelInfo: null,
            error: err.message
        }
    }
}

export const getTwitterChannelPosts = async (userId: string) => {
    try {
        // const daysAgo = Number(process.env.FETCH_DAYS_AGO) || 5
        // const startTime = getStartTimeISO_LocalMidnight(daysAgo)
        // const tweets = await readOnlyClient.v2.userTimeline(userId, {
        //     max_results: 100,
        //     "tweet.fields": ["created_at", "text", "id", "author_id", "attachments"],
        //     start_time: startTime,
        //     expansions: ["attachments.media_keys"],
        //     "media.fields": ["url", "preview_image_url", "type"],
        // })
        // const tweetsData = tweets.data.data || []
        // const tweetsMedia  = tweets.data?.includes?.media || []
        const tweetsData = [
            {
                "author_id": "371027604",
                "edit_history_tweet_ids": [
                    "1974728009732284646"
                ],
                "id": "1974728009732284646",
                "text": "SIGNAL #ETH #ETHUSDT :\n\n▶ Buy now At or Under 13.56\n\n✅Target1= 13.65\n\n✅Target2= 13.85\n\n✅Target3= 14.05\n\n⛔ Stop Loss= 13.3\n\n⚠ Incredible signal\n\nBuy the dip with brain, not #FOMO 🚀\n\n#SPOT #BTC #比特币\n\nTake part of our wonderful group now, PM ME! https://t.co/yK6Ov9jQ3G",
                "created_at": "2025-10-05T06:47:00.000Z"
            },
            // {
            //     "author_id": "371027604",
            //     "edit_history_tweet_ids": [
            //         "1974697773057642743"
            //     ],
            //     "attachments": {
            //         "media_keys": [
            //             "3_1974697752710799360",
            //             "3_1974697752719204352"
            //         ]
            //     },
            //     "id": "1974697773057642743",
            //     "text": "🔥 SIGNAL #RAY #RAYUSDT :\n\n➡ Buy At or Below 2.9\n\n✔Target1= 2.919\n\n✔Target2= 2.961\n\n✔Target3= 3.005\n\n❌ Stop Loss= 2.845\n\n✌ To the moooooon!\n\nHistoric!\n\n#SPOT #Cryptocurrency #HODL\n\nBe part of our VIP SIGNALS channel NOW, PM ME! https://t.co/fVUJW5VwQZ",
            //     "created_at": "2025-10-05T04:46:51.000Z"
            // },
            // {
            //     "author_id": "371027604",
            //     "edit_history_tweet_ids": [
            //         "1974688629135151137"
            //     ],
            //     "attachments": {
            //         "media_keys": [
            //             "3_1974688608364720128",
            //             "3_1974688608339578880"
            //         ]
            //     },
            //     "id": "1974688629135151137",
            //     "text": "❤ SIGNAL  #ALICE\n\n➡ Buy At or Below 0.3195\n\n☻Target1= 0.3216\n\n☻Target2= 0.3263\n\n☻Target3= 0.331\n\n❌ Stop Loss= 0.3134\n\n♫ Easy money!\n\nIt continues to surge higher! 🚀\n\n#SPOT #btc #btcusd #crypto\n\nTo Join more than 2400 happy members with us, PM ME! https://t.co/6uWxd3Wuby",
            //     "created_at": "2025-10-05T04:10:31.000Z"
            // },
            // {
            //     "author_id": "371027604",
            //     "edit_history_tweet_ids": [
            //         "1974670601098039738"
            //     ],
            //     "attachments": {
            //         "media_keys": [
            //             "3_1974670580453457920",
            //             "3_1974670580499480576"
            //         ]
            //     },
            //     "id": "1974670601098039738",
            //     "text": "SIGNAL #STX #STXUSDT :\n\n▶ Buy now At or Under 0.595\n\n✅Target1= 0.599\n\n✅Target2= 0.608\n\n✅Target3= 0.617\n\n⛔ Stop Loss= 0.584\n\n⚠ Quick signal\n\nSeem so solid, no whales inflow. new #ath is coming?\n\n#SPOT #bitcoin #crypto\n\nGet your VIP SIGNALS channel membership, PM ME! https://t.co/lzlXEnT5DJ",
            //     "created_at": "2025-10-05T02:58:53.000Z"
            // },
            // {
            //     "author_id": "371027604",
            //     "edit_history_tweet_ids": [
            //         "1974664160161267892"
            //     ],
            //     "attachments": {
            //         "media_keys": [
            //             "3_1974664139919273984",
            //             "3_1974664139927678976"
            //         ]
            //     },
            //     "id": "1974664160161267892",
            //     "text": "SIGNAL #CELR #CELRUSDT :\n\n▶ Buy At or Under 0.00766\n\n✅Target1= 0.00771\n\n✅Target2= 0.00782\n\n✅Target3= 0.00794\n\n⛔ Stop Loss= 0.00751\n\n⚠ Let's go!\n\nYessir!!! Let's get that new #ATH !!\n\n#SPOT #PremiumSignals #Crypto\n\nTake part of our wonderful family now, PM ME! https://t.co/eQoouEj4mM",
            //     "created_at": "2025-10-05T02:33:17.000Z"
            // }
        ]
        // const tweetsMedia = [
        //     {
        //         "width": 358,
        //         "media_key": "3_1974727989481869312",
        //         "type": "photo",
        //         "height": 718,
        //         "url": "https://pbs.twimg.com/media/G2ekpNUWkAAc43T.png"
        //     },
        //     {
        //         "width": 1550,
        //         "media_key": "3_1974727989477658624",
        //         "type": "photo",
        //         "height": 180,
        //         "url": "https://pbs.twimg.com/media/G2ekpNTWUAAxgaX.jpg"
        //     },
        //     {
        //         "width": 358,
        //         "media_key": "3_1974697752710799360",
        //         "type": "photo",
        //         "height": 718,
        //         "url": "https://pbs.twimg.com/media/G2eJJMkW4AAeeoI.png"
        //     },
        //     {
        //         "width": 1550,
        //         "media_key": "3_1974697752719204352",
        //         "type": "photo",
        //         "height": 180,
        //         "url": "https://pbs.twimg.com/media/G2eJJMmXIAAh5s1.jpg"
        //     },
        //     {
        //         "width": 358,
        //         "media_key": "3_1974688608364720128",
        //         "type": "photo",
        //         "height": 718,
        //         "url": "https://pbs.twimg.com/media/G2eA07OW8AATnue.png"
        //     },
        //     {
        //         "width": 1550,
        //         "media_key": "3_1974688608339578880",
        //         "type": "photo",
        //         "height": 180,
        //         "url": "https://pbs.twimg.com/media/G2eA07IXUAA2DSV.jpg"
        //     },
        //     {
        //         "width": 358,
        //         "media_key": "3_1974670580453457920",
        //         "type": "photo",
        //         "height": 718,
        //         "url": "https://pbs.twimg.com/media/G2dwbkBXwAA8Rvr.png"
        //     },
        //     {
        //         "width": 1550,
        //         "media_key": "3_1974670580499480576",
        //         "type": "photo",
        //         "height": 180,
        //         "url": "https://pbs.twimg.com/media/G2dwbkMWAAAIjlu.jpg"
        //     },
        //     {
        //         "width": 358,
        //         "media_key": "3_1974664139919273984",
        //         "type": "photo",
        //         "height": 718,
        //         "url": "https://pbs.twimg.com/media/G2dqkrKXMAAPziX.png"
        //     },
        //     {
        //         "width": 1550,
        //         "media_key": "3_1974664139927678976",
        //         "type": "photo",
        //         "height": 180,
        //         "url": "https://pbs.twimg.com/media/G2dqkrMXcAA_rPI.jpg"
        //     }
        // ]
        // const mediaMap = new Map((tweetsMedia || []).map((m) => [m.media_key, m]))
        const posts: any[] = []

        for (let index = 0; index < tweetsData.length; index++) {
            const message = tweetsData[index]
            // const mediaKeys = message?.attachments?.media_keys || []
            // const { postText, tokens } = countTokens(message.text)

            // if (tokens < 2 || mediaKeys.length === 0) continue
            // if (tokens > 100) continue

            // const media = mediaKeys.map((key) => mediaMap.get(key)).filter(Boolean)
            posts.push({
                id: message.id,
                text: message.text,
                originalText: message.text,
                timestamp: message?.created_at
                    ? Math.floor(new Date(message?.created_at).getTime() / 1000)
                    : null,
                date: message?.created_at,
                senderId: message?.author_id || null,
                mediaType: "text",
                // mediaType: media.length ? "photo" : "text",
                // mediaPhotos: media.length
                //     ? media.filter((m) => m?.type === "photo").map((m) => m?.url)
                //     : [],
            })
        }

        const analyses = await Promise.all(
            posts.map((p) => agentAI_signal_analyzer(p.text, p.mediaPhotos))
        )

        const analysedPosts = posts.map((post, i) => ({ ...post, analysis: analyses[i] }))
        const analysedPostsFiltered = analysedPosts.filter(
            (p) => p?.analysis?.type === "Signal" && p?.analysis?.token
        )
        return analysedPostsFiltered
    } catch (error) {
        console.error("Error fetching tweets:", error)
        return []
    }
}
