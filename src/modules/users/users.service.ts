import { User } from "@prisma/client"
import { prisma } from "../../prisma"
import bcrypt from "bcrypt"

// get all users
export const getUsersService = async () => {
    try {
        const now = new Date()
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        const users = await prisma.user.findMany({
            include: {
                sessions: {
                    where: {
                        startTime: {
                            gte: thirtyDaysAgo
                        }
                    }
                }
            }
        })

        const formatUser = (user: any) => {
            const sessions7d = user.sessions.filter((s: any) => s.startTime >= sevenDaysAgo)
            const sessions30d = user.sessions // Already filtered by Prisma

            const connections_7d = sessions7d.length
            const connections_30d = sessions30d.length

            const time_spent_7d = sessions7d.reduce((acc: number, s: any) => acc + (s.duration || 0), 0)
            const time_spent_30d = sessions30d.reduce((acc: number, s: any) => acc + (s.duration || 0), 0)

            return {
                id: user.id,
                email: user.email,
                login: user.login,
                is_admin: user.isAdmin,
                connections_7d,
                connections_30d,
                time_spent_7d,
                time_spent_30d,
                is_banned: user.isBanned,
                bannedAt: user.bannedAt,
                last_login_at: user.lastLogin,
                created_at: user.createdAt
            }
        }

        const usersBanned = users.filter((user) => user.isBanned === true).map(formatUser)
        const usersNotBanned = users.filter((user) => user.isBanned === false).map(formatUser)

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