import { Request, Response, NextFunction } from "express"

export const IsAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const user = req.user
        if (!user) {
            return res.status(401).json({ message: "User not authenticated" })
        }

        if (!user.isAdmin) {
            return res.status(403).json({ message: "Access denied" })
        }

        next()
    } catch (error) {
        console.log(" 🚀   -->  error:", error)
        res.status(403).json({ error: "Access denied" })
    }
}
