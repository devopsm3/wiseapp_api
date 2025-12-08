import { prisma } from "../../prisma"

import { sourcesQueue } from "../../jobs/sources.job"
import { PlatformName, SourceStatus, User } from "@prisma/client"
import { getIO } from "../../config/socket"
import { getTelegramChannelInfo } from "../../providers/telegram/telegram.provider"
import { getTwitterChannelInfo } from "../../providers/twitter/twitter.provider"
import { SourceType } from "../../providers/sources/sources.types"
import { normalizeSourceId } from "../../utils/global.helpers"

// get all sources
export const getSourcesService = async (currentUser: User) => {
    try {
        const sources = await prisma.source.findMany({
            where: {
                user_db_id: currentUser.id,
                source_status: SourceStatus.VALIDE,
            },
        })

        const sourcesData = sources.map((source) => {
          
            let source_url = ""

            if (source.platform_logo === "TELEGRAM") {
                source_url = `https://t.me/${source.user_username_source}`
            } else {
                source_url = `https://x.com/${source.user_username_source}`
            }
            return {
                // ...source,
                id: source.id,
                source_image_url: source.platform_user_picture,
                platform: source.platform_logo,
                is_active: source.source_activated,
                is_paid: source.source_price !== "FREE",
                reverse_signal: source.source_reverse_signal_activated,
                source_name: source.user_name_source,
                source_id: source.user_username_source,
                price_monthly: source.source_price_value,
                bull_count: source.source_bullish_total_quantity,
                bear_count: source.source_bearish_total_quantity,
                btc_count: source.btc_total_quantity,
                eth_count: source.eth_total_quantity,
                sol_count: source.sol_total_quantity,
                alts_count: source.alts_total_quantity,
                // profitability_m: source.source_global_probility,
                is_verified: source.user_verified,
                profitability_d: 1,
                profitability_w: 2,
                profitability_m: 3,
                profitability_3m: 4,
                // signals_count_m: source.source_total_quantity_signals,
                signals_count_d: 11,
                signals_count_w: 22,
                signals_count_m: 33,
                signals_count_3m: 44,

                // focus
                followers_count: source.followers_count,
                account_created_at: new Date(source.user_creation_date * 1000),
                deleted_posts: source.source_validation_deleted_count,
                source_url
                // source_bearish_percentage: Number(source.source_bearish_percentage?.toFixed(2)),
                // source_bullish_percentage: Number(source.source_bullish_percentage?.toFixed(2))
            }
        })
        return sourcesData
    } catch (error) {
        return error
    }
}

// get source by id or username
export const getSourceByIdService = async (id: string, currentUser: User) => {

    try {
        const n = Number(id)
        const sourceId = isNaN(n) ? null : n
        let source
        if (sourceId) {
            source = await prisma.source.findUnique({
                where: { 
                    id: sourceId,
                    user_db_id: currentUser.id,
                    // source_status: SourceStatus.VALIDE,
                },
            })
        } else {
            source = await prisma.source.findFirst({
                where: {
                    user_username_source: id,
                    user_db_id: currentUser.id,
                    source_status: SourceStatus.VALIDE,
                },
            })
        }
        if (!source) {
            return {
                status: false,
                message: "Source not found"
            }
        }
        return { 
            status: true,
            source: source
        }
    } catch (error: any) {

        console.log(" 🚀   -->  error:", error)
        return {
            status: false,
            message: error.message
        }
    }
}

// add source
export const addSourceService = async (source: any, currentUser: User) => {

    try {
        const normalizedSourceId = normalizeSourceId(source.sourceId)
        const sourceExists = await prisma.source.findFirst({
            where: {
                user_username_source: normalizedSourceId,
                user_db_id: currentUser.id,
                platform_logo: source.sourceType,
                source_status: SourceStatus.VALIDE,
            },
        })
        if (sourceExists) {
            return {
                status: false,
                message: "Source already exists in your account"
            }
        }
        let channelInfo: SourceType | null = null
        if (source.sourceType === PlatformName.TELEGRAM) {
            const channel = await getTelegramChannelInfo(normalizedSourceId)
            channelInfo = channel.channelInfo
        }
        if (source.sourceType === PlatformName.X) {
            const channel = await getTwitterChannelInfo(normalizedSourceId)
            channelInfo = channel.channelInfo
        }
        if (!channelInfo) {
            return {
                status: false,
                message:
                source.sourceType === PlatformName.TELEGRAM
                    ? `Telegram channel '${source.sourceId}' could not be found or is inaccessible.`
                    : `User '${source.sourceId}' could not be found or the profile is unavailable.`
            }
        }

        getIO().to("user_" + currentUser.id.toString()).emit("sources_creating_init")
        await sourcesQueue.add("createSourceJob", { channelInfo, source, currentUser })
        return {
            status: true
        }
    } catch (error: any) {
        console.log(" 🚀   -->  error :", error)
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

// toggle source activation
export const toggleSourceActivationService = async (id: number, currentUser: User, body: any) => {

    console.log(" 🚀   -->  body:", body)
    try {
        const updatedSource = await prisma.source.update({
            where: {
                id: id,
                user_db_id: currentUser.id,
            },
            data: {
                source_activated: body.is_active,
                source_reverse_signal_activated: body.reverse_signal,
            },
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

// get source signals details
export const getSourceSignalsDetailsService = async (sourceId: number, currentUser: User) => {
    try {
        const signals = await prisma.signal.findMany({
            where: {
                sourceId: sourceId,
                user_db_id: currentUser.id,
            },
            orderBy: {
                entry_timestamp: "desc"
            }
        })

        const formattedSignals = signals.map(signal => ({
            id: signal.id.toString(),
            token_symbol: signal.currency_label,
            trend: signal.signal_trend === "LONG" ? "bullish" : "bearish",
            pnl_percent: signal.pnlP,
            created_at: signal.entry_timestamp.toISOString(),
            entry_price: signal.entry_price,
            exit_price: signal.exit_price || 0
        }))

        return {
            status: true,
            data: {
                signals: formattedSignals
            }
        }
    } catch (error: any) {
        return {
            status: false,
            message: error.message
        }
    }
}
