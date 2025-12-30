// socket.ts
import { Server } from "socket.io"
import { allowList } from "../allowList"
import { prisma } from "../prisma"
import jwt from "jsonwebtoken"
import { TokenPayload } from "../middlewares/authValidation"

let io: Server

export function initSocket(server: any) {
    io = new Server(server, {
        cors: {
            origin: allowList,
            methods: ["GET", "POST"],
            credentials: true
        }
    })

    io.on("connection", async (socket) => {
        // const cookieHeader = socket.handshake.headers.cookie
        const tokenHeader = socket.handshake.auth.token

        if (tokenHeader) {
            try {
                const decodedToken = jwt.verify(tokenHeader, process.env.JWT_SECRET || "") as TokenPayload

                const user = await prisma.user.findFirst({
                    where: {
                        id: decodedToken.id
                    }
                })
                if (user) {
                    socket.join("user_" + user.id)
                    io.to(socket.id).emit("user_connected", socket.id)
                    console.log("\n ✅ User connected:", user.email, socket.id, " \n")

                    // Track session or merge with last one
                    const SESSION_MERGE_THRESHOLD = 60 * 5 // 5 minutes
                    const now = new Date()

                    const lastSession = await prisma.userSession.findFirst({
                        where: { userId: user.id },
                        orderBy: { startTime: "desc" }
                    })

                    let session: any

                    if (lastSession && lastSession.endTime && (now.getTime() - lastSession.endTime.getTime()) < SESSION_MERGE_THRESHOLD * 1000) {
                        session = await prisma.userSession.update({
                            where: { id: lastSession.id },
                            data: { endTime: null }
                        })
                    } else {
                        session = await prisma.userSession.create({
                            data: {
                                userId: user.id,
                                startTime: now
                            }
                        })
                    }

                    socket.on("disconnect", async () => {
                        console.log("\n ❌ User disconnected:", user.email, socket.id, " \n")
                        const endTime = new Date()
                        const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000)

                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                lastLogin: endTime
                            }
                        })

                        await prisma.userSession.update({
                            where: { id: session.id },
                            data: {
                                endTime,
                                duration
                            }
                        })
                    })
                } else {
                    console.log("\n ❌ Invalid token:", tokenHeader, " \n")
                    socket.disconnect(true)
                }
            } catch (error) {
                console.error("\n ❌ Failed to decode or verify token:", error, " \n")
                socket.disconnect(true)
                return
            }

        } else {
            console.log("\n ❌ No refreshToken found in cookies for socket:", socket.id, " \n")
            socket.disconnect(true)
        }
    })

    return io
}

export function getIO(): Server {
    if (!io) throw new Error("Socket.io not initialized!")
    return io
}
