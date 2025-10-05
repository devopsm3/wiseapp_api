import { PlatformName, SignalTrend, SourcePost, SourcePrice, SourceStatus, User } from "@prisma/client"
// import { getTwitterChannelPosts } from "../twitter/twitter.provider"
// import { getTelegramChannelPosts } from "../../providers/telegram/telegram.provider"
import { coingeckoApiServiceMarket, getOHLC } from "../Coingecko/coingecko.provider"
import { coinImages } from "../Coingecko/constants"
import { formatDateTime } from "../../utils/global.helpers"
import { calculatePivot, calculatePnl } from "../signals/signals.helpers"
import { prisma } from "../../prisma"
import { SourcePostAnalysis, SourceType } from "./sources.types"


const createSource = async (channelInfo: SourceType, source: any, messages: any[], currentUser: User) => {
    try {
        if (!channelInfo) {
            return {
                status: false,
                message: "channel_not_found"
            }
        }
       
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
                const analysis = element.analysis as unknown as SourcePostAnalysis
                const postCreated = await prisma.sourcePost.create({
                    data: {
                        sourceId: newSource.id,
                        sourceType: channelInfo.platform_logo as PlatformName,
                        date: element.date,
                        timestamp: element.timestamp,
                        originalId: element.id,
                        mediaType: element.mediaType,
                        senderId: element.senderId,
                        text: element.text,
                        originalText: element.originalText,
                        analysis: element.analysis!,
                    }
                })
                if (analysis.type === "Signal" || analysis.type === "directSignal") {
        
                    const coinInfo = await coingeckoApiServiceMarket(analysis.token.toLowerCase())
                    if (coinInfo && coinInfo.length) {
                        const coinDetails= coinInfo[0]
                               
                        const currencyLogo = coinDetails.image || coinImages.altcoin
                               
                        const ohlc = await getOHLC(coinDetails.id, element.date!.toString())
                        const pivotLevels = calculatePivot(ohlc?.high || 0, ohlc?.low || 0, ohlc?.close || 0)
                        const entryPrice = analysis.entry_price || pivotLevels.pivot || 0
                        const targets = analysis?.target || []
                        const exitPrice =
                            analysis?.exit_price ??
                            (targets.length ? targets[targets.length - 1] : null)

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

export const createSourceService = async (channelInfo: SourceType, source: any, currentUser: User) => {
    try {
    
        const messages: SourcePost[] = [
            {
                id: 31,
                text: "SIGNAL #INJ #INJUSDT :  Buy now At or Under 12.74 Target1= 12.82 Target2= 13.01 Target3= 13.2  Stop Loss= 12.49  Quick signal We are going to hit a new #ATH very soon #SPOT #Crypto #Blockchain Take part of our wonderful family now, PM ME!",
                originalText: "SIGNAL #INJ #INJUSDT :\n" +
                    "\n" +
                    "▶ Buy now At or Under 12.74\n" +
                    "\n" +
                    "✅Target1= 12.82\n" +
                    "\n" +
                    "✅Target2= 13.01\n" +
                    "\n" +
                    "✅Target3= 13.2\n" +
                    "\n" +
                    "⛔ Stop Loss= 12.49\n" +
                    "\n" +
                    "⚠ Quick signal\n" +
                    "\n" +
                    "We are going to hit a new #ATH very soon\n" +
                    "\n" +
                    "#SPOT #Crypto #Blockchain\n" +
                    "\n" +
                    "Take part of our wonderful family now, PM ME!",
                timestamp: 1759506388,
                date: new Date("2025-10-03T15:46:28.000Z"),
                senderId: "-1002940466200",
                mediaType: "text",
                analysis: {
                    type: "Signal",
                    token: "BTC",
                    currency: "USDT",
                    direction: "bullish",
                    entry_price: 12.74,
                    exit_price: null,
                    target: [12.82, 13.01, 13.2],
                    stop_loss: 12.49,
                    leverage: null
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                sourceId: 0,
                sourceType: "X",
                originalId: 0
            },
            {
                id: 32,
                text: "SIGNAL #ICX #ICXUSDT :  Buy now At or Under 0.119 Target1= 0.1198 Target2= 0.1215 Target3= 0.1233  Stop Loss= 0.1167  Be patient Trust me y'all aren't ready for what's coming  #SPOT #Bitcoin #Blockchain Take part of our wonderful family now, PM ME!",
                originalText: "SIGNAL #ICX #ICXUSDT :\n" +
                    "\n" +
                    "▶ Buy now At or Under 0.119\n" +
                    "\n" +
                    "✅Target1= 0.1198\n" +
                    "\n" +
                    "✅Target2= 0.1215\n" +
                    "\n" +
                    "✅Target3= 0.1233\n" +
                    "\n" +
                    "⛔ Stop Loss= 0.1167\n" +
                    "\n" +
                    "⚠ Be patient\n" +
                    "\n" +
                    "Trust me y'all aren't ready for what's coming 👽\n" +
                    "\n" +
                    "#SPOT #Bitcoin #Blockchain\n" +
                    "\n" +
                    "Take part of our wonderful family now, PM ME!",
                timestamp: 1759506388,
                date: new Date("2025-10-03T15:46:28.000Z"),
                senderId: "-1002940466200",
                mediaType: "text",
                analysis: {
                    type: "Signal",
                    token: "ICX",
                    currency: "USDT",
                    direction: "bullish",
                    entry_price: 0.119,
                    exit_price: null,
                    target: [0.1198, 0.1215, 0.1233],
                    stop_loss: 0.1167,
                    leverage: null
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                sourceId: 0,
                sourceType: "X",
                originalId: 0
            }
        ]
        if (source.sourceType === PlatformName.TELEGRAM) {
            // const messages: SourcePost[] = await getTelegramChannelPosts(channelInfo?.user_id_source)        
            console.log(" 🚀   -->  messages TELEGRAM:", messages)
            return createSource(channelInfo, source, messages, currentUser)
        } else {
            // const messages: SourcePost[] = await getTwitterChannelPosts(channelInfo?.user_id_source)        
            console.log(" 🚀   -->  messages X:", messages)
            return createSource(channelInfo, source, messages, currentUser)
        }
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}