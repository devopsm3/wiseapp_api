import { Queue, Worker } from "bullmq"
import connection from "../config/redis"
import { prisma } from "../prisma"
import { PlatformName } from "@prisma/client"
import { checkTwitterPostExists } from "../providers/twitter/twitter.provider"
import { checkTelegramPostExists } from "../providers/telegram/telegram.provider"
import { shouldCheckPost, updateSourceMetrics } from "./validation.helpers"
import { WorkerOptions } from "worker_threads"

// Create BullMQ Queue for post validation
export const postValidationQueue = new Queue("postValidation", {
    connection: connection
})

/**
 * Validate a single post's existence
 */
const validateSinglePost = async (post: any) => {
    const { id, sourceType, originalId, sourceId } = post

    try {
        let result: { exists: boolean; error?: string }

        if (sourceType === PlatformName.X) {
            result = await checkTwitterPostExists(originalId)
        } else if (sourceType === PlatformName.TELEGRAM) {
            const source = await prisma.source.findUnique({
                where: { id: sourceId },
                select: { user_username_source: true }
            })

            if (!source) {
                console.warn(`⚠️ Source ${sourceId} not found for post ${id}`)
                return { status: "skipped", reason: "source_not_found" }
            }

            result = await checkTelegramPostExists(
                source.user_username_source,
                parseInt(originalId)
            )
        } else {
            console.warn(`⚠️ Unknown platform type: ${sourceType}`)
            return { status: "skipped", reason: "unknown_platform" }
        }

        // Create validation record if not exists
        const validationRecord = await prisma.postValidation.findFirst({
            where: { sourcePostId: id }
        })
        if (!validationRecord) {
            await prisma.postValidation.create({
                data: {
                    sourcePostId: id,
                    exists: result.exists,
                    errorMessage: result.error || null,
                    metadata: result.error ? ({ error: result.error } as any) : null,
                    checkedAt: new Date()
                }
            })
        } else {
            await prisma.postValidation.update({
                where: { id: validationRecord.id },
                data: {
                    exists: result.exists,
                    errorMessage: result.error || null,
                    metadata: result.error ? ({ error: result.error } as any) : null,
                    checkedAt: new Date()
                }
            })
        }

        const statusIcon = result.exists ? "✅" : "❌"
        const platform = sourceType === PlatformName.X ? "Twitter" : "Telegram"
        console.log(`${statusIcon} Post ${id} (${platform}): ${result.exists ? "EXISTS" : "DELETED"}`)

        return {
            status: "success",
            postId: id,
            exists: result.exists,
            hasError: !!result.error
        }
    } catch (error) {
        console.error(`❌ Error validating post ${id}:`, error)
        return {
            status: "error",
            postId: id,
            error: (error as Error).message
        }
    }
}

// Create BullMQ Worker
export const postValidationWorker = new Worker("postValidation", async (e: WorkerOptions) => {
    if (e.name === "dailyPostValidation") {
        console.log(" ")
        console.log(" ")
        console.log("🕐 [BULLMQ] Processing daily post validation job...")
        console.log(" ")
        console.log(" ")

        try {
            const now = new Date()
            const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))

            // Fetch all posts from the database
            const allPosts = await prisma.sourcePost.findMany({
                select: {
                    id: true,
                    sourceId: true,
                    sourceType: true,
                    originalId: true,
                    date: true
                },
                orderBy: {
                    date: "desc"
                }
            })

            // Apply tiered batching filter
            const postsToCheck = allPosts.filter(post =>
                shouldCheckPost(post.date!, dayOfYear)
            )

            console.log(`📊 Total  posts: ${allPosts.length}`, `   => 📊 Posts to check today (tiered batching): ${postsToCheck.length}`)

            if (postsToCheck.length === 0) {
                console.log("✅ [BULLMQ] No posts to validate today")
                return {
                    processed: 0,
                    results: [],
                    timestamp: new Date()
                }
            }

            console.log(" ")
            console.log(" - - - - - - - - - - ")
            console.log(" ")

            const results = []
            let successCount = 0
            let deletedCount = 0
            let errorCount = 0

            // Validate each post sequentially (to avoid rate limits)
            for (const post of postsToCheck) {
                try {
                    const result = await validateSinglePost(post)
                    results.push(result)

                    if (result.status === "success") {
                        successCount++
                        if (!result.exists) deletedCount++
                    } else if (result.status === "error") {
                        errorCount++
                    }

                    // Small delay to avoid rate limits (200ms between checks)
                    await new Promise(resolve => setTimeout(resolve, 200))
                } catch (error) {
                    console.error(`❌ Error validating post ${post.id}:`, error)
                    results.push({
                        status: "error",
                        postId: post.id,
                        error: (error as Error).message
                    })
                    errorCount++
                }
            }

            console.log(" ")
            console.log(" - - - - - - - - - - ")
            console.log(" ")

            const uniqueSourceIds = [...new Set(postsToCheck.map(p => p.sourceId))]
            for (const sourceId of uniqueSourceIds) {
                try {
                    await updateSourceMetrics(sourceId)
                } catch (error) {
                    console.error(`❌ Error updating metrics for source ${sourceId}:`, error)
                }
            }
            console.log(" ")
            console.log(" ")
            console.log("✅ [BULLMQ] Daily post validation job completed!")
            console.log(" ")
            return {
                processed: postsToCheck.length,
                successCount,
                deletedCount,
                errorCount,
                sourcesUpdated: uniqueSourceIds.length,
                results,
                timestamp: new Date()
            }
        } catch (error) {
            console.error("❌ [BULLMQ] Error in daily post validation job:", error)
            throw error // Will trigger retry
        }
    }
}, {
    connection: connection
})

// Handle worker events
postValidationWorker.on("completed", (job) => {
    console.log(`✅ [BULLMQ] Validation job ${job.id} completed successfully`)
})

postValidationWorker.on("failed", (job, err) => {
    console.error(`❌ [BULLMQ] Validation job ${job?.id} failed:`, err.message)
})

/**
 * Schedule recurring job to run daily at 5:00 AM + run immediately on startup
 */
export const schedulePostValidation = async () => {
    await postValidationQueue.add(
        "dailyPostValidation",
        {},
        {
            repeat: {
                pattern: "0 5 * * *", // Cron: Every day at 5:00 AM,
                tz: "Europe/Paris"
            },
            removeOnComplete: {
                age: 86400 * 7, // Keep logs for 7 days
                count: 10 // Keep last 10 completions
            },
            removeOnFail: {
                age: 86400 * 14 // Keep failures for 14 days
            }
        }
    )

    console.log("✅ Post validation job scheduled (Daily at 5:00 AM via BullMQ)")

    // // Trigger immediate validation on server startup
    // await postValidationQueue.add(
    //     "dailyPostValidation",
    //     {},
    //     {
    //         priority: 1, // High priority
    //         removeOnComplete: {
    //             age: 86400 * 7,
    //             count: 10
    //         },
    //         removeOnFail: {
    //             age: 86400 * 14
    //         }
    //     }
    // )

    // console.log("🚀 Post validation job triggered immediately on startup")
}
