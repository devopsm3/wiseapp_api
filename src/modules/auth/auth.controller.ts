import { NextFunction, Request, Response } from "express"
import { prisma } from "../../prisma"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import config from "../../config/config"
import speakeasy from "speakeasy"
import QRCode from "qrcode"
import { ensureUserSetupService } from "../setups/setups.service"

export const generateTokens = (userId: number) => {
    // const a = 1
    const accessToken = jwt.sign(
        { id: userId },
        config.jwtSecret,
        { expiresIn: config.jwtExpireIn } as jwt.SignOptions
    )

    const refreshToken = jwt.sign(
        { id: userId },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpireIn } as jwt.SignOptions
    )

    return { accessToken, refreshToken }
}


export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return res.status(400).json({ status: false, message: "Invalid email or password" })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(400).json({ status: false, message: "Invalid email or password" })
        }

        if (user.isBanned) {
            return res.status(400).json({ status: false, message: "Your account is banned" })
        }

        // if (!user.twoFactorAuthEnabled) {
        //     return res.status(401).json({ status: false, message: "2fa_not_enabled" })
        // }

        // if (!req.body.code2fa) {
        //     return res.status(401).json({ status: false, message: "F2A code required" })
        // }

        // const codeVerified = speakeasy.totp.verify({
        //     secret: user.twoFactorAuthSecret!,
        //     encoding: "base32",
        //     token: req.body.code2fa
        // })

        // if (!codeVerified) {
        //     return res.status(401).json({ status: false, message: "Invalid F2A code" })
        // }
        //     return res.status(401).json({ status: false, message: "Invalid F2A code" })
        // }
        // Ensure user has setup
        await ensureUserSetupService(user.id)
        
        const { accessToken, refreshToken } = generateTokens(user.id)

        // set last login
        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastLogin: new Date(),
                refreshToken
            },
        })
        res
            //     .cookie("refreshToken", refreshToken, {
            //     httpOnly: true,
            //     secure: process.env.NODE_ENV === "production",
            //     sameSite: "strict",
            // })
            .json({
                status: true,
                data: {
                    token: accessToken,
                    user: {
                        id: user.id,
                        email: user.email,
                        login: user.login,
                        is_admin: user.isAdmin,
                        created_at: user.createdAt
                    },
                    twoFactorAuthEnabled: user.twoFactorAuthEnabled,
                }
            })
    } catch (error) {
        next(error)
    }
}

export const register = async (req: Request, res: Response) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)

        await prisma.user.create({
            data: {
                email: req.body.email,
                login: req.body.login,
                password: hashedPassword,
                twoFactorAuthEnabled: false,
            },
        })

        // const { accessToken, refreshToken } = generateTokens(user.id)

        // set last login
        // await prisma.user.update({
        //     where: { id: user.id },
        //     data: {
        //         lastLogin: new Date(),
        //         refreshToken
        //     },
        // })
        // res.cookie("refreshToken", refreshToken, {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === "production",
        //     sameSite: "strict",
        // }).json({
        //     status: true,
        //     token: accessToken,
        //     twoFactorAuthEnabled: false,
        //     isAdmin: false
        // })
        return res.status(200).json({
            data: {
                status: true
            }
        })

    } catch (error: any) {
        return res.status(400).json({
            status: false,
            message: error?.code && error.code === "P2002" ? "Email already exists" : error.message
        })
    }
}

// export const checkToken = async (req: Request, res: Response) => {
//     try {
//         // const { token } = req.body
//         const token = req.headers.authorization?.split(" ")[1]

//         const decodedToken = jwt.verify(token!, config.jwtSecret) as { id: number, iat: number, exp: number }
//         const user = await prisma.user.findUnique({
//             where: { id: decodedToken.id },
//         })
//         if (!user) {
//             return res.status(401).json({ status: false, message: "Invalid token" })
//         }
//         res.status(200).json({
//             status: true,
//             data: {
//                 // id: user.id,
//                 email: user.email,
//                 isAdmin: user.isAdmin,
//                 accessToken: token,
//                 twoFactorAuthEnabled: user.twoFactorAuthEnabled,
//             },
//         })
//     } catch (err: any) {
//         if (err.name === "TokenExpiredError") {
//             return res.status(401).json({ status: false, message: "Token expired" })
//         }
//         return res.status(401).json({ status: false, message: "Invalid token" })
//     }
// }

export const refreshToken = async (req: any, res: Response) => {
    if (!req.cookies) return res.status(401).json({ error: "No refresh token provided" })

    const token = req.cookies.refreshToken
    if (!token) return res.status(401).json({ error: "No refresh token provided" })

    try {
        const decoded = jwt.verify(token, config.jwtRefreshSecret) as { id: number }
        const user = await prisma.user.findUnique({ where: { id: decoded.id } })
        if (!user || user.refreshToken !== token) {
            return res.status(403).json({ error: "Invalid refresh token" })
        }
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id)

        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: newRefreshToken }
        })

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",

        }).json({
            status: true,
            token: accessToken,
            twoFactorAuthEnabled: user.twoFactorAuthEnabled,
            is_admin: user.isAdmin
        })

    } catch (err: any) {
        console.log(" 🚀   -->  err:", err)
        return res.status(403).json({ error: "Invalid or expired refresh token" })
    }
}

export const logout = async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken
    if (token) {
        await prisma.user.updateMany({
            where: { refreshToken: token },
            data: { refreshToken: null },
        })
    }
    res.clearCookie("refreshToken").json({ status: true, message: "Logged out" })
}

export const getTwoFactorAuthSecret = async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: req.user!.id,
            }
        })
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" })
        }

        if (user.twoFactorAuthEnabled) {
            return res.status(400).json({ status: true, message: "2fa_already_enabled" })
        }

        const secret = speakeasy.generateSecret({
            name: "TheWise",
            length: 20,
        })
        const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url!)

        await prisma.user.update({
            where: { id: req.user!.id },
            data: {
                twoFactorAuthSecret: secret.base32,
            },
        })
        return res.status(200).json({ status: true, secret, qrCodeDataURL })
    } catch (error: any) {
        return res.status(500).json({ status: false, message: error.message })
    }
}

export const ActivateTwoFactorAuth = async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: req.user!.id,
            }
        })
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" })
        }

        if (user.twoFactorAuthEnabled) {
            return res.status(400).json({ status: false, message: "2fa_already_enabled" })
        }

        const isTokenValid = speakeasy.totp.verify({
            secret: user.twoFactorAuthSecret!,
            encoding: "base32",
            token: req.body.code,
            window: 1
        })

        if (!isTokenValid) {
            return res.status(401).json({ status: false, message: "Invalid code" })
        }

        await prisma.user.update({
            where: { id: req.user!.id },
            data: {
                twoFactorAuthEnabled: true,
            },
        })
        return res.status(200).json({ status: true })
    } catch (error: any) {
        return res.status(500).json({ status: false, message: error.message })
    }
}

export const getMe = async (req: Request, res: Response) => {
    try {
        await ensureUserSetupService(req.user!.id)

        const user = await prisma.user.findUnique({
            where: {
                id: req.user!.id,
            }
        })
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" })
        }

        return res.status(200).json({
            data: {
                status: true,
                user: {
                    id: user.id,
                    email: user.email,
                    login: user.login,
                    is_admin: user.isAdmin,
                    created_at: user.createdAt
                },
            }
        })
    } catch (error: any) {
        return res.status(500).json({ status: false, message: error.message })
    }
}