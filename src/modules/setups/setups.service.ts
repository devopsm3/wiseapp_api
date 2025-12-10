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
        return null
    }
}

// // get signal by id
// export const getSetupByIdService = async (id: number, currentUser: User) => {
//     try {
//         const setup = await prisma.setup.findUnique({
//             where: {
//                 id: id,
//                 user_db_id: currentUser.id,
//             },
//         })
//         if (!setup) {
//             return null
//         }
//         return setup
//     } catch (error) {
//         return error
//     }
// }

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
