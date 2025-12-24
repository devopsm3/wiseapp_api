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

export const fetchNewSignalsQueue = new Queue("fetchNewSignals", {
    connection: connection
})

export const fetchNewSignalsWorker = new Worker("fetchNewSignals", async (job) => {
    console.log("\n 📡 Processing fetchNewSignals job:", job.id, " \n")

    if (job.name === "fetchNewSignals") {
        const sources = await prisma.source.findMany({
            where: {
                source_status: SourceStatus.VALIDE
            },
            include: {
                Signal: true
            }
        })

        console.log(`Found ${sources.length} valid sources to check for new signals.`)

        for (const source of sources) {
            try {
                console.log(`checking source: ${source.user_name_source} (${source.platform})`)
                
                // Update source metadata
                let updatedInfo: any = null
                if (source.platform === PlatformName.TELEGRAM) {
                    const infoResult = await getTelegramChannelInfo(source.user_username_source)
                    if (infoResult.channelInfo) updatedInfo = infoResult.channelInfo
                } else {
                    const infoResult = await getTwitterChannelInfo(source.user_username_source)
                    if (infoResult.channelInfo) updatedInfo = infoResult.channelInfo
                }

                if (updatedInfo) {
                    await prisma.source.update({
                        where: { id: source.id },
                        data: {
                            platform_user_picture: updatedInfo.platform_user_picture,
                            user_name_source: updatedInfo.user_name_source,
                            followers_count: updatedInfo.followers_count,
                            user_verified: updatedInfo.user_verified,
                            metadata: updatedInfo.metadata
                        }
                    })
                    console.log(`  Updated metadata for ${source.user_name_source}`)
                }

                const metadata = source.metadata as any
                const lastMessageId = metadata?.last_message_id
                
                let messages: any[] = []
                
                if (source.platform === PlatformName.TELEGRAM) {
                    // Fetch recent posts - provider already calls agentAI_signal_analyzer
                    // Using limit 100 as per current provider implementation
                    const lastIdNum = lastMessageId ? Number(lastMessageId) : 0
                    messages = await getTelegramChannelPosts(source.user_id_source, lastIdNum)
                } else {
                    // Fetch recent posts - provider already calls agentAI_signal_analyzer
                    // Twitter uses string IDs
                    messages = await getTwitterChannelPosts(source.user_id_source, lastMessageId ? String(lastMessageId) : "")
                }

                if (!messages || messages.length === 0) {
                    continue
                }

                // Filter for NEW messages only (id > lastMessageId)
                // Telegram IDs are numbers, Twitter IDs are string numbers (comparable lexicographically usually, but safer to BigInt if needed. 
                // However, Twitter IDs are time-ordered. Comparing strings works for length, but let's be careful.)
                // Actually, existing code in sources.provider.ts didn't seem to account for "updates" logic explicitly, just creation.
                // Here we need strict "new" filtering.
                
                const newMessages = messages.filter(msg => {
                    if (!lastMessageId) return true // If no last ID, process all (or maybe limited recent? safe to process all fetched)
                    
                    if (source.platform === PlatformName.TELEGRAM) {
                        return Number(msg.id) > Number(lastMessageId)
                    } else {
                        // Twitter IDs are strings, use BigInt comparison
                        return BigInt(msg.id) > BigInt(lastMessageId)
                    }
                })

                if (newMessages.length === 0) {
                    console.log(`  No new messages for ${source.user_name_source}`)
                    continue
                }

                console.log(`  Found ${newMessages.length} NEW messages for ${source.user_name_source}`)

                // Find max ID to update source later
                let maxId = lastMessageId
                
                for (const element of newMessages) {
                    // specific track of maxID found in this batch
                    if (source.platform === PlatformName.TELEGRAM) {
                        if (!maxId || Number(element.id) > Number(maxId)) maxId = element.id
                    } else {
                        if (!maxId || BigInt(element.id) > BigInt(maxId)) maxId = element.id
                    }

                    const analysis = element.analysis as unknown as SourcePostAnalysis

                    // Check if it is a signal
                    if (analysis?.token && analysis?.type === "Signal") {
                        const normalizedToken = normalizeToken(analysis.token)
                        const coinInfo = await getCoinInfo(normalizedToken) // Get basic coin info
                        
                        if (coinInfo) {
                            let post_url = ""
                            if (source.platform === PlatformName.TELEGRAM) {
                                post_url = `https://t.me/${source.user_username_source}/${String(element.id)}`
                            } else {
                                post_url = `https://x.com/${source.user_username_source}/status/${String(element.id)}`
                            }

                            // Create SourcePost
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

                            const currencyLogo = coinInfo.logo
                            const targetDate = new Date(element.date!)

                            // Determine Entry Price and Initial Pivot Data
                            // "pivot i guess no need becuase it will first day" -> We use calculateMaxPivotFrom21Days 
                            // because it handles the "start" price logic and returns initial structure.
                            const pivotResult = await calculateMaxPivotFrom21Days(normalizedToken, targetDate, analysis.direction!)
                            
                            // Even if status is false (failed to process), we might skip. 
                            // But calculateMaxPivotFrom21Days returns {status:true ... validDays:0} if data is missing but priceAtStart found
                            // If it fails to find PRICE, it returns status: false.
                            
                            if (!pivotResult.status || !pivotResult.data) {
                                console.log(`  Failed to get price/pivot data for ${normalizedToken}, skipping signal creation.`)
                                continue
                            }

                            const entryPrice = pivotResult.data.priceAtStart || 0
                            const meta = pivotResult.data.meta

                            await createOrUpdateSignal({
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
                            
                            console.log(`    ✅ Created signal for ${normalizedToken}`)

                        } else {
                            console.log(`    Token ${analysis.token} not found in CoinMarketCap API`)
                        }
                    }
                }

                // Update last_message_id with the MAX id found in the batch (assuming we processed the most recent ones)
                // Note: messages from providers usually come NEWEST first. 
                // So maxId should be effectively the ID of the first message in 'newMessages' if it was sorted desc.
                // We computed maxId manually above to be safe.
                if (maxId && maxId !== lastMessageId) {
                    // Fetch fresh source to get latest metadata (which might have been updated at start of loop)
                    const currentSource = await prisma.source.findUnique({ where: { id: source.id } })
                    const currentMetadata = (currentSource?.metadata || {}) as any
                    
                    const newMetadata = { ...currentMetadata, last_message_id: maxId }
                    await prisma.source.update({
                        where: { id: source.id },
                        data: { metadata: newMetadata }
                    })
                    console.log(`  Updated last_message_id for ${source.user_name_source} to ${maxId}`)
                }

            } catch (error: any) {
                console.error(`Error processing source ${source.user_name_source}:`, error.message)
            }
        }
    }
}, {
    connection: connection
})

fetchNewSignalsWorker.on("completed", (job) => {
    console.log(`✅ [BULLMQ] Fetch new signals job completed! - Job ${job.id} \n`)
})

fetchNewSignalsWorker.on("failed", (job, err) => {
    console.error(`❌ [BULLMQ] Fetch new signals job failed! - Job ${job?.id}:`, err.message, "\n")
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
                pattern: "0 1 * * *", // Cron: Every day at 1:00 AM
                tz: "Europe/Paris"
            },
        }
    )
    console.log("\n 📅 Fetch New Signals scheduled (Daily at 1:00 AM via BullMQ) \n")
}
