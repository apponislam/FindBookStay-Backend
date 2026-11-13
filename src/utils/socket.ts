import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import config from "../app/config";

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO with HTTP Server and CORS options
 */
export const initSocket = (server: HTTPServer): SocketIOServer => {
    const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5075",
        "http://localhost:5173",
    ];

    if (config.client_url && !allowedOrigins.includes(config.client_url)) {
        allowedOrigins.push(config.client_url);
    }

    io = new SocketIOServer(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    io.on("connection", (socket: Socket) => {
        console.log(`🔌 [Socket.io] Client connected: ${socket.id}`);

        // Join user-specific private notification room
        socket.on("join_user_room", (userId: string) => {
            if (userId) {
                const room = `user_${userId}`;
                socket.join(room);
                console.log(`👤 [Socket.io] User ${userId} joined room: ${room}`);
            }
        });

        // Leave user private room
        socket.on("leave_user_room", (userId: string) => {
            if (userId) {
                const room = `user_${userId}`;
                socket.leave(room);
                console.log(`👋 [Socket.io] User ${userId} left room: ${room}`);
            }
        });

        // Join specific entity/booking room (e.g., booking_123, turf_456)
        socket.on("join_room", (roomName: string) => {
            if (roomName) {
                socket.join(roomName);
                console.log(`🚪 [Socket.io] Client ${socket.id} joined room: ${roomName}`);
            }
        });

        // Leave specific room
        socket.on("leave_room", (roomName: string) => {
            if (roomName) {
                socket.leave(roomName);
                console.log(`🚪 [Socket.io] Client ${socket.id} left room: ${roomName}`);
            }
        });

        socket.on("disconnect", (reason) => {
            console.log(`🔌 [Socket.io] Client disconnected (${socket.id}): ${reason}`);
        });

        socket.on("error", (error) => {
            console.error(`❌ [Socket.io] Error on socket ${socket.id}:`, error);
        });
    });

    console.log("⚡ [Socket.io] Initialized successfully.");
    return io;
};

/**
 * Get initialized Socket.IO instance
 */
export const getIO = (): SocketIOServer => {
    if (!io) {
        throw new Error("Socket.io is not initialized. Please call initSocket(server) first.");
    }
    return io;
};

/**
 * Send real-time event directly to a specific user's private room
 */
export const emitToUser = <T = any>(userId: string, event: string, data: T): boolean => {
    try {
        if (!io) return false;
        io.to(`user_${userId}`).emit(event, data);
        return true;
    } catch (err) {
        console.error(`[Socket.io] Failed to emit ${event} to user ${userId}:`, err);
        return false;
    }
};

/**
 * Send real-time event to a specific room
 */
export const emitToRoom = <T = any>(roomName: string, event: string, data: T): boolean => {
    try {
        if (!io) return false;
        io.to(roomName).emit(event, data);
        return true;
    } catch (err) {
        console.error(`[Socket.io] Failed to emit ${event} to room ${roomName}:`, err);
        return false;
    }
};

/**
 * Broadcast real-time event to all connected clients
 */
export const broadcastEvent = <T = any>(event: string, data: T): boolean => {
    try {
        if (!io) return false;
        io.emit(event, data);
        return true;
    } catch (err) {
        console.error(`[Socket.io] Failed to broadcast event ${event}:`, err);
        return false;
    }
};

