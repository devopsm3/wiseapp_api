// socket.ts
import { Server } from "socket.io"
import { allowList } from "../allowList"
import { prisma } from "../prisma"

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
        const cookieHeader = socket.handshake.headers.cookie
        let refreshToken = ""
        if (cookieHeader) {
            const cookies = cookieHeader.split("; ")
            const refreshTokenCookie = cookies.find(cookie => cookie.startsWith("refreshToken="))
            if (refreshTokenCookie) {
                refreshToken = refreshTokenCookie.substring("refreshToken=".length)
            }
        }
        if (refreshToken) {
            const user = await prisma.user.findFirst({
                where: {
                    refreshToken: refreshToken
                }
            })

            if (user) {
                socket.join("user_" + user.id)
                io.to(socket.id).emit("user_connected", socket.id)
                console.log("User reconnected:", user.email, socket.id)
            } else {
                console.log("Invalid refreshToken:", refreshToken)
                socket.disconnect(true)
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
