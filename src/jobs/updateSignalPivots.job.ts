import { Queue, Worker } from "bullmq"
import connection from "../config/redis"
import { prisma } from "../prisma"
import { getOHLCVData } from "../providers/CoinMarketCap/coinmarketcap.provider"
import {
    PivotCalculationMeta,
    CoinMarketCapOHLC,
} from "../providers/CoinMarketCap/coinmarketcap.types"

// Create BullMQ Queue for signal pivot updates
export const signalPivotQueue = new Queue("signalPivots", {
    connection: connection,
})

/**
 * Update a single incomplete signal with the next day's OHLCV data
 */
const updateSignalPivots = async (signal: any) => {
    // Calculate the next day to fetch (entry_date + pivot_calc_days)
    const DateToFetch = new Date(signal.entry_timestamp)
    DateToFetch.setUTCDate(DateToFetch.getUTCDate() + signal.pivot_calc_days)
    // Don't fetch future data
    if (DateToFetch.getTime() > new Date().getTime()) {
        console.log(`⏳ Signal ${signal.id} (${signal.currency_label}): Next day is in the future, skipping...` )
        return { status: "skipped", reason: "future_date" }
    }

    // Fetch OHLCV data for the next day only
    const quotes = await getOHLCVData(signal.coin_id, DateToFetch, DateToFetch)

    if (!quotes || quotes.length === 0) {
        console.warn(`-----------------------  ⚠️  No OHLCV data for : signal id: ${signal.id} on ${DateToFetch.toISOString()} ----------------------- \n`)
        return { status: "failed", reason: "no_data" }
    }

    // Get existing pivot data from meta
    const meta = signal.meta as PivotCalculationMeta
    const entryPrice = signal.entry_price
    const existingPivotData: CoinMarketCapOHLC[] = meta?.pivotData || []

    // Process new quote and add to pivot data
    const quote = quotes[0]
    const quoteDate = new Date(quote.time_open)
    const usdQuote = quote.quote.USD
    const pivot = (usdQuote.high + usdQuote.low + usdQuote.close) / 3

    const newPivotElement: CoinMarketCapOHLC = {
        time: quoteDate,
        open: usdQuote.open,
        high: usdQuote.high,
        low: usdQuote.low,
        close: usdQuote.close,
        pivot: pivot,
    }

    // Add new pivot data
    const updatedPivotData = [...existingPivotData, newPivotElement]

    // Optimized: Use existing max/min from meta or default to entryPrice
    let maxPivot = meta?.maxPivot ?? entryPrice
    let maxPivotDate = meta?.maxPivotDate ? new Date(meta.maxPivotDate) : null
    let minPivot = meta?.minPivot ?? entryPrice
    let minPivotDate = meta?.minPivotDate ? new Date(meta.minPivotDate) : null

    // Update with new pivot data only
    if (newPivotElement.pivot > maxPivot) {
        maxPivot = newPivotElement.pivot
        maxPivotDate = newPivotElement.time
    }
    if (newPivotElement.pivot < minPivot) {
        minPivot = newPivotElement.pivot
        minPivotDate = newPivotElement.time
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
    const newPivotCalcDays = signal.pivot_calc_days + 1
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
        Best Price: $${bestPrice.toFixed(2)}
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

// Create BullMQ Worker
export const signalPivotWorker = new Worker(
    "signalPivots",
    async (e) => {
        if (e.name === "dailyPivotUpdate") {
            try {
                // await 1 sec
                await new Promise((resolve) => setTimeout(resolve, 1000))
                console.log("\n ------------------------- 📊 Processing signal pivot update job:", e.id, " ------------------------- \n")

                // Fetch all incomplete signals where pivot_calc_days < 21
                const incompleteSignals = await prisma.signal.findMany({
                    where: {
                        isComplete: false,
                        pivot_calc_days: {
                            lt: 21,
                        },
                    },
                })

                console.log(`----------------------- PIVOT calculating JOB 📊:  Found ${incompleteSignals.length} incomplete signals to update ----------------------- \n`)
                const results: any[] = []
                // Update each signal sequentially
                for (const signal of incompleteSignals) {
                    try {
                        const result = await updateSignalPivots(signal)
                        results.push(result)
                    } catch (error) {
                        console.error(`❌ Error updating signal ${signal.id}:`, error , " \n")
                        results.push({
                            status: "error",
                            signalId: signal.id,
                            error: (error as Error).message,
                        })
                    }
                }

                return {
                    processed: incompleteSignals.length,
                    results,
                    timestamp: new Date(),
                }
            } catch (error) {
                console.error(
                    "❌ [BULLMQ] Error in daily signal pivot update job:",
                    error
                )
                throw error // Will trigger retry
            }
        }
    },
    {
        connection: connection,
        // limiter: {
        //     max: 100,
        //     duration: 60000 // 1 job per minute
        // }
    }
)

// Handle worker events
signalPivotWorker.on("completed", (job) => {
    console.log(
        `\n ✅ [BULLMQ] Daily signal pivot update job completed! - Job ${job.id} \n`
    )
})

signalPivotWorker.on("failed", (job, err) => {
    console.error(
        `\n ❌ [BULLMQ] Daily signal pivot update job failed! - Job ${job?.id}:`,
        err.message,
        "\n"
    )
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
                pattern: "35 14 * * *", // Cron: Every day at 14:35 AM,
                // pattern: "0 4 * * *", // Cron: Every day at 4:00 AM,
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

    console.log(
        "\n 📅 Signal pivot update job scheduled (Daily at 4:00 AM via BullMQ)\n"
    )

    // Trigger immediate signal pivot update on server startup
    // await signalPivotQueue.add("dailyPivotUpdate", {})

    // console.log("✅ Signal pivot update job triggered immediately")
}
