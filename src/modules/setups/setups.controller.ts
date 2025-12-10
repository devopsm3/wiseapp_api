import { NextFunction, Request, Response } from "express"
import { addSetupService, getSetupsService, updateSetupService } from "./setups.service"
import { Setup } from "@prisma/client"
import { GlobalSettings } from "../../types/setup.types"

export const getSetups = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const setupsData: Setup[] | null = await getSetupsService(req.user!)

        if (!setupsData) {
            return res.status(404).json({ status: false, message: "Setups not found" })
        }
        return res.status(200).json({
            status: true,
            data: setupsData.length ? {
                ...(setupsData[0].settings as unknown as GlobalSettings),
                id: setupsData[0].id,
            } : null,
        })
    } catch (error) {
        next(error)
    }
}

// export const getSetupById = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const setup = await getSetupByIdService(Number(req.params.id), req.user!)
//         if (!setup) {
//             return res.status(404).json({ status: false, message: "Setup not found" })
//         }
//         return res.status(200).json({
//             status: true,
//             data: setup,
//         })
//     } catch (error) {
//         next(error)
//     }
// }

export const addSetup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const setup: Setup | null = await addSetupService(req.user!, req.body)
        if (!setup) {
            return res.status(404).json({ status: false, message: "Setup not found" })
        }
        return res.status(200).json({
            status: true,
            data: {
                ...(setup.settings as unknown as GlobalSettings),
                id: setup.id,
            },
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
        const settings = setup.settings
        return res.status(200).json({
            status: true,
            data: {
                ...(settings as unknown as GlobalSettings),
                id: setup.id,
            },
        })
    } catch (error) {
        next(error)
    }
}