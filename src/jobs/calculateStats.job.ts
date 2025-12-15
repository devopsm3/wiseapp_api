import { Queue, Worker } from "bullmq"
import connection from "../config/redis"
import { prisma } from "../prisma"
import { calculateSourceStats } from "../modules/sources/sources.helpers"
import { SourceStatus } from "@prisma/client"
import { generateSourceRecommendations } from "../providers/AgentAI/recommendations.provider"

export const statsQueue = new Queue("stats", {
    connection: connection
})

export const statsWorker = new Worker("stats", async (job) => {
    console.log("📊 Processing stats job:", job.name)
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
            console.log("")
            console.log("Processing source:", source.user_name_source)
            console.log("")
            const signals = source.Signal
            // const now = new Date()
            const periods = {
                "ALL": signals,
                // "1M": signals.filter(s => s.entry_timestamp >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
                // "3M": signals.filter(s => s.entry_timestamp >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)),
                // "6M": signals.filter(s => s.entry_timestamp >= new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)),
                // "1Y": signals.filter(s => s.entry_timestamp >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000))
            }

            for (const [period, periodSignals] of Object.entries(periods)) {
                if (periodSignals.length === 0) continue

                const stats = calculateSourceStats(periodSignals)

                const recommendations = await generateSourceRecommendations({
                    sourceName: source.user_name_source,
                    platform: source.platform_logo,
                    stats,
                    followers_count: source.followers_count
                })

                await prisma.sourceStats.upsert({
                    where: {
                        sourceId_period: {
                            sourceId: source.id,
                            period: period
                        }
                    },
                    update: {
                        stats: stats as any,
                        recommendations: recommendations as any
                    },
                    create: {
                        sourceId: source.id,
                        period: period,
                        stats: stats as any,
                        recommendations: recommendations as any
                    }
                })
            }
        }
        console.log("✅ Stats calculation finished")
    }
}, {
    connection: connection
})

export const scheduleStatsCalculation = async () => {
    await statsQueue.add(
        "calculateSourceStats",
        {},
        {
            repeat: {
                pattern: "0 2 * * *", // Every day at 2AM
            },
        }
    )
    console.log("📅 Stats calculation scheduled")

    await statsQueue.add(
        "calculateSourceStats",
        {},
        {
            priority: 1, // High priority
            removeOnComplete: {
                age: 86400 * 7,
                count: 10
            },
            removeOnFail: {
                age: 86400 * 14
            }
        }
    )
}
