import path from "path"
import fs from "fs"
import { client } from "../../services/initTelegram"
import { Api } from "telegram"

export async function getChannelMessages(username: string) {
    try {

        const channel = await client.getEntity(username)
        const full = await client.invoke(
            new Api.channels.GetFullChannel({
                channel: channel,
            })
        )

        const storageDir = path.join(__dirname, `../../../storage/telegram/sources/${username}`)
        fs.mkdirSync(storageDir, { recursive: true })

        const channelPhoto = await client.downloadMedia(full.fullChat.chatPhoto as any)
        fs.writeFileSync(path.join(storageDir, "channelPic.jpg"), Buffer.from(channelPhoto as any))

        let creationDate: number
        for await (const message of client.iterMessages(channel, { reverse: true, limit: 1 })) {
            creationDate = message.date
        }
        
        const channelInfo = {
            platform_logo: "telegram",
            platform_user_picture: `storage/telegram/sources/${username}/channelPic.jpg`,
            platform_name: "telegram",
            user_id_source: (channel as Api.Channel).id.toString(),
            user_verified: (channel as Api.Channel).verified,
            user_creation_date: new Date(creationDate! * 1000),
            followers_count: (channel as Api.Channel).participantsCount,
            // creationDate: (channel as Api.Channel).createdAt,
            title: (channel as Api.Channel).title,
            username: (channel as Api.Channel).username,
            broadcast: (channel as Api.Channel).broadcast,
            megagroup: (channel as Api.Channel).megagroup,
        }

        const messages = []
        for await (const message of client.iterMessages(channel)) {
            if (message instanceof Api.Message && (message.message || message.photo)) {
                let type = "text"
                if (message.photo) {
                    try {
                        type = "MessageMediaPhoto"
                        const fileName = `telegram_msg_${message.id}_file_${message.photo.id}.jpg`
                        const filePath = path.join(storageDir, fileName)
                        if (!fs.existsSync(filePath)) {
                            const buffer = await client.downloadMedia(message.photo as any)
                            fs.writeFileSync(filePath, Buffer.from(buffer as any))
                            console.log("✅ Saved new media")
                        } else {
                            console.log("⚠️ File already exists, skipped")
                        }
                    } catch (error: any) {
                        console.error(error)
                    }
                }
                const msg: any = {
                    id: message.id,
                    text: message.message || null,
                    date: message.date || null,
                    senderId: message.senderId?.toString() || null,
                    type: type,
                    // media: message.media || null,
                }
                messages.push(msg)

                // send to AGENT AI
                
            }

        }

        return { channel, full, channelInfo, messages }
    } catch (err: any) {
        console.error(err)
        return { error: err.message }
    }
}