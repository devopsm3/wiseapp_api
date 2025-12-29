import { Request, Response } from "express"
import { fetchNewSignalsQueue } from "../jobs/fetchNewSignals.job"
import { postValidationQueue } from "../jobs/validatePosts.job"
import { signalPivotQueue } from "../jobs/updateSignalPivots.job"
import { statsQueue } from "../jobs/calculateStats.job"

export const triggerJob = async (req: Request, res: Response) => {
    const { jobName } = req.body
    const user = req.user

    if (!user?.isAdmin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" })
    }

    try {
        switch (jobName) {
        case "fetchNewSignals":
            await fetchNewSignalsQueue.add("fetchNewSignals", { isManual: true, userId: user.id })
            break
        case "postValidation":
            await postValidationQueue.add("dailyPostValidation", { isManual: true, userId: user.id })
            break
        case "signalPivots":
            await signalPivotQueue.add("dailyPivotUpdate", { isManual: true, userId: user.id })
            break
        case "stats":
            await statsQueue.add("calculateSourceStats", { isManual: true, userId: user.id })
            break
        case "all":
            await fetchNewSignalsQueue.add("fetchNewSignals", { isManual: true, userId: user.id })
            await postValidationQueue.add("dailyPostValidation", { isManual: true, userId: user.id })
            await signalPivotQueue.add("dailyPivotUpdate", { isManual: true, userId: user.id })
            await statsQueue.add("calculateSourceStats", { isManual: true, userId: user.id })
            break
        default:
            return res.status(400).json({ 
                error: "Invalid job name", 
                availableJobs: ["fetchNewSignals", "postValidation", "signalPivots", "stats", "all"] 
            })
        }

        return res.status(200).json({ 
            success: true, 
            message: `Job '${jobName}' triggered successfully` 
        })
    } catch (error: any) {
        console.error(`❌ Error triggering job ${jobName}:`, error)
        return res.status(500).json({ error: "Failed to trigger job", details: error.message })
    }
}
