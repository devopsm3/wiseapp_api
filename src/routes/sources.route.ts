import { Router } from "express"
import {  getSources, getSourceById, addSource, updateSourceById, deleteSourceById, toggleSourceActivation, getSourceSignalsDetails } from "../modules/sources/sources.controller"

const SourcesRouter = Router()

SourcesRouter.get("/get-sources", getSources)
SourcesRouter.post("/create-source", addSource)
SourcesRouter.get("/get-source/:id", getSourceById)
SourcesRouter.put("/update-source/:id", updateSourceById)
SourcesRouter.delete("/delete-source/:id", deleteSourceById)
SourcesRouter.put("/toggle-source-activation/:id", toggleSourceActivation)
SourcesRouter.get("/source/:id/signals-details", getSourceSignalsDetails)

export default SourcesRouter