import { Queue, Worker } from "bullmq"
import connection from "../config/redis"
import { prisma } from "../prisma"
import { PlatformName, SourceStatus } from "@prisma/client"
import { getTelegramChannelInfo, getTelegramChannelPosts } from "../providers/telegram/telegram.provider"
import { getTwitterChannelInfo, getTwitterChannelPosts } from "../providers/twitter/twitter.provider"
import { calculateMaxPivotFrom21Days, getCoinInfo } from "../providers/CoinMarketCap/coinmarketcap.provider"
import { createOrUpdateSignal } from "../providers/signals/signals.provider"
import { normalizeToken } from "../providers/signals/signals.helpers"
import { SourcePostAnalysis } from "../providers/sources/sources.types"
import { createNotificationService } from "../modules/notifications/notifications.service"
import { NotificationType } from "@prisma/client"
import { getIO } from "../config/socket"

export const fetchNewSignalsQueue = new Queue("fetchNewSignals", {
    connection: connection
})

export const fetchNewSignalsWorker = new Worker("fetchNewSignals", async (job) => {
    if (job?.data && job?.data?.isManual) {
        getIO().to("user_" + job.data.userId).emit("job_started", { jobName: "fetchNewSignals" })
    }
    await new Promise(resolve => setTimeout(resolve, 3000))
    console.log("\n ----------------------------------------------------------------------------------------------------------------------------------------------- \n")
    console.log("\n --------------------------- 📡 Processing fetchNewSignals job: ", job.id, " --------------------------- \n")
    if (job.name === "fetchNewSignals") {
        const sources = await prisma.source.findMany({
            where: {
                source_status: SourceStatus.VALIDE
            },
            include: {
                Signal: true
            }
        })

        console.log(`\n --------------------------- Getting New Signals Job: Found ${sources.length} valid sources to check for new signals ---------------------------`)

        for (const source of sources) {
            try {
                console.log(`\n --------------------------- checking source: ${source.user_name_source} (${source.platform}) ---------------------------`)

                const lastSavedMessageId = (source.metadata as any).last_message_id                
                let messages: any[] = []
                let lastNewSavedPostId: string = lastSavedMessageId ? String(lastSavedMessageId) : ""
                
                let updatedInfo: any = null
                if (source.platform === PlatformName.TELEGRAM) {
                    const infoResult = await getTelegramChannelInfo(source.user_username_source)
                    if (infoResult.channelInfo) updatedInfo = infoResult.channelInfo
                } else {
                    const infoResult = await getTwitterChannelInfo(source.user_username_source)
                    if (infoResult.channelInfo) updatedInfo = infoResult.channelInfo
                }

                if (!updatedInfo) {
                    continue
                }
                
                if (source.platform === PlatformName.TELEGRAM) {
                    const lastIdNum = lastSavedMessageId ? Number(lastSavedMessageId) : 0
                    if (lastIdNum) {
                        const { analysedPostsFiltered, lastSavedId } = await getTelegramChannelPosts(source.user_id_source, lastIdNum)
                        messages = analysedPostsFiltered
                        if (lastSavedId) lastNewSavedPostId = String(lastSavedId)
                    }
                } else {
                    const lastIdNum = lastSavedMessageId ? String(lastSavedMessageId) : ""
                    if (lastIdNum) {
                        const { analysedPostsFiltered, lastSavedId } = await getTwitterChannelPosts(source.user_id_source, lastIdNum)
                        messages = analysedPostsFiltered
                        if (lastSavedId) lastNewSavedPostId = String(lastSavedId)
                    }
                }

                console.log(`\n    --------------------------- Found ${messages.length} NEW messages for source: ${source.user_name_source}`)

                if (messages.length > 0) {
                    for (const element of messages) {
                        const analysis = element.analysis as unknown as SourcePostAnalysis
                        let post_url = ""
                        if (source.platform === PlatformName.TELEGRAM) {
                            post_url = `https://t.me/${source.user_username_source}/${String(element.id)}`
                        } else {
                            post_url = `https://x.com/${source.user_username_source}/status/${String(element.id)}`
                        }

                        const postCreated = await prisma.sourcePost.create({
                            data: {
                                sourceId: source.id,
                                platform: source.platform as PlatformName,
                                date: element.date,
                                timestamp: element.timestamp,
                                originalId: String(element.id),
                                mediaType: element.mediaType,
                                senderId: element.senderId,
                                text: element.text,
                                originalText: element.originalText,
                                analysis: element.analysis!,
                                post_url
                            }
                        })
                        if (analysis?.token && analysis?.type === "Signal") {
                            const normalizedToken = normalizeToken(analysis.token)
                            const coinInfo = await getCoinInfo(normalizedToken)
                            if (coinInfo) {

                                const currencyLogo = coinInfo.logo
                                const targetDate = new Date(element.date!)

                                const pivotResult = await calculateMaxPivotFrom21Days(normalizedToken, targetDate, analysis.direction!)                            
                                if (!pivotResult.status || !pivotResult.data) {
                                    console.log(`\n --------------------------- 🚨 Failed to get price/pivot data for ${normalizedToken}, skipping signal creation. --------------------------- \n`)
                                    // remove postCreated
                                    await prisma.sourcePost.delete({
                                        where: {
                                            id: postCreated.id
                                        }
                                    })
                                    continue
                                }

                                const entryPrice = pivotResult.data.priceAtStart || 0
                                const meta = pivotResult.data.meta

                                const signal = await createOrUpdateSignal({
                                    coinId: coinInfo.id,
                                    analysis: {
                                        direction: analysis.direction!,
                                        token: normalizedToken.toUpperCase(),
                                        token_id: coinInfo.id.toString(),
                                    },
                                    newSourceId: source.id,
                                    postCreatedId: postCreated.id,
                                    currencyLogo,
                                    pnlAbsolute: pivotResult.data.theoreticalProfitAbsolute || 0,
                                    pnlPercent: pivotResult.data.theoreticalProfitPercent || 0,
                                    entryPrice,
                                    exitPrice: pivotResult.data.bestPrice || null,
                                    entryTimestamp: new Date(element.date!),
                                    isComplete: pivotResult.data.isComplete || false,
                                    pivotCalcDays: pivotResult.data.validDays || 0,
                                    meta
                                })

                                // Notify users
                                const userSources = await prisma.userSource.findMany({
                                    where: { source_id: source.id, source_activated: true }
                                })

                                for (const us of userSources) {
                                    await createNotificationService(
                                        us.user_id,
                                        NotificationType.NEW_SIGNALS,
                                        "New Signal",
                                        `New signal on ${analysis.token} (${analysis.direction}) from ${source.user_name_source}`,
                                        `/signals?id=${signal.id}&type=classic`
                                    )
                                }
                            } else {
                                console.log(`\n --------------------------- Token ${analysis.token} not found in CoinMarketCap API`)
                            }
                        }
                    }
                }
                if (updatedInfo) {
                    let currentMetadata = (updatedInfo.metadata || {}) as any
                    let newMetadata = currentMetadata
                    newMetadata = { ...currentMetadata, last_message_id: lastNewSavedPostId }
                    await prisma.source.update({
                        where: { id: source.id },
                        data: {
                            platform_user_picture: updatedInfo.platform_user_picture,
                            user_name_source: updatedInfo.user_name_source,
                            followers_count: updatedInfo.followers_count,
                            user_verified: updatedInfo.user_verified,
                            metadata: newMetadata
                        }
                    })
                    console.log(`\n  --------------------------- ${source.user_name_source} is Updated ---------------------------`)
                }
            } catch (error: any) {
                console.error(`\n ❌ --------------------------- Error processing source ${source.user_name_source}:`, error.message)
            }
        }
    }
}, {
    connection: connection
})

