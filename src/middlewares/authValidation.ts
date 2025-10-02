import { Request, Response, NextFunction } from "express"
import jwt, { JwtPayload } from "jsonwebtoken"
import config from "../config/config"
import { prisma } from "../prisma"

interface TokenPayload extends JwtPayload {
        id: number; 

}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Invalid Authorization header format" })
    }
    const token = authHeader.split(" ")[1]

    if (!token) return res.status(401).json({ error: "Access denied" })

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        })
        if (!user) return res.status(401).json({ error: "token_expired" })
        
        const allowedWithout2FA = [
            { path: "/two-factor-auth", methods: ["GET", "POST"] },
        ]
        const isAllowedWithout2FA = allowedWithout2FA.some(
            route => route.path === req.path && route.methods.includes(req.method)
        )
         
        if (!user.twoFactorAuthEnabled && !isAllowedWithout2FA) {
            return res.status(401).json({ error: "2fa_not_enabled" })
        }
        req.user = user
        next()
    } catch (error: any) {
        res.status(401).json({ error: error.message === "jwt expired" ? "token_expired" :  error.message || "Invalid Token" })
    }
}