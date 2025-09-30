import { PlatformName, SignalTrend, SourcePost, SourcePrice, User } from "@prisma/client"
import { prisma } from "../../prisma"
import { collectChannelMessages, getChannelInfo } from "../../services/telegram/telegram.service"
import { ChannelInfo } from "../../models/models"

// get all sources
export const getSourcesService = async (currentUser: User) => {
    try {
        const sources = await prisma.source.findMany({
            where: {
                user_db_id: currentUser.id,
            },
        })
        const sourcesData = sources.map((source, index) => {
            return {
                index: index + 1,
                ...source,
                source_bearish_percentage: Number(source.source_bearish_percentage?.toFixed(2)),
                source_bullish_percentage: Number(source.source_bullish_percentage?.toFixed(2))
            }
        })
        return sourcesData
    } catch (error) {
        return error
    }
}

// get source by id
export const getSourceByIdService = async (id: number, currentUser: User) => {

    try {
        const source = await prisma.source.findUnique({
            where: {
                id: id,
                user_db_id: currentUser.id,
            },
        })
        return source
    } catch (error) {
        return error
    }
}

// add source
export const addSourceService = async (source: any, currentUser: User) => {

    try {
        // add wait 10 sec
        await new Promise((resolve) => setTimeout(resolve, 10000))
        if (source.sourceType === PlatformName.TELEGRAM) {
            const sourceExists = await prisma.source.findFirst({
                where: {
                    user_username_source: source.sourceId,
                },
            })
            if (sourceExists) {
                return {
                    status: false,
                    message: "source_already_exists"
                }
            }
            const { channelInfo }: { channelInfo: ChannelInfo | null } = await getChannelInfo(source.sourceId)
            if (!channelInfo) {
                return {
                    status: false,
                    message: "channel_not_found"
                }
            }
            const newSource = await prisma.source.create({
                data: {
                    ...channelInfo,
                    user_db_id: currentUser.id,
                    source_price: source.priceType === "free" ? SourcePrice.FREE : source.priceType === "monthly" ? SourcePrice.MONTHLY : SourcePrice.LIFETIME,
                    source_price_value: source.priceType === "free" ? null : source.priceType === "monthly" ? source.price.toString() : "lifetime/12",
                    price: source.priceType === "free" ? null : Number(source.price),
                    source_activated: true
                },
            })
            const messages: SourcePost[] = await collectChannelMessages(channelInfo?.user_id_source)
            // await prisma.sourcePost.createMany({
            //     data: messages.map((message) => ({
            //         sourceId: newSource.id,
            //         sourceType: PlatformName.TELEGRAM,
            //         date: message.date,
            //         timestamp: message.timestamp,
            //         originalId: message.id,
            //         mediaType: message.mediaType,
            //         senderId: message.senderId,
            //         text: message.text,
            //         analysis: message.analysis,
            //     })),
            // })


            console.log(" 🚀   -->  messages.length:", messages.length)
            for (let index = 0; index < messages.length; index++) {
                const element = messages[index]
                // const analysis = (element.analysis) as SourcePostAnalysis
                const analysis = element.analysis as any
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
                if (analysis.type === "Signal") {

                    console.log(" 🚀   -->  M:", element.text)
                    console.log(" 🚀   -->  A:", element.analysis)
                    // console.log(' 🚀   -->  analysis:', analysis)
                    console.log(" ")
                    console.log(" ")
                    // create signal from source
                    const generatedSignal = await prisma.signal.create({
                        data: {
                            user_db_id: currentUser.id,
                            source_post_id: postCreated.id,
                            signal_trend_level: analysis.direction === "bullish" ? "V100" : "R100",
                            signal_trend: analysis.direction === "bullish" ? SignalTrend.LONG : SignalTrend.SHORT,
                            currency_label: analysis.token,
                            currency_logo: analysis.token,
                            pnl1: 1,
                            status: "NEW",
                            time_frame: "11:12",
                            entry_timestamp: element.date,
                            entry_price: analysis.entry_price,
                            exit_price: analysis.exit_price,
                            pnl2: 2,
                            alignments: "test",
                            signal_type_id: "S." + postCreated.id,
                            // User: { connect: { id: Number(currentUser.id as BigInt) } }
                            // signal_type_id:''
                        }
                    })

                    console.log(" 🚀   -->  generatedSignal:", generatedSignal)
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
                status: true
            }
        } else {
            return {
                status: true
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

// update source
export const updateSourceByIdService = async (id: number, source: any) => {
    try {
        const updatedSource = await prisma.source.update({
            where: {
                id: id,
            },
            data: source,
        })
        return {
            status: true,
            updatedSource
        }
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}

// delete source
export const deleteSourceByIdService = async (id: number) => {
    try {
        const deletedSource = await prisma.source.delete({
            where: {
                id: id,
            },
        })
        return deletedSource
    } catch (error) {
        return error
    }
}
