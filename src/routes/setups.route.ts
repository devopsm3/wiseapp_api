import { Router } from "express"
import { addSetup, getSetupById, getSetups, updateSetup } from "../modules/setups/setups.controller"

const SetupsRouter = Router()

SetupsRouter.get("/get-setups", getSetups)
SetupsRouter.get("/get-setup/:id", getSetupById)
SetupsRouter.post("/create-setup", addSetup)
SetupsRouter.put("/update-setup/:id", updateSetup)

export default SetupsRouter