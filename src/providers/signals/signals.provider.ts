import { SignalTrend } from "@prisma/client"
import { prisma } from "../../prisma"
import { PivotCalculationMeta } from "../CoinMarketCap/coinmarketcap.types"


export const checkExistedSignalWithinTimeHorizon = async (analysis: { direction: "LONG" | "SHORT"; token: string }, hours: number) => {
    const trend = analysis.direction === "LONG" ? SignalTrend.LONG : SignalTrend.SHORT
    const minTimestamp = new Date()
    minTimestamp.setHours(minTimestamp.getHours() - hours)

    const existingSignal = await prisma.signal.findFirst({
        where: {
            currency_label: analysis.token,
            signal_trend: trend,
            entry_timestamp: {
                gte: minTimestamp,
            },
            status: {
                in: ["NEW", "OPEN"]
            }
        }
    })
    return existingSignal
}

interface CreateOrUpdateSignalProps {
    analysis: { direction: "LONG" | "SHORT"; token: string; token_id: string };
    coinId: number;
    newSourceId: number;
    postCreatedId: number;
    currencyLogo: string;
    pnlAbsolute?: any;
    pnlPercent?: any;
    entryPrice?: any;
    exitPrice?: any;
    isComplete?: boolean;
    entryTimestamp: Date;
    pivotCalcDays?: number;
    meta?: PivotCalculationMeta;
}
export const createOrUpdateSignal = async ({
    analysis,
    coinId,
    newSourceId,
    postCreatedId,
    currencyLogo,
    pnlAbsolute,
    pnlPercent,
    entryPrice,
    exitPrice,
    entryTimestamp,
    pivotCalcDays,
    meta,
    isComplete
}: CreateOrUpdateSignalProps) => {
    // 1. Check if signal already exists for this exact source post
    const existingSignalPost = await prisma.signal.findUnique({
        where: {
            sourceId_source_post_id: {
                sourceId: newSourceId,
                source_post_id: postCreatedId
            }
        }
    })

    if (existingSignalPost) {
        console.log(`\n --------------- Signal already exists for post ${postCreatedId} from source ${newSourceId} --------------- \n`)
        return existingSignalPost
    }

    // 2. Surveillance Alignments: Check for identical ACTIVE signals within timeframe (default 72h)
    // We use 72h as per default metasignal_time_window in GlobalSettings
    const timeframeHours = 72
    const identicalSignal = await checkExistedSignalWithinTimeHorizon(analysis, timeframeHours)

    if (identicalSignal && identicalSignal.status !== "PASSED" && identicalSignal.status !== "CLOSED") {
        console.log(`\n --------------- Surveillance Alignments: Merging signal for ${analysis.token} into existing signal ${identicalSignal.id} --------------- \n`)
        
        const sourceIds: number[] = JSON.parse(identicalSignal.sourceIds || "[]")
        if (!sourceIds.includes(newSourceId)) {
            sourceIds.push(newSourceId)
        }

        const updatedSignal = await prisma.signal.update({
            where: { id: identicalSignal.id },
            data: {
                sourceIds: JSON.stringify(sourceIds),
                sources_nbr: sourceIds.length,
                // Update latest update time
                updated_at: new Date()
            }
        })
        return updatedSignal
    }

    // 3. If no duplicate, create new signal
    let timeframe_for_status_hours = 21 // This is for PASSED vs NEW
    const now = new Date()
    const twentyOneDaysAgo = new Date(now)
    twentyOneDaysAgo.setUTCDate(now.getUTCDate() - timeframe_for_status_hours)
    twentyOneDaysAgo.setUTCHours(0, 0, 0, 0)
    
    const status = entryTimestamp.getTime() >= twentyOneDaysAgo.getTime() ? "NEW" : "PASSED"

    const newSignal = await prisma.signal.create({
        data: {
            sourceId: newSourceId,
            sourceIds: JSON.stringify([newSourceId]),
            source_post_id: postCreatedId,
            signal_trend_level: analysis.direction === "LONG" ? "VTC" : "RTC",
            signal_trend: analysis.direction === "LONG" ? SignalTrend.LONG : SignalTrend.SHORT,
            currency_label: analysis.token,
            currency_logo: currencyLogo,
            status,
            pnlA: pnlAbsolute,
            pnlP: pnlPercent,
            entry_timestamp: entryTimestamp,
            entry_price: entryPrice,
            exit_price: exitPrice,
            sources_nbr: 1,
            coin_id: coinId,
            meta: meta as any,
            isComplete,
            pivot_calc_days: pivotCalcDays,
            ai_price_trace_analysis: ""
        }
    })

    console.log(` \n --------------- Created new signal for ${analysis.token} (${analysis.direction}) --------------- \n`)
    return newSignal
}
