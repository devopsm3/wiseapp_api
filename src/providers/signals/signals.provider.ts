import { SignalStatus, SignalTrend } from "@prisma/client"
import { prisma } from "../../prisma"
import { PivotCalculationMeta } from "../CoinMarketCap/coinmarketcap.types"


export const checkExistedSignalWithinTimeHorizon = async (currentUserId: number, analysis: { direction: "LONG" | "SHORT"; token: string }, status: SignalStatus) => {
    
    // let timeframe_for_meta_signals_hours = 21
    
    // const setup = await prisma.setup.findFirst({
    //     where: {
    //         user_db_id: currentUserId,
    //     },
    // })
    // if (setup) {
    //     timeframe_for_meta_signals_hours = (setup?.meta_signals as unknown as MetaSignalSetup)?.timeframe_for_meta_signals
    // }

    // const now = new Date()
    // const timeframe_for_meta_signals_ago = new Date(now)
    // timeframe_for_meta_signals_ago.setUTCDate(now.getUTCDate() - (timeframe_for_meta_signals_hours))
    // timeframe_for_meta_signals_ago.setUTCHours(0, 0, 0, 0)

    const trend = analysis.direction === "LONG" ? SignalTrend.LONG : SignalTrend.SHORT

    const existingSignal = await prisma.signal.findFirst({
        where: {
            user_db_id: currentUserId,
            status,
            currency_label: analysis.token,
            signal_trend: trend
            // entry_timestamp: {
            //     gte: timeframe_for_meta_signals_ago,
            // },
        }
    })   
    return { existingSignal }
}

interface CreateOrUpdateSignalProps {
    analysis: { direction: "LONG" | "SHORT"; token: string; token_id: string };
    coinId: number;
    newSourceId: number;
    postCreatedId: number;
    currentUserId: number;
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
    currentUserId,
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
    let timeframe_for_meta_signals_hours = 21
    
    const now = new Date()
    const twentyOneDaysAgo = new Date(now)
    twentyOneDaysAgo.setUTCDate(now.getUTCDate() - timeframe_for_meta_signals_hours)
    twentyOneDaysAgo.setUTCHours(0, 0, 0, 0)
    
    const status =  entryTimestamp.getTime() >= twentyOneDaysAgo.getTime() ? "NEW" : "PASSED"

    // const { existingSignal } = await checkExistedSignalWithinTimeHorizon(currentUserId, analysis, status)
    const existingSignal = false

    if (existingSignal) {
        console.log(" ------------------ Updating existing signal ------------------")
        // const existingSignalSourceIds = JSON.parse(existingSignal.sourceIds || "[]")
        // const isIncluded = Array.isArray(existingSignalSourceIds) && existingSignalSourceIds.includes(Number(newSourceId))
        // if (!isIncluded) {
        //     const alignmentPostsForMetaSignals = (setup?.meta_signals as unknown as MetaSignalSetup)?.alignment_posts_for_meta_signals || 3
        //     const signalTrendLevel = getSignalTrendLevel(analysis.direction, existingSignal.sources_nbr || 1, alignmentPostsForMetaSignals)
        //     await prisma.signal.update({
        //         where: { id: existingSignal.id },
        //         data: {
        //             sources_nbr: { increment: 1 },
        //             signal_trend_level: signalTrendLevel,
        //             sourceIds: JSON.stringify([...existingSignalSourceIds, Number(newSourceId)]),
        //             updated_at: new Date()
        //         }
        //     })
        // }
        console.log(
            `Updated existing signal for ${analysis.token} (${analysis.direction}) - incremented sources_nbr.`
        )
        return existingSignal
    } else {
        console.log(" ------------------ Creating new signal ------------------")
        const newSignal = await prisma.signal.create({
            data: {
                sourceId: newSourceId,
                sourceIds: JSON.stringify([newSourceId]),
                user_db_id: currentUserId,
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

        console.log(`Created new signal for ${analysis.token} (${analysis.direction})`)
        return newSignal
    }
}
