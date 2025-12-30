import { Queue, Worker } from "bullmq"
import connection from "../config/redis"
import { prisma } from "../prisma"
import { calculateSourceStats, calculateTopCorrelations, calculateSuspensionMetrics } from "../modules/sources/sources.helpers"
import { SourceStatus } from "@prisma/client"
import { generateSourceRecommendations } from "../providers/AgentAI/recommendations.provider"
import { GlobalSettings } from "../types/setup.types"
import { NotificationType } from "@prisma/client"
import { createNotificationService } from "../modules/notifications/notifications.service"
import { getIO } from "../config/socket"

export const calculateSourceStatsJob = async () => {

    console.log("\n ----------------------------------------------------------------------------------------------------------------------------------------------- \n")
    const sources = await prisma.source.findMany({
        where: {
            source_status: SourceStatus.VALIDE
        },
        include: {
            Signal: true
        }
    })

    console.log(`\n ----------------------- STATS JOB 📊:  Found ${sources.length} sources to update ----------------------- \n`)


    for (const source of sources) {
        const signals = source.Signal
        const suspensionMetrics = calculateSuspensionMetrics(signals)

        // Update Source metrics
        await prisma.source.update({
            where: { id: source.id },
            data: {
                bad_signals_count: suspensionMetrics.bad_signals_count,
                signals_count_last_30d: suspensionMetrics.signals_count_last_30d
            }
        })

        // Check suspension for each user
        const userSources = await prisma.userSource.findMany({
            where: { source_id: source.id },
            include: { User: { include: { Setup: true } } }
        })

        for (const us of userSources) {
            // Get user's global settings
            const settings = us.User && us.User.Setup && us.User.Setup.length > 0 ? us.User.Setup[0]?.settings as unknown as Partial<GlobalSettings> : null
            
            if (settings) {
                const minCount = settings.source_suspend_by_count ?? 0
                if (us.source_activated && minCount > 0 && suspensionMetrics.signals_count_last_30d < minCount) {
                    // Suspend
                    await prisma.userSource.update({
                        where: { id: us.id },
                        data: { source_activated: false }
                    })

                    await createNotificationService(
                        us.user_id,
                        NotificationType.SOURCE_SUSPENDED,
                        "Source Suspended",
                        `Source ${source.user_name_source} has been suspended due to low activity (${suspensionMetrics.signals_count_last_30d} signals in 30 days, required: ${minCount}).`,
                        `/sources?id=${source.id}`
                    )
                }

                const maxBadSignals = settings.source_suspend_by_bad_signals ?? 0
                if (us.source_activated && maxBadSignals > 0 && suspensionMetrics.bad_signals_count >= maxBadSignals) {
                    // Suspend
                    await prisma.userSource.update({
                        where: { id: us.id },
                        data: { source_activated: false }
                    })

                    await createNotificationService(
                        us.user_id,
                        NotificationType.SOURCE_SUSPENDED,
                        "Source Suspended",
                        `Source ${source.user_name_source} has been suspended due to ${suspensionMetrics.bad_signals_count} consecutive bad signals (limit: ${maxBadSignals}).`,
                        `/sources?id=${source.id}`
                    )
                }

                console.log("----------------------- STATS JOB: calculating Source > Correlations -----------------------", source.user_name_source)
                // Calculate Correlations per user
                const TIME_FRAME_HOURS = settings.metasignal_time_window ?? 72
                
                // Get user's other sources
                const userOtherSources = await prisma.userSource.findMany({
                    where: {
                        user_id: us.user_id,
                        source_id: { not: source.id }
                    },
                    include: {
                        Source: {
                            include: { Signal: true }
                        }
                    }
                })

                const otherSources = userOtherSources
                    .filter(us => us.Source.source_status === SourceStatus.VALIDE)
                    .map(us => us.Source)

                const topCorrelations = calculateTopCorrelations(
                    source,
                    otherSources,
                    TIME_FRAME_HOURS
                )
                await prisma.userSource.update({
                    where: { id: us.id },
                    data: {
                        topCorrelations: topCorrelations as any
                    }
                })
            }
        }
        
        console.log("----------------------- STATS JOB: calculating Source > Stat -----------------------", source.user_name_source)
        const stats = calculateSourceStats(signals)

        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log("----------------------- STATS JOB: calculating Source > Recommendations -----------------------", source.user_name_source, " \n")

        const recommendations = await generateSourceRecommendations({
            sourceName: source.user_name_source,
            platform: source.platform,
            stats,
            followers_count: source.followers_count
        })

        await prisma.sourceStats.upsert({
            where: {
                sourceId_period: {
                    sourceId: source.id,
                    period: "ALL"
                }
            },
            update: {
                stats: stats as any,
                recommendations: recommendations as any
            },
            create: {
                sourceId: source.id,
                period: "ALL",
                stats: stats as any,
                recommendations: recommendations as any
            }
        })
    }
}


export const statsQueue = new Queue("stats", {
    connection: connection
})

export const statsWorker = new Worker("stats", async (job) => {
    if (job?.data && job?.data?.isManual) {
        getIO().to("user_" + job.data.userId).emit("job_started", { jobName: "stats" })
    }
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log("\n ---------------------- 📊 Processing stats job:", job.id, " ---------------------- \n")
    if (job.name === "calculateSourceStats") {
        await calculateSourceStatsJob()
    }
}, {
    connection: connection
})

statsWorker.on("completed", (job) => {
    console.log(`✅ ------------------------------------------------------ Daily stats calculation job completed! - Job ${job.id} \n`)
    if (job?.data && job?.data.isManual) {
        getIO().to("user_" + job?.data.userId).emit("job_completed", { jobName: "stats", status: true })
    }
})

statsWorker.on("failed", (job, err) => {
    console.error(`❌ [BULLMQ] Daily stats calculation job failed! - Job ${job?.id}:`, err.message, "\n")
    if (job?.data && job?.data.isManual) {
        getIO().to("user_" + job.data.userId).emit("job_completed", { jobName: "stats", status: false, error: err.message })
    }
})



export const scheduleStatsCalculation = async () => {
    const repeatableJobs = await statsQueue.getRepeatableJobs()
    for (const job of repeatableJobs) {
        await statsQueue.removeRepeatableByKey(job.key)
    }

    await statsQueue.add(
        "calculateSourceStats",
        {},
        {
            jobId: "daily-stats-calculating-job",
            repeat: {
                pattern: "0 6 * * *", // Cron: Every day at 6:00 AM,
                tz: "Europe/Paris"
            },
        }
    )
    // console.log("\n 📅 Stats calculation scheduled (Daily at 6:00 AM via BullMQ) \n")

    // await statsQueue.add("calculateSourceStats", {}, { priority: 1 })
}
