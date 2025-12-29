import { NotificationType } from "@prisma/client"
import { prisma } from "../../prisma"
import { getIO } from "../../config/socket"

export const createNotificationService = async (
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
    url: string = "",
    metadata: any = null
) => {
    const notification = await prisma.notification.create({
        data: {
            userId,
            type,
            title,
            message,
            url,
            metadata,
        },
    })

    getIO().to(`user_${userId}`).emit("new_notification", notification)

    return notification
}

export const getUserNotificationsService = async (userId: number, limit: number = 20, cursor?: number) => {
    return await prisma.notification.findMany({
        where: { userId },
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
    })
}

export const getUnreadNotificationsCountService = async (userId: number) => {
    return await prisma.notification.count({
        where: { userId, isRead: false },
    })
}

export const markNotificationAsReadService = async (id: number, userId: number) => {
    // Ensure the notification belongs to the user
    const notification = await prisma.notification.findFirst({
        where: { id, userId },
    })

    if (!notification) {
        throw new Error("Notification not found")
    }

    return await prisma.notification.update({
        where: { id },
        data: { isRead: true },
    })
}

export const markAllNotificationsAsReadService = async (userId: number) => {
    return await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    })
}
