import { NextFunction, Request, Response } from "express"
import { getUsersService, getUserByIdService, addUserService, updateUserByIdService, deleteUserByIdService, bannedUserByIdService } from "./users.service"

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // sleep 5 sec
        // await new Promise((resolve) => setTimeout(resolve, 2000));
        const users = await getUsersService()
        if (!users) {
            return res.status(404).json({ status: false, message: "Users not found" })
        }
        res.status(200).json({
            status: true,
            data: users,
        })
    } catch (error) {
        next(error)
    }
}

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await getUserByIdService(Number(req.params.id))
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" })
        }
        res.status(200).json({
            status: true,
            data: user,
        })
    } catch (error) {
        next(error)
    }
}

export const addUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await addUserService(req.body)
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" })
        }
        res.status(200).json({
            status: true,
            data: user,
        })
    } catch (error) {
        next(error)
    }
}

export const updateUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await updateUserByIdService(Number(req.params.id), req.body)
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" })
        }
        res.status(200).json({
            status: true,
            data: user,
        })
    } catch (error) {
        next(error)
    }
}

export const deleteUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await deleteUserByIdService(Number(req.params.id))
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" })
        }
        res.status(200).json({
            status: true,
            data: user,
        })
    } catch (error) {
        next(error)
    }
}

export const bannedUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await bannedUserByIdService(Number(req.params.id), req.body.isBanned)
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" })
        }
        res.status(200).json({
            status: true,
            data: user,
        })
    } catch (error) {
        next(error)
    }
}
