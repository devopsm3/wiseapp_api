import { Queue, Worker } from "bullmq"
import connection from "../config/redis"
import { prisma } from "../prisma"
import { getOHLCVData } from "../providers/CoinMarketCap/coinmarketcap.provider"
import { PivotCalculationMeta, CoinMarketCapOHLC } from "../providers/CoinMarketCap/coinmarketcap.types"

// Create BullMQ Queue for signal pivot updates
export const signalPivotQueue = new Queue("signalPivots", {
    connection: connection
})

/**
 * Update a single incomplete signal with the next day's OHLCV data
 */
const updateSignalPivots = async (signal: any) => {
    const meta = signal.meta as PivotCalculationMeta
    const entryPrice = signal.entry_price
    const entryDate = new Date(signal.entry_timestamp)
    const direction = signal.signal_trend === "LONG" ? "LONG" : "SHORT"
    
    // Calculate the next day to fetch (entry_date + pivot_calc_days)
    const nextDayDate = new Date(entryDate)
    nextDayDate.setUTCDate(nextDayDate.getUTCDate() + signal.pivot_calc_days)
    
    // Don't fetch future data
    const today = new Date()
    if (nextDayDate > today) {
        console.log(`⏳ Signal ${signal.id} (${signal.currency_label}): Next day is in the future, skipping...`)
        return { status: "skipped", reason: "future_date" }
    }

    // Get coin ID from signal
    if (!signal.coin_id) {
        console.warn(`⚠️ Signal ${signal.id} (${signal.currency_label}): No coin_id found, skipping...`)
        return { status: "skipped", reason: "no_coin_id" }
    }
    
    console.log(`🔄 Updating Signal ${signal.id} (${signal.currency_label}): Day ${signal.pivot_calc_days + 1}/21`)
    
    // Fetch OHLCV data for the next day only
    const quotes = await getOHLCVData(
        signal.coin_id,
        nextDayDate,
        nextDayDate
    )

    if (!quotes || quotes.length === 0) {
        console.warn(`⚠️ No OHLCV data for ${signal.currency_label} on ${nextDayDate.toISOString()}`)
        return { status: "failed", reason: "no_data" }
    }

    // Get existing pivot data from meta
    const existingPivotData: CoinMarketCapOHLC[] = meta.pivotData || []
    
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
        pivot: pivot
    }

    // Add new pivot data
    const updatedPivotData = [...existingPivotData, newPivotElement]

    // Recalculate max and min from ALL pivot data
    let maxPivot = entryPrice
    let maxPivotDate: Date | null = null
    let minPivot = entryPrice
    let minPivotDate: Date | null = null

    for (const pivotPoint of updatedPivotData) {
        if (pivotPoint.pivot > maxPivot) {
            maxPivot = pivotPoint.pivot
            maxPivotDate = pivotPoint.time
        }
        if (pivotPoint.pivot < minPivot) {
            minPivot = pivotPoint.pivot
            minPivotDate = pivotPoint.time
        }
    }

    // Calculate theoretical profitability
    let theoreticalProfitAbsolute = 0
    let theoreticalProfitPercent = 0
    
    if (direction === "LONG") {
        if (maxPivot > entryPrice) {
            theoreticalProfitAbsolute = maxPivot - entryPrice
            theoreticalProfitPercent = ((maxPivot - entryPrice) / entryPrice) * 100
        } else {
            theoreticalProfitAbsolute = minPivot - entryPrice
            theoreticalProfitPercent = ((minPivot - entryPrice) / entryPrice) * 100
        }
    } else {
        if (minPivot < entryPrice) {
            theoreticalProfitAbsolute = entryPrice - minPivot
            theoreticalProfitPercent = ((entryPrice - minPivot) / entryPrice) * 100
        } else {
            theoreticalProfitAbsolute = -(maxPivot - entryPrice)
            theoreticalProfitPercent = -((maxPivot - entryPrice) / entryPrice) * 100
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
        pivotData: updatedPivotData
    }

    // Update signal in database
    await prisma.signal.update({
        where: { id: signal.id },
        data: {
            pivot_calc_days: newPivotCalcDays,
            isComplete,
            pnlA: theoreticalProfitAbsolute,
            pnlP: theoreticalProfitPercent,
            meta: updatedMeta as any,
            updated_at: new Date()
        }
    })

    const statusEmoji = isComplete ? "✅" : "⏳"
    const profitEmoji = theoreticalProfitPercent > 0 ? "📈" : "📉"
    console.log(`${statusEmoji} Signal ${signal.id} (${signal.currency_label}): Day ${newPivotCalcDays}/21
        ${profitEmoji} Profit: $${theoreticalProfitAbsolute.toFixed(2)} (${theoreticalProfitPercent > 0 ? "+" : ""}${theoreticalProfitPercent.toFixed(2)}%)
        Complete: ${isComplete ? "YES" : "NO"}`)

    return { 
        status: "success", 
        signalId: signal.id, 
        day: newPivotCalcDays, 
        isComplete,
        profit: theoreticalProfitPercent 
    }
}

// Create BullMQ Worker
export const signalPivotWorker = new Worker("signalPivots", async () => {
    console.log("🕐 [BULLMQ] Processing signal pivot update job...")
    
    try {
        // Fetch all incomplete signals where pivot_calc_days < 21
        const incompleteSignals = await prisma.signal.findMany({
            where: {
                isComplete: false,
                pivot_calc_days: {
                    lt: 21
                }
            }
        })

        console.log(`📊 Found ${incompleteSignals.length} incomplete signals to update`)

        const results = []
        // Update each signal sequentially
        for (const signal of incompleteSignals) {
            try {
                const result = await updateSignalPivots(signal)
                results.push(result)
            } catch (error) {
                console.error(`❌ Error updating signal ${signal.id}:`, error)
                results.push({ status: "error", signalId: signal.id, error: (error as Error).message })
            }
        }

        console.log("✅ [BULLMQ] Daily signal pivot update job completed!")
        return { 
            processed: incompleteSignals.length, 
            results,
            timestamp: new Date()
        }
    } catch (error) {
        console.error("❌ [BULLMQ] Error in daily signal pivot update job:", error)
        throw error // Will trigger retry
    }
}, {
    connection: connection,
    limiter: {
        max: 1,
        duration: 60000 // 1 job per minute
    }
})

// Handle worker events
signalPivotWorker.on("completed", (job) => {
    console.log(`✅ [BULLMQ] Job ${job.id} completed successfully`)
})

signalPivotWorker.on("failed", (job, err) => {
    console.error(`❌ [BULLMQ] Job ${job?.id} failed:`, err.message)
})

/**
 * Schedule recurring job to run daily at 1:00 AM
 */
export const scheduleSignalPivotUpdate = async () => {
    // Add repeatable job (runs daily at 1:00 AM)
    await signalPivotQueue.add(
        "dailyPivotUpdate",
        {},
        {
            repeat: {
                pattern: "23 17 * * *", // Cron: Every day at 1:00 AM
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

    console.log("✅ Signal pivot update job scheduled (Daily at 1:00 AM via BullMQ)")
}
