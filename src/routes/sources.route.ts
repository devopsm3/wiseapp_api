import { Router } from "express"
import {
    getSources,
    addSource,
    deleteSourceById,
    toggleSourceActivation,
    getSourceSignalsDetails,
    getSourceRecommendations,
    getSourceSetup,
    setSourceSetup,
    getSourcePosts
} from "../modules/sources/sources.controller"

const SourcesRouter = Router()

SourcesRouter.get("/get-sources", getSources)
SourcesRouter.post("/create-source", addSource)
SourcesRouter.delete("/delete-source/:id", deleteSourceById)
SourcesRouter.put("/toggle-source-activation/:id", toggleSourceActivation)
SourcesRouter.get("/:id/signals-details", getSourceSignalsDetails)
SourcesRouter.get("/:id/recommendations", getSourceRecommendations)
SourcesRouter.get("/:id/posts", getSourcePosts)
SourcesRouter.get("/:id/setup", getSourceSetup)
SourcesRouter.put("/:id/setup", setSourceSetup)

export default SourcesRouter