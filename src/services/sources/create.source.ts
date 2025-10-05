import { PlatformName, SignalTrend, SourcePost, SourcePrice, SourceStatus, User } from "@prisma/client"
import { collectChannelPosts } from "../../services/telegram/telegram.service"
import { ChannelInfo, SourcePostAnalysis } from "../../models/models"
import { coingeckoApiServiceMarket, getOHLC } from "../../services/Coingecko/coingecko.api.service"
import { coinImages } from "../../services/Coingecko/constants"
import { formatDateTime } from "../../utils/libs"
import { calculatePivot, calculatePnl } from "../../services/signals/calculs/libs"
import { prisma } from "../../prisma"


const createTelegramSource = async (channelInfo: ChannelInfo, source: any, currentUser: User) => {
    try {
    // const { channelInfo }: { channelInfo: ChannelInfo | null } = await getChannelInfo(source.sourceId)
        if (!channelInfo) {
            return {
                status: false,
                message: "channel_not_found"
            }
        }
       
        // const messages: any[] = []
        const messages: SourcePost[] = await collectChannelPosts(channelInfo?.user_id_source)        
        if(messages.length) {
            const newSource = await prisma.source.create({
                data: {
                    ...channelInfo,
                    user_db_id: currentUser.id,
                    source_price: source.priceType === "free" ? SourcePrice.FREE : source.priceType === "monthly" ? SourcePrice.MONTHLY : SourcePrice.LIFETIME,
                    source_price_value: source.priceType === "free" ? null : source.priceType === "monthly" ? source.price.toString() : "lifetime/12",
                    price: source.priceType === "free" ? null : Number(source.price),
                    source_activated: true,
                    btc_total_quantity: 0,
                    eth_total_quantity: 0,
                    sol_total_quantity: 0,
                    alts_total_quantity: 0,
                },
            })
            for (let index = 0; index < messages.length; index++) {
                const element = messages[index]
                console.log(" 🚀   -->  element:", element)
                const analysis = element.analysis as unknown as SourcePostAnalysis

                // const analysis = element.analysis as any
                const postCreated = await prisma.sourcePost.create({
                    data: {
                        sourceId: newSource.id,
                        sourceType: PlatformName.TELEGRAM,
                        date: element.date,
                        timestamp: element.timestamp,
                        originalId: element.id,
                        mediaType: element.mediaType,
                        senderId: element.senderId,
                        text: element.text,
                        analysis: element.analysis!,
                    }
                })
                if (analysis.type === "Signal" || analysis.type === "directSignal") {
        
                    // create signal from source
                    const coinInfo = await coingeckoApiServiceMarket(analysis.token.toLowerCase())
                    if (coinInfo && coinInfo.length) {
                        const coinDetails= coinInfo[0]
                               
                        const currencyLogo = coinDetails.image || coinImages.altcoin
                               
                        const ohlc = await getOHLC(coinDetails.id, element.date!.toString())
                        const pivotLevels = calculatePivot(ohlc?.high || 0, ohlc?.low || 0, ohlc?.close || 0)
                        const entryPrice = analysis.entry_price || pivotLevels.pivot || 0
                        const exitPrice = analysis.exit_price || null
                        const { pnlAbsolute, pnlPercent } = calculatePnl({
                            currentPrice: coinDetails.current_price,
                            entryPrice,
                            exitPrice,
                            direction: analysis.direction === "bullish" ? SignalTrend.LONG : SignalTrend.SHORT,
                            leverage: undefined,
                            quantity: 1,
                            status: "NEW",
                        })
                        await prisma.signal.create({
                            data: {
                                sourceId: newSource.id,
                                user_db_id: currentUser.id,
                                source_post_id: postCreated.id,
                                signal_trend_level: analysis.direction === "bullish" ? "VTC" : "RTC", // for now
                                signal_trend: analysis.direction === "bullish" ? SignalTrend.LONG : SignalTrend.SHORT,
                                currency_label: analysis.token,
                                currency_logo: currencyLogo,
                                status: "NEW",
                                    
                                pnlA: pnlAbsolute, // for now
                                time_frame: formatDateTime(element.date!), // for now
                                entry_timestamp: element.date!,
                                entry_price: entryPrice,
                                exit_price: exitPrice,
                                pnlP: pnlPercent,
                                sources_nbr: 1, // for now
                            }
                        })
                    }
                }
        
            }
        
            // save last message id
            const metadata = newSource?.metadata as any
            metadata.last_message_id = messages[messages.length - 1].id
        
            const btc_total_quantity = messages.filter((m) => (m.analysis as any).token?.includes("BTC")).length || 0
            const eth_total_quantity = messages.filter((m) => (m.analysis as any).token?.includes("ETH")).length || 0
            const sol_total_quantity = messages.filter((m) => (m.analysis as any).token?.includes("SOL")).length || 0
            const alts_total_quantity = messages.filter(
                (m) =>
                    (m.analysis as any).token &&
                            (m.analysis as any).token !== "BTC" &&
                            (m.analysis as any).token !== "ETH" &&
                            (m.analysis as any).token !== "SOL"
            ).length || 0
            await prisma.source.update({
                where: {
                    id: newSource.id,
                },
                data: {
                    source_status: SourceStatus.VALIDE,
                    metadata: metadata,
                    source_total_quantity_signals: messages.length,
                    source_global_probility: 0, // after trade
        
                    source_bullish_total_quantity: messages.filter((m) => (m.analysis as any)?.direction === "bullish").length || 0,
                    source_bullish_percentage: (messages.filter((m) => (m.analysis as any)?.direction === "bullish").length / messages.length) * 100 || 0,
                    source_bullish_probility: 0, // after trade
        
                    source_bearish_total_quantity: messages.filter((m) => (m.analysis as any)?.direction === "bearish").length || 0,
                    source_bearish_percentage: (messages.filter((m) => (m.analysis as any)?.direction === "bearish").length / messages.length) * 100 || 0,
                    source_bearish_probility: 0, // after trade
        
                    btc_total_quantity: btc_total_quantity,
                    btc_probility: 0, // after trade
        
                    eth_total_quantity: eth_total_quantity,
                    eth_probility: 0, // after trade
        
                    sol_total_quantity: sol_total_quantity,
                    sol_probility: 0, // after trade
        
                    alts_total_quantity: alts_total_quantity,
                    alts_probility: 0, // after trade
                },
            })
            return {
                status: true,
                id: newSource.user_username_source
            }
        } else {
            return {
                status: false,
                message: "Source is invalid"
            }
        }
    } catch (error: any) {

        console.log(" 🚀   -->  error:", error)
        return {
            status: false,
            message: error.message
        }
    }
}

export const createSourceService = async (channelInfo: ChannelInfo, source: any, currentUser: User) => {
    try {
    
        if (source.sourceType === PlatformName.TELEGRAM) {
            return createTelegramSource(channelInfo, source, currentUser)
        } else {
            return {
                status: true
            }
        }
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}