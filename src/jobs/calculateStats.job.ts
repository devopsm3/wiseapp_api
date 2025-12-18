import { Queue, Worker } from "bullmq"
import connection from "../config/redis"
import { prisma } from "../prisma"
import { calculateSourceStats, calculateTopCorrelations } from "../modules/sources/sources.helpers"
import { SourceStatus } from "@prisma/client"
import { generateSourceRecommendations } from "../providers/AgentAI/recommendations.provider"
import { GlobalSettings } from "../types/setup.types"

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
            console.log("")
            console.log("Processing source:", source.user_name_source)
            const signals = source.Signal
            const stats = calculateSourceStats(signals)
            console.log("Stats Calculation is DONE")
            
            let TIME_FRAME_HOURS = 48
            const setup = await prisma.setup.findFirst({
                where: {
                    user_db_id: source.user_db_id,
                },
            })
            if (setup && setup.settings) {
                const setupsettings = (setup?.settings as unknown as Partial<GlobalSettings>)
                TIME_FRAME_HOURS = setupsettings.metasignal_time_window || 48
            }

            const otherSources = sources.filter((el) => el.id !== source.id && el.user_db_id === source.user_db_id)
            
            const topCorrelations = calculateTopCorrelations(
                source,
                otherSources,
                TIME_FRAME_HOURS
            )
            
            await new Promise(resolve => setTimeout(resolve, 1000))
            const recommendations = await generateSourceRecommendations({
                sourceName: source.user_name_source,
                platform: source.platform_logo,
                stats,
                followers_count: source.followers_count
            })
            console.log("Recommendations generating is DONE", recommendations.length)

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
                pattern: "0 4    * * *", // Every day at 4AM,
                tz: "Europe/Paris"
            },
        }
    )
    console.log("📅 Stats calculation scheduled (Daily at 4:00 AM via BullMQ)")

    // await statsQueue.add(
    //     "calculateSourceStats",
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
}
