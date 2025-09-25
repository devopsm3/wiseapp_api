import { PlatformName, Source, SourcePrice } from "@prisma/client"
import { prisma } from "../../prisma"
import { collectChannelMessages, getChannelInfo } from "../../services/telegram/telegram.service"
import { ChannelInfo } from "../../models/models"

// get all sources
export const getSourcesService = async () => {
    try {
        const sources = await prisma.source.findMany()
        const sourcesData = sources.map((source, index) => {
            return {
                index: index + 1,
                ...source
            }
        })
        return sourcesData
    } catch (error) {
        return error
    }
}

// get source by id
export const getSourceByIdService = async (id: number) => {
    try {
        const source = await prisma.source.findUnique({
            where: {
                id: id,
            },
        })
        return source
    } catch (error) {
        return error
    }
}

// add source
export const addSourceService = async (source: any) => {

    try {
        // sleep 3sec
        // await new Promise((resolve) => setTimeout(resolve, 3000));
        if (source.sourceType === PlatformName.TELEGRAM) {
            const { channelInfo }: { channelInfo: ChannelInfo | null } = await getChannelInfo(source.sourceId)
            if (!channelInfo) {
                return {
                    status: false,
                    message: "channel_not_found"
                }
            }
            const sourceExists = await prisma.source.findFirst({
                where: {
                    user_id_source: channelInfo?.user_id_source,
                },
            })
            if (sourceExists) {
                return {
                    status: false,
                    message: "source_already_exists"
                }
            }
            const newSource = await prisma.source.create({
                data: {
                    ...channelInfo,
                    source_price: source.priceType === "free" ? SourcePrice.FREE : source.priceType === "monthly" ? SourcePrice.MONTHLY : SourcePrice.LIFETIME,
                    source_price_value: source.priceType === "free" ? null : source.priceType === "monthly" ? source.price.toString() : 'lifetime/12',
                    price: source.priceType === "free" ? null : Number(source.price),
                    source_activated: true
                },
            })
            const messages = await collectChannelMessages(channelInfo?.user_id_source)
            await prisma.sourcePost.createMany({
                data: messages.map((message) => ({
                    sourceId: newSource.id,
                    sourceType: PlatformName.TELEGRAM,
                    date: message.date,
                    timestamp: message.timestamp,
                    originalId: message.id,
                    mediaType: message.mediaType,
                    senderId: message.senderId,
                    text: message.text,
                    analysis: message.analysis,
                })),
            })

            // save last message id
            const metadata = newSource?.metadata as any;
            metadata.last_message_id = messages[messages.length - 1].id;

            const btc_total_quantity = messages.filter((m) => m.analysis?.token.includes("BTC")).length || 0;
            const eth_total_quantity = messages.filter((m) => m.analysis?.token.includes("ETH")).length || 0;
            const sol_total_quantity = messages.filter((m) => m.analysis?.token.includes("SOL")).length || 0;
            const alts_total_quantity = messages.filter(
                (m) =>
                    m.analysis?.token &&
                    m.analysis.token !== "BTC" &&
                    m.analysis.token !== "ETH" &&
                    m.analysis.token !== "SOL"
            ).length || 0;
            await prisma.source.update({
                where: {
                    id: newSource.id,
                },
                data: {
                    metadata: metadata,
                    source_total_quantity_signals: messages.length,
                    source_global_probility: 0, // after trade
                    
                    source_bullish_total_quantity: messages.filter((message) => message.analysis?.direction === "bullish").length || 0,
                    source_bullish_percentage: (messages.filter((message) => message.analysis?.direction === "bullish").length / messages.length) * 100 || 0,
                    source_bullish_probility: 0, // after trade

                    source_bearish_total_quantity: messages.filter((message) => message.analysis?.direction === "bearish").length || 0,
                    source_bearish_percentage: (messages.filter((message) => message.analysis?.direction === "bearish").length / messages.length) * 100 || 0,
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

        console.log(' 🚀   -->  error:', error)
        return {
            status: false,
            message: error.message
        }
    }
}

// update source
export const updateSourceByIdService = async (id: number, source: Source) => {
    try {
        // const updatedSource = await prisma.source.update({
        //     where: {
        //         id: id,
        //     },
        //     data: source,
        // })
        return true
    } catch (error) {
        return error
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
