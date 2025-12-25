import path from "path"
import fs from "fs"
import { client } from "../../config/initTelegram"
import { Api } from "telegram"
import { PlatformName } from "@prisma/client"
// import { getDaysAgoTimestamp } from "../../utils/global.helpers"
import { agentAI_signal_analyzer } from "../AgentAI/agentai.provider"



export async function getTelegramChannelInfo(channelName: string) {
    try {

        const channel = await client.getEntity(channelName)
        let creationDate: number = 0

        const fullChannel = await client.invoke(
            new Api.channels.GetFullChannel({
                channel: channel,
            })
        )

        // 3. Access the participants count
        let participantsCount = 0
        if (fullChannel.fullChat instanceof Api.ChannelFull) {
            participantsCount = fullChannel.fullChat.participantsCount || 0
        } else if (fullChannel.fullChat instanceof Api.ChatFull) {
            participantsCount = (fullChannel.fullChat as any).participantsCount || 0
        }

        for await (const message of client.iterMessages(channel, { reverse: true, limit: 1 })) {
            creationDate = message.date
        }

        const user_username_source = (channel as Api.Channel).username || ""
        const channelInfo = {
            platform: PlatformName.TELEGRAM,
            platform_user_picture: `storage/telegram/sources/${user_username_source}/channelPic.png`,
            user_name_source: (channel as Api.Channel).title,
            user_username_source: user_username_source,
            user_id_source: (channel as Api.Channel).id.toString(),
            user_verified: (channel as Api.Channel).verified || false,
            followers_count: participantsCount,
            user_creation_date: creationDate,
            metadata: {
                title: (channel as Api.Channel).title,
                username: (channel as Api.Channel).username || "",
                broadcast: (channel as Api.Channel).broadcast || false,
                megagroup: (channel as Api.Channel).megagroup || false,
            },
        }


        const storageDir = path.join(__dirname, `../../../storage/telegram/sources/${user_username_source}`)
        fs.mkdirSync(storageDir, { recursive: true })

        const channelPhoto = await client.downloadMedia(fullChannel.fullChat.chatPhoto as any)
        fs.writeFileSync(path.join(storageDir, "channelPic.png"), Buffer.from(channelPhoto as any))

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


export async function getTelegramChannelPosts(channelName: string, lastSavedId: number = 0) {

    try {


        const posts: any[] = []
        // const daysAgo = Number(process.env.FETCH_DAYS_AGO) || 5
        // const offsetDate = getDaysAgoTimestamp(daysAgo)
        // for await (const message of client.iterMessages(channelName, { offsetDate, reverse: true, limit: 30 })) {
        if (lastSavedId) {
            for await (const message of client.iterMessages(channelName, { minId: lastSavedId })) {
                if (!(message instanceof Api.Message)) continue
                if (!message.message) continue
                // // handle photo if present
                // if (message.photo) {
                //     const storageDir = path.join(__dirname, `../../../storage/telegram/sources/${channelName}`)
                //     fs.mkdirSync(storageDir, { recursive: true })

                //     const fileName = `telegram_msg_${message.id}_file_${message.photo.id}.jpg`
                //     const filePath = path.join(storageDir, fileName)
                //     if (!fs.existsSync(filePath)) {
                //         const buffer = await client.downloadMedia(message.photo as any)
                //         fs.mkdirSync(storageDir, { recursive: true })
                //         fs.writeFileSync(filePath, Buffer.from(buffer as any))
                //         console.log("✅ Saved new media:", fileName)
                //     }
                // }
                posts.push({
                    id: message.id,
                    text: message.message,
                    originalText: message.message,
                    timestamp: message.date,
                    date: new Date(message.date * 1000),
                    senderId: message.senderId?.toString() || null,
                    mediaType: message.photo ? "photo" : "text",
                })
            }
        } else {
            for await (const message of client.iterMessages(channelName, { limit: 5 })) {
                if (!(message instanceof Api.Message)) continue
                if (!message.message) continue
                posts.push({
                    id: message.id,
                    text: message.message,
                    originalText: message.message,
                    timestamp: message.date,
                    date: new Date(message.date * 1000),
                    senderId: message.senderId?.toString() || null,
                    mediaType: message.photo ? "photo" : "text",
                })
            }
        }
        const analyses = await Promise.all(
            posts.map(p => agentAI_signal_analyzer(p.text))
        )
        const analysedPosts = posts
            .map((post, i) => ({ ...post, analysis: analyses[i] }))
        const analysedPostsFiltered = analysedPosts.filter(p => p?.analysis?.type === "Signal" && p?.analysis?.token)

        return { analysedPostsFiltered, lastSavedId: posts && posts.length > 0 ? posts[0].id : "" }

    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return { analysedPostsFiltered: [], lastSavedId: "" }
    }
}

export async function checkTelegramPostExists(
    channelName: string,
    messageId: number
): Promise<{
    exists: boolean
    error?: string
}> {
    try {
        // Try to get the specific message from the channel
        const messages = await client.getMessages(channelName, {
            ids: [messageId]
        })

        if (!messages || messages.length === 0) {
            return { exists: false }
        }

        const message = messages[0]

        // Check if message is actually deleted (Telegram returns a special type)
        if (message instanceof Api.MessageEmpty || !message) {
            return { exists: false }
        }

        return { exists: true }
    } catch (err: any) {
        // Network or auth errors - assume exists to avoid false positives
        console.error(`Error checking Telegram message ${channelName}/${messageId}:`, err.message)
        return { exists: true, error: err.message }
    }
}