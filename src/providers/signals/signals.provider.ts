import { SignalTrend } from "@prisma/client"
import { prisma } from "../../prisma"
import { PivotCalculationMeta } from "../CoinMarketCap/coinmarketcap.types"


// export const checkExistedSignalWithinTimeHorizon = async (currentUserId: number, analysis: { direction: "LONG" | "SHORT"; token: string }, status: SignalStatus) => {
    
//     // let timeframe_for_meta_signals_hours = 21
    
//     // const setup = await prisma.setup.findFirst({
//     //     where: {
//     //         user_db_id: currentUserId,
//     //     },
//     // })
//     // if (setup) {
//     //     timeframe_for_meta_signals_hours = (setup?.meta_signals as unknown as MetaSignalSetup)?.timeframe_for_meta_signals
//     // }

//     // const now = new Date()
//     // const timeframe_for_meta_signals_ago = new Date(now)
//     // timeframe_for_meta_signals_ago.setUTCDate(now.getUTCDate() - (timeframe_for_meta_signals_hours))
//     // timeframe_for_meta_signals_ago.setUTCHours(0, 0, 0, 0)

//     const trend = analysis.direction === "LONG" ? SignalTrend.LONG : SignalTrend.SHORT

//     const existingSignal = await prisma.signal.findFirst({
//         where: {
//             // user_db_id: currentUserId,
//             status,
//             currency_label: analysis.token,
//             signal_trend: trend
//             // entry_timestamp: {
//             //     gte: timeframe_for_meta_signals_ago,
//             // },
//         }
//     })   
//     return { existingSignal }
// }

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
    let timeframe_for_meta_signals_hours = 21
    
    const now = new Date()
    const twentyOneDaysAgo = new Date(now)
    twentyOneDaysAgo.setUTCDate(now.getUTCDate() - timeframe_for_meta_signals_hours)
    twentyOneDaysAgo.setUTCHours(0, 0, 0, 0)
    
    const status =  entryTimestamp.getTime() >= twentyOneDaysAgo.getTime() ? "NEW" : "PASSED"

    // Check if signal already exists for this source post
    const existingSignal = await prisma.signal.findUnique({
        where: {
            sourceId_source_post_id: {
                sourceId: newSourceId,
                source_post_id: postCreatedId
            }
        }
    })

    if (existingSignal) {
        console.log(" ------------------ Signal already exists ------------------")
        console.log(
            `Signal already exists for ${analysis.token} (${analysis.direction}) from source ${newSourceId}`
        )
        return existingSignal
    } else {
        console.log(" ------------------ Creating new signal ------------------")
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

        console.log(`Created new signal for ${analysis.token} (${analysis.direction})`)
        return newSignal
    }
}
