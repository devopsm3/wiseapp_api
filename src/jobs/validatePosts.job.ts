import { Queue, Worker } from "bullmq"
import connection from "../config/redis"
import { prisma } from "../prisma"
import { PlatformName } from "@prisma/client"
import { checkTwitterPostExists } from "../providers/twitter/twitter.provider"
import { checkTelegramPostExists } from "../providers/telegram/telegram.provider"
import { createNotificationService } from "../modules/notifications/notifications.service"
import { NotificationType } from "@prisma/client"
import { getIO } from "../config/socket"

// Create BullMQ Queue for post validation
export const postValidationQueue = new Queue("postValidation", {
    connection: connection
})


export async function updateSourceMetrics(sourceId: number): Promise<void> {
    // Get all validation results for this source's posts
    const validations = await prisma.postValidation.findMany({
        where: {
            SourcePost: {
                sourceId: sourceId
            }
        },
        select: {
            exists: true,
            errorMessage: true
        }
    })

    // Only count successful checks (no errors)
    const successfulChecks = validations.filter(v => !v.errorMessage)
    const totalChecks = successfulChecks.length
    const deletedCount = successfulChecks.filter(v => !v.exists).length

    if (totalChecks === 0) {
        return
    }
    // Calculate metrics

    // Update source
    await prisma.source.update({
        where: { id: sourceId },
        data: {
            deleted_count: deletedCount
        }
    })

    console.log(`📊 Updated source ${sourceId} => Deleted: ${deletedCount}`)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function shouldCheckPost(postCreatedAt: Date, currentDay: number): boolean {
    const now = new Date()
    const ageInDays = Math.floor((now.getTime() - postCreatedAt.getTime()) / (1000 * 60 * 60 * 24))

    if (ageInDays < 7) {
        // Recent posts: check daily
        return true
    } else if (ageInDays >= 7 && ageInDays < 30) {
        // Medium age: check every 3 days
        return true
        // return currentDay % 3 === 0
    } else {
        // Old posts: check every 7 days (weekly)
        return true
        // return currentDay % 7 === 0
    }
}

const validateSinglePost = async (post: any) => {
    const { id, platform, originalId, sourceId } = post

    try {
        let result: { exists: boolean; error?: string }

        if (platform === PlatformName.X) {
            result = await checkTwitterPostExists(originalId)
        } else if (platform === PlatformName.TELEGRAM) {
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
            console.warn(`⚠️ Unknown platform type: ${platform}`)
            return { status: "skipped", reason: "unknown_platform" }
        }

        // Create validation record if not exists
        const validationRecord = await prisma.postValidation.findFirst({
            where: { sourcePostId: id }
        })

        if (!result.exists) {
            const source = await prisma.source.findUnique({
                where: { id: sourceId }
            })
                 
            const userSources = await prisma.userSource.findMany({
                where: { source_id: sourceId, source_activated: true }
            })

            for (const us of userSources) {
                await createNotificationService(
                    us.user_id,
                    NotificationType.POST_DELETED,
                    "Post Deleted",
                    `A post from ${source?.user_name_source} has been deleted.`,
                    `/sources?id=${sourceId}` 
                )
            }
        }

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
        const platformPost = platform === PlatformName.X ? "Twitter" : "Telegram"
        console.log(`${statusIcon} Post ${id} (${platformPost}): ${result.exists ? "EXISTS" : "DELETED"}`)

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
export const postValidationWorker = new Worker("postValidation", async (job) => {
    if (job?.data && job?.data?.isManual) {
        getIO().to("user_" + job.data.userId).emit("job_started", { jobName: "postValidation" })
    }
    if (job.name === "dailyPostValidation") {
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
                    platform: true,
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
    if (job?.data && job?.data?.isManual) {
        getIO().to("user_" + job.data.userId).emit("job_completed", { jobName: "postValidation", status: true })
    }
})

postValidationWorker.on("failed", (job, err) => {
    console.error(`❌ [BULLMQ] Validation job ${job?.id} failed:`, err.message)
    if (job?.data && job?.data?.isManual) {
        getIO().to("user_" + job.data.userId).emit("job_completed", { jobName: "postValidation", status: false, error: err.message })
    }
})

/**
 * Schedule recurring job to run daily at 5:00 AM + run immediately on startup
 */
export const schedulePostValidation = async () => {
    const repeatableJobs = await postValidationQueue.getRepeatableJobs()
    for (const job of repeatableJobs) {
        await postValidationQueue.removeRepeatableByKey(job.key)
    }

    await postValidationQueue.add(
        "dailyPostValidation",
        {},
        {
            repeat: {
                // pattern: "43 14 * * *", // Cron: Every day at 14:35 AM,
                pattern: "0 2 * * *", // Cron: Every day at 2:00 AM,
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

    console.log("\n 📅 Post validation job scheduled (Daily at 14:43 AM via BullMQ) \n")

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
