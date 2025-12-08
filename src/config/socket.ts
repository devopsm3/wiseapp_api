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
                    console.log("User connected:", user.email, socket.id)
                } else {
                    console.log("Invalid token:", tokenHeader)
                    socket.disconnect(true)
                }
            } catch (error) {
                console.error("Failed to decode or verify token:", error)
                socket.disconnect(true)
                return
            }

        } else {
            console.log("No refreshToken found in cookies for socket:", socket.id)
            socket.disconnect(true)
        }
    })
    io.on("disconnect", (socket) => {
        console.log("❌ User disconnected:", socket.id)
    })

    return io
}

export function getIO(): Server {
    if (!io) throw new Error("Socket.io not initialized!")
    return io
}
