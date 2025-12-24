import { Queue, Worker } from "bullmq"
// import { getIO } from "../config/socket"
import connection from "../config/redis"
import { createSourceService } from "../providers/sources/sources.provider"
// import { startFeedCron, startOwgFeedCron } from "../cron.js";

// Create a new connection in every instance

export const sourcesQueue = new Queue("sources", {
    connection: connection
})

export const sourcesWorker = new Worker("sources", async (job) => {
    console.log("👷 Processing sources job:", job.name)
    if (job.name === "createSourceJob") {
        await createSourceService(job.data.channelInfo, job.data.source, job.data.currentUser)
        console.log(" 🏁 SOURCE_CREATING JOB DONE 🏁")
    }
},
{
    connection: connection
}
)