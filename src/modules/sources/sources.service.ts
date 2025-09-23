import { Source } from "@prisma/client"
import { prisma } from "../../prisma"

// get all sources
export const getSourcesService = async () => {
    try {
        const sources = await prisma.source.findMany()
        const sourcesData = sources.map((source, index) => {
            return {
                index: index + 1,
                ...source
            }
        })
        return sourcesData
    } catch (error) {
        return error
    }
}

// get source by id
export const getSourceByIdService = async (id: number) => {
    try {
        const source = await prisma.source.findUnique({
            where: {
                id: id,
            },
        })
        return source
    } catch (error) {
        return error
    }
}

// add source
export const addSourceService = async (source: Source) => {
    try {
        const newSource = await prisma.source.create({
            data: source,
        })
        return newSource
    } catch (error) {
        return error
    }
}

// update source
export const updateSourceByIdService = async (id: number, source: Source) => {
    try {
        const updatedSource = await prisma.source.update({
            where: {
                id: id,
            },
            data: source,
        })
        return updatedSource
    } catch (error) {
        return error
    }
}

// delete source
export const deleteSourceByIdService = async (id: number) => {
    try {
        const deletedSource = await prisma.source.delete({
            where: {
                id: id,
            },
        })
        return deletedSource
    } catch (error) {
        return error
    }
}
