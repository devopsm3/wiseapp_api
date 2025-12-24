import { Queue, Worker } from "bullmq"
import connection from "../config/redis"
import { prisma } from "../prisma"
import { calculateSourceStats, calculateTopCorrelations } from "../modules/sources/sources.helpers"
import { SourceStatus } from "@prisma/client"
import { generateSourceRecommendations } from "../providers/AgentAI/recommendations.provider"

export const statsQueue = new Queue("stats", {
    connection: connection
})

export const statsWorker = new Worker("stats", async (job) => {
    console.log("\n 📊 Processing stats job:", job.id, " \n")

    if (job.name === "calculateSourceStats") {
        const sources = await prisma.source.findMany({
            where: {
                source_status: SourceStatus.VALIDE
            },
            include: {
                Signal: true
            }
        })

        for (const source of sources) {
            console.log("----------------------- STATS JOB: calculating Source > Stat -----------------------", source.user_name_source)

            const signals = source.Signal
            const stats = calculateSourceStats(signals)


            console.log("----------------------- STATS JOB: calculating Source > Correlations -----------------------", source.user_name_source)

            const TIME_FRAME_HOURS = 48
            const otherSources = sources.filter((el) => el.id !== source.id)

            const topCorrelations = calculateTopCorrelations(
                source,
                otherSources,
                TIME_FRAME_HOURS
            )

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
                    recommendations: recommendations as any,
                    topCorrelations: topCorrelations as any
                },
                create: {
                    sourceId: source.id,
                    period: "ALL",
                    stats: stats as any,
                    recommendations: recommendations as any,
                    topCorrelations: topCorrelations as any
                }
            })
        }
    }
}, {
    connection: connection
})

statsWorker.on("completed", (job) => {
    console.log(`✅ [BULLMQ] Daily stats calculation job completed! - Job ${job.id} \n`)
})

statsWorker.on("failed", (job, err) => {
    console.error(`❌ [BULLMQ] Daily stats calculation job failed! - Job ${job?.id}:`, err.message, "\n")
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
            jobId: "daily-stats-calculation",
            repeat: {
                // pattern: "38 14 * * *", // Cron: Every day at 14:35 AM,
                pattern: "0 6 * * *", // Cron: Every day at 6:00 AM,
                tz: "Europe/Paris"
            },
        }
    )
    console.log("\n 📅 Stats calculation scheduled (Daily at 6:00 AM via BullMQ) \n")

    // await statsQueue.add("calculateSourceStats", {}, { priority: 1 })
}
