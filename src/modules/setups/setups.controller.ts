import { NextFunction, Request, Response } from "express"
import { getSetupsService, getSetupByIdService, addSetupService, updateSetupService } from "./setups.service"

export const getSetups = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const setups = await getSetupsService(req.user!)

        if (!setups) {
            return res.status(404).json({ status: false, message: "Setups not found" })
        }
        return res.status(200).json({
            status: true,
            data: setups,
        })
    } catch (error) {
        next(error)
    }
}

export const getSetupById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const setup = await getSetupByIdService(Number(req.params.id), req.user!)
        if (!setup) {
            return res.status(404).json({ status: false, message: "Setup not found" })
        }
        return res.status(200).json({
            status: true,
            data: setup,
        })
    } catch (error) {
        next(error)
    }
}

export const addSetup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const setup = await addSetupService(req.user!, req.body)
        if (!setup) {
            return res.status(404).json({ status: false, message: "Setup not found" })
        }
        return res.status(200).json({
            status: true,
            data: setup,
        })
    } catch (error) {
        next(error)
    }
}

export const updateSetup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const setup = await updateSetupService(Number(req.params.id), req.body, req.user!)

        if (!setup) {
            return res.status(404).json({ status: false, message: "Setup not found" })
        }
        return res.status(200).json({
            status: true,
            data: setup.id,
        })
    } catch (error) {
        next(error)
    }
}