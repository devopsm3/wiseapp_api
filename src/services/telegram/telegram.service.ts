import path from "path"
import fs from "fs"
import { client } from "./initTelegram"
import { Api } from "telegram"
import { agentAI_signal_analyzer } from "../AgentAI/agent.ai.service"
// import { ChannelInfo, PlatformName } from "../../models/models"


function cutoffSeconds(days = 21): number {
    const d = new Date()           // now (server local time)
    d.setHours(0, 0, 0, 0)        // set to today 00:00:00 local
    d.setDate(d.getDate() - days) // subtract days
    return Math.floor(d.getTime() / 1000) // seconds
}

export async function getChannelInfo(channelName: string) {
    try {

        const channel = await client.getEntity(channelName)
        const full = await client.invoke(
            new Api.channels.GetFullChannel({
                channel: channel,
            })
        )

        const storageDir = path.join(__dirname, `../../../storage/telegram/sources/${channelName}`)
        fs.mkdirSync(storageDir, { recursive: true })

        const channelPhoto = await client.downloadMedia(full.fullChat.chatPhoto as any)
        fs.writeFileSync(path.join(storageDir, "channelPic.jpg"), Buffer.from(channelPhoto as any))

        let creationDate: number = 0
        for await (const message of client.iterMessages(channel, { reverse: true, limit: 1 })) {
            creationDate = message.date
        }

        const channelInfo = {
            platform_logo: "telegram",
            platform_user_picture: `storage/telegram/sources/${channelName}/channelPic.jpg`,
            user_name_source: (channel as Api.Channel).title,
            user_username_source: (channel as Api.Channel).username || "",
            user_id_source: (channel as Api.Channel).id.toString(),
            user_verified: (channel as Api.Channel).verified || false,
            followers_count: (channel as Api.Channel).participantsCount || 0,
            user_creation_date: creationDate,
            metadata: {
                title: (channel as Api.Channel).title,
                username: (channel as Api.Channel).username || "",
                broadcast: (channel as Api.Channel).broadcast || false,
                megagroup: (channel as Api.Channel).megagroup || false,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function collectChannelPosts(channelName: string, lastSavedId: number = 0) {
    

    const posts: any[] = []
    const analysedPosts: any[] = []
    
    const offsetDate = cutoffSeconds(9)
    
    // for await (const message of client.iterMessages(channelName, { minId: lastSavedId })) {
    for await (const message of client.iterMessages(channelName, { offsetDate, reverse: true })) {
        if (!(message instanceof Api.Message)) continue
        if (!message.message) continue
        // if (!message.message && !message.photo) continue
        
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
            timestamp: message.date,
            date: new Date(message.date * 1000),
            senderId: message.senderId?.toString() || null,
            mediaType: message.photo ? "photo" : "text",
            // date: message.date,
        })
    }

    // Analyze text signals with AI 
    for await (const post of posts) {
        let analysis: any = null
        if (post.text) {
            analysis = await agentAI_signal_analyzer(post.text)
            // // console.log(" ")
            // console.log(" 🚀   -->  post.text:", post.text)
            // console.log(" 🚀   -->  analysis:", analysis)
            // console.log(" ")
            // console.log(" ")
            // console.log(" ")
            if (analysis.type === "Irrelevant") continue
            if (analysis.timeframe !== "Swing") continue
        }
        // keep only needed data
        analysedPosts.push({
            ...post,
            analysis,
        })

    }
    return analysedPosts
}