import { User } from "@prisma/client"
import { prisma } from "../../prisma"

// get all users
export const getUsersService = async () => {
    try {
        const users = await prisma.user.findMany({
            where: {
                isAdmin: false, 
            },
            select: {
                id: true,
                email: true,
                login: true,
                twoFactorAuthEnabled: false,
                isAdmin: true,
                isBanned: true,
                bannedAt: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
                password: false
            }
        })
        // return { users }
        return users
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
                twoFactorAuthEnabled: false,
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