import { User } from "@prisma/client"
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
        return error
    }
}

// get signal by id
export const getSetupByIdService = async (id: number, currentUser: User) => {
    try {
        const setup = await prisma.setup.findUnique({
            where: {
                id: id,
                user_db_id: currentUser.id,
            },
        })
        if (!setup) {
            return null
        }
        return setup
    } catch (error) {
        return error
    }
}

export const addSetupService = async (currentUser: User, setupData: any) => {
    try {
        const setup = await prisma.setup.create({
            data: {
                name: setupData.name || "test_setup",
                sources: undefined,
                trading:undefined,
                meta_signals: setupData?.meta_signals!,
                user_db_id: currentUser.id,
            },
        })
        if (!setup) {
            return null
        }
        return setup
    } catch (error) {
        return error
    }
}

export const updateSetupService = async (id: number, setupData: any, currentUser: User) => {

    try {
        const setup = await prisma.setup.update({
            where: {
                id: id,
                user_db_id: currentUser.id,
            },
            data: {
                name: setupData.name,
                sources: undefined,
                trading:undefined,
                meta_signals: setupData?.meta_signals!,
            },
        })
        return setup
    } catch (error: any) {
        
        if (error.code === "P2025") {
            const setup = await prisma.setup.create({
                data: {
                    name: setupData.name || "setup-1-test",
                    sources: undefined,
                    trading:undefined,
                    meta_signals: setupData?.meta_signals!,
                    user_db_id: currentUser.id,
                },
            })

            return setup
        }
        console.log(" 🚀   -->  error:", error)
        return null
    }
}
