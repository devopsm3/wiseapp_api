import { SourceSetup, User } from "@prisma/client"
import { prisma } from "../../prisma"

export const getSetupsService = async (currentUser: User) => {
    try {
        const setupsData = await prisma.setup.findMany({
            where: {
                user_db_id: currentUser.id,
            },
        })
        return setupsData
    } catch (error) {

        console.log(" 🚀   -->  error:", error)
        return null
    }
}


export const addSetupService = async (currentUser: User, setupData: any) => {
    try {
        const setup = await prisma.setup.create({
            data: {
                name: `global_setup_${currentUser.id}`,
                settings: setupData,
                user_db_id: currentUser.id,
            },
        })
        return setup
    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return null
    }
}

export const updateSetupService = async (setupId: number, setupData: any, currentUser: User) => {
    try {
        const setup = await prisma.setup.upsert({
            where: {
                id: setupId,
            },
            update: {
                settings: setupData,
                user_db_id: currentUser.id,
            },
            create: {
                name: `global_setup_${currentUser.id}`,
                settings: setupData,
                user_db_id: currentUser.id,
            },
        })

        return setup
    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return null
    }
}

export const getSourcesSetupsService = async (currentUser: User) => {
    try {
        const userSources = await prisma.userSource.findMany({
            where: {
                user_id: currentUser.id,
                source_activated: true,
            },
            select: {
                id: true,
                Source: true,
            },
        })
        const setups = await prisma.sourceSetup.findMany({
            where: {
                userSourceId: {
                    in: userSources.map(us => us.id),
                },
            },
        })
        const setupsData = userSources.map(us => {
            let setup = null
            const sourceSetup = setups.find(sd => sd.userSourceId === us.id)
            if (!sourceSetup) {
                setup = {
                    source_setup_filter_btc: true,
                    source_setup_filter_eth: true,
                    source_setup_filter_sol: true,
                    source_setup_filter_alts: true,
                    source_setup_filter_bullish: true,
                    source_setup_filter_bearish: true,
                    source_setup_filter_binance_only: false,
                    userSourceId: us.id,
                }
            } else {
                setup = sourceSetup
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { createdAt, updatedAt, ...rest } = setup as SourceSetup
            return {
                id: us.Source.id,
                source_image_url: us.Source.platform_user_picture,
                platform: us.Source.platform,
                source_name: us.Source.user_name_source,
                is_verified: us.Source.user_verified,
                source_id: us.Source.user_username_source,
                source_url: us.Source.source_url,
                setup: rest,
            }
        }).filter((item) => item !== null)
        return setupsData.length ? { status: true, data: setupsData } : { status: true, data: [] }
    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return { status: false, data: [] }
    }
}

export const removeSourceFromMandatoryListService = async (sourceId: number, currentUser: User) => {
    try {
        const setup = await prisma.setup.findFirst({
            where: {
                user_db_id: currentUser.id,
            },
        })
        if (!setup || !setup.settings) return
        const settings = setup.settings as any
        const mandatoryIds = settings.metasignal_mandatory_sources_ids
        if (Array.isArray(mandatoryIds) && mandatoryIds.includes(sourceId)) {
            const updatedMandatoryIds = mandatoryIds.filter((id: number) => id !== sourceId)
            await prisma.setup.update({
                where: {
                    id: setup.id,
                },
                data: {
                    settings: {
                        ...settings,
                        metasignal_mandatory_sources_ids: updatedMandatoryIds,
                    },
                },
            })
        }
    } catch (error) {
        console.log(" 🚀   -->  error in removeSourceFromMandatoryListService:", error)
    }
}