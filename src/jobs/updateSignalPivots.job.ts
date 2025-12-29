import { Queue, Worker } from "bullmq"
import connection from "../config/redis"
import { prisma } from "../prisma"
import { getIO } from "../config/socket"
import { getOHLCVData }from "../providers/CoinMarketCap/coinmarketcap.provider"
import {
    PivotCalculationMeta,
    CoinMarketCapOHLC,
} from "../providers/CoinMarketCap/coinmarketcap.types"

const RECALCULATE_MODE = true

/**
 * Update a single incomplete signal with the next day's OHLCV data
 */
const updateSignalPivots = async (signal: any) => {
    // Calculate the next day to fetch (entry_date + pivot_calc_days)
    const DateToFetch = new Date(signal.entry_timestamp)
    DateToFetch.setUTCDate(DateToFetch.getUTCDate() + signal.pivot_calc_days)
    // Don't fetch future data
    if (DateToFetch.getTime() > new Date().getTime()) {
        console.log(`⏳ Signal ${signal.id} (${signal.currency_label}): Next day is in the future, skipping...`)
        return { status: "skipped", reason: "future_date" }
    }

    // Fetch OHLCV data for the next day only
    let updatedPivotData: CoinMarketCapOHLC[] = []
    let pivot = 0
    const meta = signal.meta as PivotCalculationMeta
    const entryPrice = signal.entry_price

    if (RECALCULATE_MODE) {
        updatedPivotData = meta?.pivotData || []
    } else {
        const quotes = await getOHLCVData(signal.coin_id, DateToFetch, DateToFetch)

        if (!quotes || quotes.length === 0) {
            console.warn(`-----------------------  ⚠️  No OHLCV data for : signal id: ${signal.id} on ${DateToFetch.toISOString()} ----------------------- \n`)
            return { status: "failed", reason: "no_data" }
        }

        // Process new quote and add to pivot data
        const quote = quotes[0]
        const quoteDate = new Date(quote.time_open)
        const usdQuote = quote.quote.USD

        // Validation: Skip if data is invalid (zero prices)
        if (usdQuote.high === 0 || usdQuote.low === 0 || usdQuote.close === 0) {
            console.warn(`-----------------------  ⚠️  Invalid OHLCV data (zero values) for : signal id: ${signal.id} on ${DateToFetch.toISOString()} ----------------------- \n`)
            return { status: "failed", reason: "invalid_data" }
        }

        pivot = (usdQuote.high + usdQuote.low + usdQuote.close) / 3

        const newPivotElement: CoinMarketCapOHLC = {
            time: quoteDate,
            open: usdQuote.open,
            high: usdQuote.high,
            low: usdQuote.low,
            close: usdQuote.close,
            pivot: pivot
        }

        updatedPivotData = [...(meta?.pivotData || []), newPivotElement]
    }

    // Recalculate everything from updatedPivotData
    let maxPivot = entryPrice
    let maxPivotDate: Date | null = null
    let minPivot = entryPrice
    let minPivotDate: Date | null = null

    if (updatedPivotData.length > 0) {
        updatedPivotData.forEach(d => {
            if (d.pivot > maxPivot) {
                maxPivot = d.pivot
                maxPivotDate = new Date(d.time)
            }
            if (d.pivot < minPivot) {
                minPivot = d.pivot
                minPivotDate = new Date(d.time)
            }
        })
    }

    // Calculate theoretical profitability
    let theoreticalProfitAbsolute = 0
    let theoreticalProfitPercent = 0

    let bestPrice = 0
    const direction = signal.signal_trend

    if (direction === "LONG") {
        if (maxPivot > entryPrice) {
            theoreticalProfitAbsolute = maxPivot - entryPrice
            theoreticalProfitPercent = ((maxPivot - entryPrice) / entryPrice) * 100
            bestPrice = maxPivot
        } else {
            theoreticalProfitAbsolute = minPivot - entryPrice
            theoreticalProfitPercent = ((minPivot - entryPrice) / entryPrice) * 100
            bestPrice = minPivot
        }
    } else {
        if (minPivot < entryPrice) {
            theoreticalProfitAbsolute = entryPrice - minPivot
            theoreticalProfitPercent = ((entryPrice - minPivot) / entryPrice) * 100
            bestPrice = minPivot
        } else {
            theoreticalProfitAbsolute = -(maxPivot - entryPrice)
            theoreticalProfitPercent = -((maxPivot - entryPrice) / entryPrice) * 100
            bestPrice = maxPivot
        }
    }

    // Determine signal success
    const newPivotCalcDays = RECALCULATE_MODE ? signal.pivot_calc_days : signal.pivot_calc_days + 1
    const isComplete = newPivotCalcDays >= 21

    let signalSuccess: boolean | null = null
    if (isComplete) {
        if (direction === "LONG") {
            signalSuccess = maxPivot > entryPrice
        } else {
            signalSuccess = minPivot < entryPrice
        }
    }

    // Update meta
    const updatedMeta: PivotCalculationMeta = {
        signalSuccess,
        maxPivot,
        maxPivotDate,
        minPivot,
        minPivotDate,
        pivotData: updatedPivotData,
    }

    console.log(`\n ----------------------- 🔄 Updating Signal   ${signal.id} (${signal.currency_label}) => : Day ${signal.pivot_calc_days + 1}/21   ------------ \n`)

    // Update signal in database
    await prisma.signal.update({
        where: { id: signal.id },
        data: {
            pivot_calc_days: newPivotCalcDays,
            isComplete,
            pnlA: theoreticalProfitAbsolute,
            pnlP: theoreticalProfitPercent,
            exit_price: bestPrice,
            meta: updatedMeta as any,
            updated_at: new Date(),
        },
    })

    const statusEmoji = isComplete ? "✅" : "⏳"
    const profitEmoji = theoreticalProfitPercent > 0 ? "📈" : "📉"

    console.log(`${statusEmoji} Signal ${signal.id} (${signal.currency_label}): Day ${newPivotCalcDays}/21
        price at start: $${entryPrice.toFixed(6)}
        day pivot: $${pivot.toFixed(6)}
        Best Price: $${bestPrice.toFixed(6)}
        ${profitEmoji} Profit: $${theoreticalProfitAbsolute.toFixed(2)} (${theoreticalProfitPercent > 0 ? "+" : ""}${theoreticalProfitPercent.toFixed(2)}%)
        Complete: ${isComplete ? "YES" : "NO"} \n`)

    return {
        status: "success",
        signalId: signal.id,
        day: newPivotCalcDays,
        isComplete,
        profit: theoreticalProfitPercent,
        bestPrice,
    }
}

