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
    } catch(error) {
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
            // include: {
            //     Source: true,
            // },
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
            const setup = setups.find(sd => sd.userSourceId === us.id)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {createdAt, updatedAt, ...rest} = setup as SourceSetup
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
        })
        return setupsData.length ? {status: true, data: setupsData} : {status: true, data: []}
    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        return {status: false, data: []}
    }
}

