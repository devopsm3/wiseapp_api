import { User } from "@prisma/client"
import { prisma } from "../../prisma"
import { getChannelMessages } from "../sources/telegram.service"

// import { getUserTweets } from "../sources/twitter.service";

// get all users
export const getUsersService = async () => {
    try {

        // const url = `https://api.x.com/2/users/1509883733905743886`
        // const response = await fetch(url, {
        //     method: 'GET',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Authorization': `Bearer ${process.env.X_BAREAR_TOKEN}`,
        //     },

        // });

        // const user = await client.v2.userByUsername('goalsside', { 
        //     "user.fields": ['created_at', 'description', 'entities', 'location', 'name', 'protected', 'url', 'username', 'verified', 'verified_type']});
        // console.log(' 🚀   -->  userTimeline:', user.data)



        // const tweets = await getUserTweets("centredevils")
        // const msgs = await getChannelMessages("sada18")
        // const msgs = await getChannelMessages("Crypto_Signals_Original1")
        // const msgs = await getChannelMessages("guebli_me")
        const { messages } = await getChannelMessages("guebli_me")
        // const { messages } = await getChannelMessages("abdussalamhawwa")
        const users = await prisma.user.findMany({
            where: {
                isAdmin: false, 
            },
            select: {
                id: true,
                email: true,
                login: true,
                twoFactorAuth: true,
                isAdmin: true,
                isBanned: true,
                bannedAt: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
                password: false
            }
        })
        return { messages,users }
        // return users;
    } catch (error) {

        console.log(" 🚀   -->  error:", error)
        return error
    }
}

// get user by id
export const getUserByIdService = async (id: number) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: id,
            },
            select: {
                id: true,
                email: true,
                login: true,
                twoFactorAuth: true,
                isAdmin: true,
                isBanned: true,
                bannedAt: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
                password: false
            }
        })
        return user
    } catch (error) {
        return error
    }
}

// add user
export const addUserService = async (user: User) => {
    try {
        const newUser = await prisma.user.create({
            data: user,
        })
        return newUser
    } catch (error) {
        return error
    }
}

// update user
export const updateUserByIdService = async (id: number, user: User) => {
    try {
        const updatedUser = await prisma.user.update({
            where: {
                id: id,
            },
            data: user,
        })
        return updatedUser
    } catch (error) {
        return error
    }
}

// delete user
export const deleteUserByIdService = async (id: number) => {
    try {
        const deletedUser = await prisma.user.delete({
            where: {
                id: id,
            },
        })
        return deletedUser
    } catch (error) {
        return error
    }
}

// banned/unbanned user
export const bannedUserByIdService = async (id: number, isBanned: boolean) => {
    try {
        const bannedUser = await prisma.user.update({
            where: {
                id: id,
            },
            data: {
                isBanned: isBanned,
                bannedAt: isBanned ? new Date() : null,
            },
        })
        return bannedUser
    } catch (error) {
        return error
    }
}