export const dailyPivotUpdate = async () => {
    try {
        // await 1 sec
        await new Promise((resolve) => setTimeout(resolve, 3000))
        console.log("\n ----------------------------------------------------------------------------------------------------------------------------------------------- \n")
        // Fetch all incomplete signals where pivot_calc_days < 21
        const whereClause: any = RECALCULATE_MODE ? {
            // In recalculate mode, we might want to process signals that are already "done" but wrong
            pivot_calc_days: {
                gt: 0
            }
        } : {
            isComplete: false,
            pivot_calc_days: {
                lt: 21,
            },
        }

        const signalsToProcess = await prisma.signal.findMany({
            where: whereClause,
        })

        console.log(`\n ----------------------- PIVOT calculating JOB 📊: [Recalculate: ${RECALCULATE_MODE}] Found ${signalsToProcess.length} signals to update ----------------------- \n`)
        // Update each signal sequentially
        for (const signal of signalsToProcess) {
            try {
                await updateSignalPivots(signal)
            } catch (error) {
                console.error(`❌ Error updating signal ${signal.id}:`, error, " \n")
            }
        }

        return {
            processed: signalsToProcess.length,
            timestamp: new Date(),
        }
    } catch (error) {
        console.error(
            "❌ [BULLMQ] Error in daily signal pivot update job:",
            error
        )
        throw error
    }
}

// Create BullMQ Queue for signal pivot updates
export const signalPivotQueue = new Queue("signalPivots", {
    connection: connection,
})

// Create BullMQ Worker
export const signalPivotWorker = new Worker("signalPivots", async (job) => {
    if (job?.data && job?.data?.isManual) {
        getIO().to("user_" + job.data.userId).emit("job_started", { jobName: "signalPivots" })
    }
    if (job.name === "dailyPivotUpdate") {
        await dailyPivotUpdate()
    }
}, { connection: connection }
)

// Handle worker events
signalPivotWorker.on("completed", async (job) => {
    console.log(`\n ✅ ------------------------------------------------------ Daily signal pivot update job completed! - Job ${job.id} \n`)
    if (job?.data && job?.data?.isManual) {
        getIO().to("user_" + job.data.userId).emit("job_completed", { jobName: "signalPivots", status: true })
    }
})

signalPivotWorker.on("failed", (job, err) => {
    console.error(
        `\n ❌ [BULLMQ] Daily signal pivot update job failed! - Job ${job?.id}:`,
        err.message,
        "\n"
    )
    if (job?.data && job?.data?.isManual) {
        getIO().to("user_" + job.data.userId).emit("job_completed", { jobName: "signalPivots", status: false, error: err.message })
    }
})

/**
 * Schedule recurring job to run daily at 4:00 AM
 */
export const scheduleSignalPivotUpdate = async () => {
    const repeatableJobs = await signalPivotQueue.getRepeatableJobs()
    for (const job of repeatableJobs) {
        await signalPivotQueue.removeRepeatableByKey(job.key)
    }

    await signalPivotQueue.add(
        "dailyPivotUpdate",
        {},
        {
            jobId: "daily-pivot-update",
            repeat: {
                pattern: "0 5 * * *", // Cron: Every day at 4:00 AM,
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

    //     // console.log(
    //     //     "\n 📅 Signal pivot update job scheduled (Daily at 4:00 AM via BullMQ)\n"
    //     // )

    //     // Trigger immediate signal pivot update on server startup
    // await signalPivotQueue.add("dailyPivotUpdate", {})

    // console.log("✅ Signal pivot update job triggered immediately")
}
