import { Router } from "express"
import {  getSources, getSourceById, addSource, updateSourceById, deleteSourceById } from "../modules/sources/sources.controller"

const SourcesRouter = Router()

SourcesRouter.get("/get-sources", getSources)
SourcesRouter.get("/get-source/:id", getSourceById)
SourcesRouter.post("/create-source", addSource)
SourcesRouter.put("/update-source/:id", updateSourceById)
SourcesRouter.delete("/delete-source/:id", deleteSourceById)

export default SourcesRouter