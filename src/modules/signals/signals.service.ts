import { prisma } from "../../prisma"

export const getSignalsService = async () => {
    try {
        const signals = await prisma.signal.findMany()
        const signalsData = signals.map((signal, index) => {
            return {
                index: index + 1,
                ...signal
            }
        })
        return signalsData
    } catch (error) {
        return error
    }
}

// get signal by id
export const getSignalByIdService = async (id: number) => {
    try {
        const signal = await prisma.signal.findUnique({
            where: {
                id: id,
            },
        })
        return signal
    } catch (error) {
        return error
    }
}