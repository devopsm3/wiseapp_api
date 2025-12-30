import { Router } from "express"
import { login, register, refreshToken, logout, getTwoFactorAuthSecret, ActivateTwoFactorAuth, getMe, forgotPassword, checkResetToken, resetPassword } from "../modules/auth/auth.controller"
import { authMiddleware } from "../middlewares/authValidation"

const AuthRouter = Router()

AuthRouter.post("/login", login)
AuthRouter.post("/register", register)
// AuthRouter.get("/check-token", authMiddleware, checkToken) // will be removed later
AuthRouter.get("/two-factor-auth", authMiddleware, getTwoFactorAuthSecret)
AuthRouter.post("/two-factor-auth", authMiddleware, ActivateTwoFactorAuth)
AuthRouter.get("/refresh-token", refreshToken)
AuthRouter.get("/logout", logout)
AuthRouter.get("/me", authMiddleware, getMe)
AuthRouter.post("/forget-password", forgotPassword)
AuthRouter.get("/reset-password/:token", checkResetToken)
AuthRouter.post("/reset-password", resetPassword)

export default AuthRouter