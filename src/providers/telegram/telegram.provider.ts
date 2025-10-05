import path from "path"
import fs from "fs"
import { client } from "../../config/initTelegram"
import { Api } from "telegram"
// import { agentAI_signal_analyzer } from "../AgentAI/agent.ai.service"
import { countTokens } from "../AgentAI/agentai.helpers"
import { PlatformName } from "@prisma/client"
import { getDaysAgoTimestamp } from "../../utils/global.helpers"



export async function getTelegramChannelInfo(channelName: string) {
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
            platform_logo: PlatformName.TELEGRAM,
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
        console.log(" 🚀   -->  err:", err)
        return {
            channelInfo: null,
            error: err.message
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getTelegramChannelPosts(channelName: string, lastSavedId: number = 0) {
    

    const posts: any[] = []
    const offsetDate = getDaysAgoTimestamp(4)
    // for await (const message of client.iterMessages(channelName, { minId: lastSavedId })) {
    for await (const message of client.iterMessages(channelName, { offsetDate, reverse: true, limit: 2 })) {
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
        const { postText, tokens } = countTokens(message.message)

        
        console.log(" -------------------------------------------------------------- ----------------------- ")
        console.log(" 🚀   -->  message.message:", message.message)
        console.log(" 🚀   -->  message.message:", postText, " 🚀   -->  tokens:", tokens)
    
        console.log(" ")
        console.log(" ")
        console.log(" ")
        if (tokens < 3) continue
        if (tokens > 90) continue
        posts.push({
            id: message.id,
            text: postText,
            originalText: message.message,
            timestamp: message.date,
            date: new Date(message.date * 1000),
            senderId: message.senderId?.toString() || null,
            mediaType: message.photo ? "photo" : "text",
            // date: message.date,
        })
    }

    // Analyze text signals with AI 
    // for await (const post of posts) {
    //     let analysis: any = null
    //     if (post.text) {
    //         analysis = await agentAI_signal_analyzer(post.text)
    //         if (analysis.type === "Irrelevant") continue
    //         if (analysis.timeframe !== "Swing") continue
    //     }
    //     // keep only needed data
    //     analysedPosts.push({
    //         ...post,
    //         analysis,
    //     })

    // }
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
    // const analyses = await Promise.all(
    //     posts.map(p => agentAI_signal_analyzer(p.text))
    // )

    console.log(" 🚀   -->  analyses:", analyses)
      
    const analysedPosts = posts
        .map((post, i) => ({ ...post, analysis: analyses[i] }))
        .filter(p => p?.analysis?.type !== "Irrelevant")
        // .filter(p => p.analysis.type !== "Irrelevant" && p.analysis.timeframe === "Swing")
    return analysedPosts
}