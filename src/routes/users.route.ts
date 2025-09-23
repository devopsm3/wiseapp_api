import { Router } from "express"
import {  getUsers, getUserById, addUser, updateUserById, deleteUserById, bannedUserById } from "../modules/users/users.controller"
import { IsAdmin } from "../middlewares/roleValidation"

const UsersRouter = Router()

UsersRouter.get("/get-users", IsAdmin, getUsers)
UsersRouter.get("/get-user/:id", getUserById)
UsersRouter.post("/create-user", addUser)
UsersRouter.put("/update-user/:id", updateUserById)
UsersRouter.delete("/delete-user/:id", deleteUserById)
UsersRouter.put("/banned-user/:id", bannedUserById)

export default UsersRouter