import { Router } from "express"
import { login, register, checkToken, refreshToken, logout } from "../modules/auth/auth.controller"
import { authMiddleware } from "../middlewares/authValidation"

const AuthRouter = Router()

AuthRouter.post("/login", login)
AuthRouter.post("/register", register)
AuthRouter.get("/check-token", authMiddleware, checkToken)
AuthRouter.get("/refresh-token", refreshToken)
AuthRouter.get("/logout", logout)

export default AuthRouter