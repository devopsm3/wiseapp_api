import { User } from "@prisma/client"
import { prisma } from "../../prisma"
import { coinImages } from "../../providers/Coingecko/constants"
import { coingeckoApiServiceMarket } from "../../providers/Coingecko/coingecko.provider"
import { calculatePnl, calculateSignalTrendLevel } from "../../providers/signals/signals.helpers"
import { formatDateTime, formatTimeFromNow } from "../../utils/global.helpers"
import { getFilteredSignals } from "../../providers/signals/signals.helpers"
import { signalFront } from "../../providers/signals/signals.types"

export const getSignalsService = async (currentUser: User) => {
    try {
        const signalsData = await prisma.signal.findMany({
            where: {
                user_db_id: currentUser.id,
            },
            include: {
                Source: {
                    select: {
                        platform_logo: true,
                    }
                }
            }
        })

        const setup = await prisma.setup.findFirst({
            where: {
                user_db_id: currentUser.id,
            },
        })

        let filteredSignals = signalsData
        if (setup) {
            filteredSignals = getFilteredSignals(signalsData, setup)
        }
        
        const signalsInfo: signalFront[] = []
        for (let i = 0; i < filteredSignals.length; i++) {
            const signal = filteredSignals[i]
            const coinInfo = await coingeckoApiServiceMarket(signal.currency_label.toLowerCase())
            if (coinInfo && coinInfo.length) {
                const currencyLabel = signal.currency_label.toLowerCase() as keyof typeof coinImages
                const currencyLogo = coinImages[currencyLabel] || coinInfo[0].image || coinImages.altcoin
                const entryPrice = signal.entry_price?.toNumber() || coinInfo[0].current_price || 0
                const exitPrice = signal.exit_price?.toNumber() || 0
                const amount = 1 // Question
                // const fees = 0 // Question

                const { pnlAbsolute, pnlPercent } = calculatePnl({
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
                })
            }
        }
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
            include: {
                Source: {
                    select: {
                        platform_logo: true,
                    }
                }
            }
        })
        if (!signal) {
            return null
        }
        const coinInfo = await coingeckoApiServiceMarket(signal.currency_label.toLowerCase())
        if (coinInfo && coinInfo.length && signal.entry_price) {
            const currencyLabel = signal.currency_label.toLowerCase() as keyof typeof coinImages
            const currencyLogo = coinImages[currencyLabel] || coinInfo[0].image || coinImages.altcoin
            const entryPrice = signal.entry_price?.toNumber() || coinInfo[0].current_price || 0
            const exitPrice = signal.exit_price?.toNumber() || 0
            const amount = 1 // Question
            // const fees = 0 // Question

            const { pnlAbsolute, pnlPercent } = calculatePnl({
                currentPrice: coinInfo[0].current_price,
                entryPrice,
                exitPrice,
                direction: signal.signal_trend,
                leverage: undefined,
                quantity: amount,
                status: signal.status,
            })

            return {
                ...signal,
                currency_logo: currencyLogo,
                pnlAbsolute: pnlAbsolute,
                pnlPercent: pnlPercent,
                timeFromNow: signal.entry_timestamp ? formatTimeFromNow(signal.entry_timestamp) : "",
                readableDate: signal.entry_timestamp ? formatDateTime(signal.entry_timestamp) : "",
                signal_trend_level: calculateSignalTrendLevel(2, signal.signal_trend),
            }
        }
        return null
    } catch (error) {
        return error
    }
}