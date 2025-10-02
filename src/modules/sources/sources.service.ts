import { prisma } from "../../prisma"

import { sourcesQueue } from "../../jobs/sources.job"
import { SourceStatus, User } from "@prisma/client"
import { getIO } from "../../config/socket"
import { ChannelInfo } from "../../models/models"
import { getChannelInfo } from "../../services/telegram/telegram.service"

// get all sources
export const getSourcesService = async (currentUser: User) => {
    try {
        const sources = await prisma.source.findMany({
            where: {
                user_db_id: currentUser.id,
                source_status: SourceStatus.VALIDE,
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
                    source_status: SourceStatus.VALIDE,
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
        const sourceExists = await prisma.source.findFirst({
            where: {
                user_username_source: source.sourceId,
                user_db_id: currentUser.id,
                source_status: SourceStatus.VALIDE,
            },
        })
        if (sourceExists) {
            return {
                status: false,
                message: "Source already exists"
            }
        }
        const { channelInfo }: { channelInfo: ChannelInfo | null } = await getChannelInfo(source.sourceId)
        if (!channelInfo) {
            return {
                status: false,
                message: "Channel not found"
            }
        }

        getIO().emit("sources_creating_init")
        await sourcesQueue.add("createSource", { channelInfo, source, currentUser })
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
