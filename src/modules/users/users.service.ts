import { User } from "@prisma/client"
import { prisma } from "../../prisma"
import bcrypt from "bcrypt"

// get all users
export const getUsersService = async () => {
    try {
        const users = await prisma.user.findMany({
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

        const usersBanned = users.filter((user) => user.isBanned === true).map((user) => {
            return {
                id: user.id,
                email: user.email,
                login: user.login,
                is_admin: user.isAdmin,
                connections_7d: 1,
                connections_30d: 2,
                is_banned: user.isBanned,
                bannedAt: user.bannedAt,
                last_login_at: user.lastLogin,
                created_at: user.createdAt
            }
        })
        const usersNotBanned = users.filter((user) => user.isBanned === false).map((user) => {
            return {
                id: user.id,
                email: user.email,
                login: user.login,
                is_admin: user.isAdmin,
                connections_7d: 1,
                connections_30d: 2,
                is_banned: user.isBanned,
                bannedAt: user.bannedAt,
                last_login_at: user.lastLogin,
                created_at: user.createdAt
            }
        })
        return { banned: usersBanned, users: usersNotBanned }
    } catch (error) {

        console.log(" 🚀   -->  error:", error)
        return error
    }
}

// get user by id:
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
        user.password = await bcrypt.hash(user.password, 10)
        const newUser = await prisma.user.create({
            data: user,
        })
        return {
            status: true,
            data: newUser,
        }
    } catch (error: any) {
        return {
            status: false,
            message: error?.code && error.code === "P2002" ? "Email already exists" : error.message
        }
    }
}

// update user
export const updateUserByIdService = async (id: number, user: User) => {
    try {
        if (user.password) {
            user.password = await bcrypt.hash(user.password, 10)
        }
        const updatedUser = await prisma.user.update({
            where: {
                id: id,
            },
            data: user,
        })
        return {
            status: true,
            data: updatedUser,
        }
    } catch (error: any) {
        return {
            status: false,
            message: error?.code && error.code === "P2002" ? "Email already exists" : error.message
        }
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