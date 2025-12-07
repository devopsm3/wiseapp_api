import { PlatformName, SourcePost, SourcePrice, SourceStatus, User } from "@prisma/client"
import { coingeckoApiServiceMarket } from "../Coingecko/coingecko.provider"
import { coinImages } from "../Coingecko/constants"
import { normalizeToken } from "../signals/signals.helpers"
import { prisma } from "../../prisma"
import { SourcePostAnalysis, SourceType } from "./sources.types"
import { getTelegramChannelPosts } from "../telegram/telegram.provider"
import { getTwitterChannelPosts } from "../twitter/twitter.provider"
import { createOrUpdateSignal } from "../signals/signals.provider"


const createSource = async (channelInfo: SourceType, source: any, messages: any[], currentUser: User) => {
    try {
        if (!channelInfo) {
            return {
                status: false,
                message: source.sourceType === PlatformName.TELEGRAM
                    ? `Telegram channel '${source.sourceId}' could not be found or is inaccessible.`
                    : `User '${source.sourceId}' could not be found or the profile is unavailable.`
            }
        }

        if (!messages.length) {
            return {
                status: false,
                message: `No valid signals detected for the source '${source.sourceId}'`
            }
        }
        const signalsPosts = messages.filter((m) => m.analysis.type === "Signal" || m.analysis.type === "directSignal")
        if (!signalsPosts.length) {
            return {
                status: false, 
                message: `No valid signals detected for the source '${source.sourceId}'`
            }
        }
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
        const verifiedPosts: any[] = []
        for (let index = 0; index < signalsPosts.length; index++) {
            const element = signalsPosts[index]
            const analysis = element.analysis as unknown as SourcePostAnalysis

            if (analysis?.token && analysis?.type === "Signal") {
                const normalizedToken = normalizeToken(analysis.token)
                const coinInfo = await coingeckoApiServiceMarket(normalizedToken)
                if (coinInfo.length) {
                    const coinDetails = coinInfo[0]
                    const postCreated = await prisma.sourcePost.create({
                        data: {
                            sourceId: newSource.id,
                            sourceType: channelInfo.platform_logo as PlatformName,
                            date: element.date,
                            timestamp: element.timestamp,
                            originalId: Number(element.id),
                            mediaType: element.mediaType,
                            senderId: element.senderId,
                            text: element.text,
                            originalText: element.originalText,
                            analysis: element.analysis!,
                        }
                    })
                    const currencyLogo = coinDetails.image || coinImages.altcoin
                    const targetDate = new Date(element.date!)
                    // const ohlc = await getOHLC(coinDetails.id, targetDate)
                    await createOrUpdateSignal({
                        analysis: {
                            direction: analysis.direction!,
                            token: normalizedToken.toUpperCase(),
                            token_id: coinDetails.id,
                        },
                        newSourceId: newSource.id,
                        postCreatedId: postCreated.id,
                        currentUserId: currentUser.id,
                        currencyLogo,
                        pnlAbsolute: 0,
                        pnlPercent: 0,
                        entryPrice: 0,
                        exitPrice: null,
                        entryTimestamp: new Date(element.date!),
                    })
                    verifiedPosts.push(postCreated.id)
                } else {
                    console.log(`Token ${analysis.token} not found in Coingecko API`)
                }   
            } else {
                console.log(`Token ${analysis.token} not found in Coingecko API`)
            }   
        }
        if (!verifiedPosts.length) {
            await prisma.source.delete({
                where: { id: newSource.id },
            })
            return {
                status: false,
                message: `No valid signals detected for the source '${source.sourceId}'`
            }
        }
        // save last message id
        const metadata = newSource?.metadata as any
        metadata.last_message_id = messages[messages.length - 1].id

        const btc_total_quantity = messages.filter((m) => normalizeToken((m.analysis as any).token) === "BTC").length || 0
        const eth_total_quantity = messages.filter((m) => normalizeToken((m.analysis as any).token) === "ETH").length || 0
        const sol_total_quantity = messages.filter((m) => normalizeToken((m.analysis as any).token) === "SOL").length || 0
        const alts_total_quantity = messages.filter(
            (m) =>
                normalizeToken((m.analysis as any).token) &&
                normalizeToken((m.analysis as any).token) !== "BTC" &&
                normalizeToken((m.analysis as any).token) !== "ETH" &&
                normalizeToken((m.analysis as any).token) !== "SOL"
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

        // const messages: SourcePost[] = [
        //     {
        //         id: 31,
        //         text: "SIGNAL #INJ #INJUSDT :  Buy now At or Under 12.74 Target1= 12.82 Target2= 13.01 Target3= 13.2  Stop Loss= 12.49  Quick signal We are going to hit a new #ATH very soon #SPOT #Crypto #Blockchain Take part of our wonderful family now, PM ME!",
        //         originalText: "SIGNAL #INJ #INJUSDT :\n" +
        //             "\n" +
        //             "▶ Buy now At or Under 12.74\n" +
        //             "\n" +
        //             "✅Target1= 12.82\n" +
        //             "\n" +
        //             "✅Target2= 13.01\n" +
        //             "\n" +
        //             "✅Target3= 13.2\n" +
        //             "\n" +
        //             "⛔ Stop Loss= 12.49\n" +
        //             "\n" +
        //             "⚠ Quick signal\n" +
        //             "\n" +
        //             "We are going to hit a new #ATH very soon\n" +
        //             "\n" +
        //             "#SPOT #Crypto #Blockchain\n" +
        //             "\n" +
        //             "Take part of our wonderful family now, PM ME!",
        //         timestamp: 1759506388,
        //         date: new Date("2025-10-03T15:46:28.000Z"),
        //         senderId: "-1002940466200",
        //         mediaType: "text",
        //         analysis: {
        //             type: "Signal",
        //             token: "BTC",
        //             currency: "USDT",
        //             direction: "bullish",
        //             entry_price: 12.74,
        //             exit_price: null,
        //             target: [12.82, 13.01, 13.2],
        //             stop_loss: 12.49,
        //             leverage: null
        //         },
        //         createdAt: new Date(),
        //         updatedAt: new Date(),
        //         sourceId: 0,
        //         sourceType: "X",
        //         originalId: 0
        //     },
        //     {
        //         id: 32,
        //         text: "SIGNAL #ICX #ICXUSDT :  Buy now At or Under 0.119 Target1= 0.1198 Target2= 0.1215 Target3= 0.1233  Stop Loss= 0.1167  Be patient Trust me y'all aren't ready for what's coming  #SPOT #Bitcoin #Blockchain Take part of our wonderful family now, PM ME!",
        //         originalText: "SIGNAL #ICX #ICXUSDT :\n" +
        //             "\n" +
        //             "▶ Buy now At or Under 0.119\n" +
        //             "\n" +
        //             "✅Target1= 0.1198\n" +
        //             "\n" +
        //             "✅Target2= 0.1215\n" +
        //             "\n" +
        //             "✅Target3= 0.1233\n" +
        //             "\n" +
        //             "⛔ Stop Loss= 0.1167\n" +
        //             "\n" +
        //             "⚠ Be patient\n" +
        //             "\n" +
        //             "Trust me y'all aren't ready for what's coming 👽\n" +
        //             "\n" +
        //             "#SPOT #Bitcoin #Blockchain\n" +
        //             "\n" +
        //             "Take part of our wonderful family now, PM ME!",
        //         timestamp: 1759506388,
        //         date: new Date("2025-10-03T15:46:28.000Z"),
        //         senderId: "-1002940466200",
        //         mediaType: "text",
        //         analysis: {
        //             type: "Signal",
        //             token: "ICX",
        //             currency: "USDT",
        //             direction: "bullish",
        //             entry_price: 0.119,
        //             exit_price: null,
        //             target: [0.1198, 0.1215, 0.1233],
        //             stop_loss: 0.1167,
        //             leverage: null
        //         },
        //         createdAt: new Date(),
        //         updatedAt: new Date(),
        //         sourceId: 0,
        //         sourceType: "X",
        //         originalId: 0
        //     }
        // ]
        // let messages: any[] = []
        let messages: SourcePost[] = []
        if (source.sourceType === PlatformName.TELEGRAM) {
            messages = await getTelegramChannelPosts(channelInfo?.user_id_source)
        } else {
            messages = await getTwitterChannelPosts(channelInfo?.user_id_source)
        }
        return createSource(channelInfo, source, messages, currentUser)
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}