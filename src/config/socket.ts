// socket.ts
import { Server } from "socket.io"
import { allowList } from "../allowList"

let io: Server

export function initSocket(server: any) {
    io = new Server(server, {
        cors: {
            origin: allowList,
            methods: ["GET", "POST"]
        }
    })

    io.on("connection", (socket) => {
        console.log("✅ User connected:", socket.id)
        io.to(socket.id).emit("user_connected", socket.id)
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
