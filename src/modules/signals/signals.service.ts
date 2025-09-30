import { Signal, User } from "@prisma/client"
import { prisma } from "../../prisma"
import { coinImages } from "../../services/Coingecko/constants"
import { coingeckoApiServiceMarket } from "../../services/Coingecko/coingecko.api.service"
import { calculatePnl, calculateSignalTrendLevel } from "../../services/signals/calculs/libs"
import { formatDateTime, formatTimeFromNow } from "../../utils/libs"

export const getSignalsService = async (currentUser: User) => {
    try {
        const signals = await prisma.signal.findMany({
            where: {
                user_db_id: currentUser.id,
            },
        })
        const signalsData = signals.map((signal, index) => {
            return {
                index: index + 1,
                ...signal
            }
        })
        type signalFront = Partial<Signal> &
            { currency_logo: string, pnlAbsolute: number | null, pnlPercent: number | null, timeFromNow: string, readableDate: string }
        const signalsInfo: signalFront[] = []

        for (let i = 0; i < signalsData.length; i++) {

            const coinInfo = await coingeckoApiServiceMarket(signalsData[i].currency_label.toLowerCase())
            const signal = signalsData[i]
            const currencyLabel = signal.currency_label.toLowerCase() as keyof typeof coinImages
            const currencyLogo = coinImages[currencyLabel] || coinImages.altcoin
            if (coinInfo && coinInfo.length && signal.entry_price) {
                const entryPrice = signal.entry_price?.toNumber() || 0
                const exitPrice = signal.exit_price?.toNumber() || 0
                const amount = 1 // Question
                // const fees = 0 // Question

                const {pnlAbsolute, pnlPercent} = calculatePnl({
                    currentPrice: coinInfo[0].current_price,
                    entryPrice,
                    exitPrice,
                    direction: signal.signal_trend,
                    leverage: undefined,
                    quantity: amount,
                    status: signal.status,
                })
                
                signalsInfo.push({
                    ...signal,
                    currency_logo: currencyLogo,
                    pnlAbsolute: pnlAbsolute,
                    pnlPercent: pnlPercent,
                    timeFromNow: signal.entry_timestamp ? formatTimeFromNow(signal.entry_timestamp) : "",
                    readableDate: signal.entry_timestamp ? formatDateTime(signal.entry_timestamp) : "",
                    signal_trend_level: calculateSignalTrendLevel(i, signal.signal_trend),
                })
            }
        }
        // const signals2 = await prisma.sourcePost.findMany({
        //     where: {
        //         analysis: {
        //             path: "$.type",
        //             equals: "PreSignal",
        //         },
        //     },
        // })
        return signalsInfo
    } catch (error) {

        console.log(" 🚀   -->  error:", error)
        return error
    }
}

// get signal by id
export const getSignalByIdService = async (id: number, currentUser: User) => {
    try {
        const signal = await prisma.signal.findUnique({
            where: {
                id: id,
                user_db_id: currentUser.id,
            },
        })
        return signal
    } catch (error) {
        return error
    }
}