import { NextFunction, Request, Response } from "express"
import {
    getSourcesService,
    addSourceService,
    deleteSourceByIdService,
    toggleSourceActivationService,
    getSourceSignalsDetailsService,
    getSourceRecommendationsService,
    setSourceSetupService,
    getSourceSetupService
} from "./sources.service"

export const getSources = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sources = await getSourcesService(req.user!)
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

export const addSource = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const source = await addSourceService(req.body, req.user!)
        if (!source.status) {
            return res.status(400).json({ status: false, message: source.message })
        }
        res.status(200).json({
            status: true,
            data: source,
        })
    } catch (error) {
        next(error)
    }
}

// toggle source activation
export const toggleSourceActivation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const source = await toggleSourceActivationService(Number(req.params.id), req.user!, req.body)
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
        const source = await deleteSourceByIdService(Number(req.params.id), req.user!)
        if (!source) {
            return res.status(404).json({ status: false, message: "Source not found" })
        }
        res.status(200).json({
            data: {
                status: true
            }
        })
    } catch (error) {
        next(error)
    }
}


export const getSourceSignalsDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result: any = await getSourceSignalsDetailsService(Number(req.params.id), req.user!)
        if (!result.status) {
            return res.status(404).json({ status: false, message: result.message })
        }
        res.status(200).json({
            status: true,
            data: result.data,
        })
    } catch (error) {
        next(error)
    }
}

export const getSourceRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result: any = await getSourceRecommendationsService(Number(req.params.id), req.user!)
        if (!result.status) {
            return res.status(404).json({ status: false, message: result.message })
        }
        res.status(200).json({
            status: true,
            data: result.data,
        })
    } catch (error) {
        next(error)
    }
}

export const getSourceSetup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result: any = await getSourceSetupService(Number(req.params.id), req.user!)
        if (!result.status) {
            return res.status(404).json({ status: false, message: result.message })
        }
        res.status(200).json({
            status: true,
            data: result.data,
        })
    } catch (error) {
        next(error)
    }
}

export const setSourceSetup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result: any = await setSourceSetupService(Number(req.params.id), req.body, req.user!)
        if (!result.status) {
            return res.status(400).json({ status: false, message: result.message })
        }
        res.status(200).json({
            status: true,
            data: result.data,
        })
    } catch (error) {
        next(error)
    }
}

