import path from "path"
import fs from "fs"
import { client } from "./initTelegram"
import { Api } from "telegram"
import { agentAI_Analyzer } from "../AgentAI/agent.ai.service"

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

        let creationDate: number | null = null
        for await (const message of client.iterMessages(channel, { reverse: true, limit: 1 })) {
            creationDate = message.date
        }
        
        const channelInfo = {
            platform_logo: "telegram",
            platform_user_picture: `storage/telegram/sources/${channelName}/channelPic.jpg`,
            platform_name: "telegram",
            user_id_source: (channel as Api.Channel).id.toString(),
            user_verified: (channel as Api.Channel).verified,
            followers_count: (channel as Api.Channel).participantsCount,
            user_creation_date: creationDate,
            title: (channel as Api.Channel).title,
            username: (channel as Api.Channel).username,
            broadcast: (channel as Api.Channel).broadcast,
            megagroup: (channel as Api.Channel).megagroup,
        }

        return channelInfo
    } catch (err: any) {
        return { error: err.message }
    }
}

export async function collectChannelMessages(channelName: string) {
    const messages: any[] = []
  
    for await (const message of client.iterMessages(channelName, {limit: 3})) {
        if (!(message instanceof Api.Message)) continue
        if (!message.message && !message.photo) continue
  
        // analyze text if present
        let analysis: any = null
        if (message.message) {
            analysis = await agentAI_Analyzer(message.message)
            if (analysis.type === "Irrelevant") continue
        }
  
        // handle photo if present
        // if (message.photo) {
        //     const storageDir = path.join(__dirname, `../../../storage/telegram/sources/${channel}`)
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
  
        // keep only needed data
        messages.push({
            id: message.id,
            text: message.message,
            date: message.date,
            senderId: message.senderId?.toString() || null,
            mediaType: message.photo ? "photo" : "text",
            analysis,
        })
    }
  
    return messages
}