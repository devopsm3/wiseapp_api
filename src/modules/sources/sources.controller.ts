import { NextFunction, Request, Response } from "express"
import { getSourcesService, getSourceByIdService, addSourceService, updateSourceByIdService, deleteSourceByIdService } from "./sources.service"

export const getSources = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // sleep 5 sec
        // await new Promise((resolve) => setTimeout(resolve, 2000));
        const sources = await getSourcesService()
        if (!sources) {
            return res.status(404).json({ status: false, message: "Sources not found" })
        }
        res.status(200).json({
            status: true,
            data: sources,
        })
    } catch (error) {
        next(error)
    }
}

export const getSourceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const source = await getSourceByIdService(Number(req.params.id))
        if (!source) {
            return res.status(404).json({ status: false, message: "Source not found" })
        }
        res.status(200).json({
            status: true,
            data: source,
        })
    } catch (error) {
        next(error)
    }
}

export const addSource = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const source = await addSourceService(req.body)
        if (!source) {
            return res.status(404).json({ status: false, message: "Source not found" })
        }
        res.status(200).json({
            status: true,
            data: source,
        })
    } catch (error) {
        next(error)
    }
}

export const updateSourceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const source = await updateSourceByIdService(Number(req.params.id), req.body)
        if (!source) {
            return res.status(404).json({ status: false, message: "Source not found" })
        }
        res.status(200).json({
            status: true,
            data: source,
        })
    } catch (error) {
        next(error)
    }
}

export const deleteSourceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const source = await deleteSourceByIdService(Number(req.params.id))
        if (!source) {
            return res.status(404).json({ status: false, message: "Source not found" })
        }
        res.status(200).json({
            status: true,
            data: source,
        })
    } catch (error) {
        next(error)
    }
}
