
import { NextFunction, Request, Response } from "express"
import { getUserNotificationsService, getUnreadNotificationsCountService, markNotificationAsReadService, markAllNotificationsAsReadService } from "./notifications.service"

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id
        const limit = req.query.limit ? Number(req.query.limit) : 20
        const cursor = req.query.cursor ? Number(req.query.cursor) : undefined

        const notifications = await getUserNotificationsService(userId, limit, cursor)
        const unreadCount = await getUnreadNotificationsCountService(userId)

        return res.status(200).json({
            status: true,
            data: { notifications, unreadCount },
        })
    } catch (error) {
        next(error)
    }
}

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id
        const notificationId = Number(req.params.id)

        await markNotificationAsReadService(notificationId, userId)

        return res.status(200).json({
            status: true,
            message: "Notification marked as read"
        })
    } catch (error) {
        next(error)
    }
}

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id
        await markAllNotificationsAsReadService(userId)

        return res.status(200).json({
            status: true,
            message: "All notifications marked as read"
        })
    } catch (error) {
        next(error)
    }
}