fetchNewSignalsWorker.on("completed", async (job) => {
    console.log(`\n ✅ ------------------------------------------------------ [BULLMQ] Fetch new signals job DONE  - Job ${job.id} \n`)
    if (job?.data && job?.data?.isManual) {
        getIO().to("user_" + job.data.userId).emit("job_completed", { jobName: "fetchNewSignals", status: true })
    }
})

fetchNewSignalsWorker.on("failed", async (job, err) => {
    console.error(`\n ❌ --------------------------- [BULLMQ] Fetch new signals job failed! - Job ${job?.id}:`, err.message, " --------------------------- \n")
    if (job?.data && job?.data?.isManual) {
        getIO().to("user_" + job.data.userId).emit("job_completed", { jobName: "fetchNewSignals", status: false, error: err.message })
    }
})

export const scheduleFetchNewSignals = async () => {
    const repeatableJobs = await fetchNewSignalsQueue.getRepeatableJobs()
    for (const job of repeatableJobs) {
        await fetchNewSignalsQueue.removeRepeatableByKey(job.key)
    }

    await fetchNewSignalsQueue.add(
        "fetchNewSignals",
        {},
        {
            jobId: "daily-fetch-new-signals",
            repeat: {
                pattern: "0 4 * * *", // Cron: Every day at 1:00 AM
                tz: "Europe/Paris"
            },
        }
    )
    console.log("\n 📅 Fetch New Signals scheduled (Daily at 1:00 AM via BullMQ) \n")

    // await fetchNewSignalsQueue.add("fetchNewSignals", {})
}
