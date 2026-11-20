import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import config from "../app/config";
import { registerChatSocket, emitToConversation, isUserOnline, getOnlineUserIds } from "../app/modules/message/message.socket";

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO with HTTP Server, CORS options, and Handshake Auth
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
            methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Global Socket.IO JWT Authentication Middleware
    io.use((socket: Socket, next) => {
        try {
            let token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization ||
                socket.handshake.query?.token;

            if (typeof token === "string" && token.startsWith("Bearer ")) {
                token = token.slice(7);
            }

            if (token && typeof token === "string") {
                const decoded = jwt.verify(token, config.jwt_access_secret as string) as {
                    _id: string;
                    name?: string;
                    email?: string;
                    role?: string;
                };
                (socket as any).userId = decoded._id;
                (socket as any).user = decoded;
            }
            next();
        } catch {
            next();
        }
    });

    // Base connection handling for user & custom rooms
    io.on("connection", (socket: Socket) => {
        console.log(`🔌 [Socket.io] Client connected: ${socket.id}`);

        const userId = (socket as any).userId;
        const role = (socket as any).user?.role;
        if (userId) {
            socket.join(`user_${userId}`);
            if (role) socket.join(`role_${role}`);
            socket.join("authenticated_users");
        }

        socket.on("join_user_room", (userId: string) => {
            if (userId) {
                socket.join(`user_${userId}`);
                console.log(`👤 [Socket.io] User ${userId} joined room: user_${userId}`);
            }
        });

        socket.on("leave_user_room", (userId: string) => {
            if (userId) {
                socket.leave(`user_${userId}`);
                console.log(`👋 [Socket.io] User ${userId} left room: user_${userId}`);
            }
        });

        socket.on("join_room", (roomName: string) => {
            if (roomName) {
                socket.join(roomName);
                console.log(`🚪 [Socket.io] Client ${socket.id} joined room: ${roomName}`);
            }
        });

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

    // Register Chat & Messaging module socket handlers
    registerChatSocket(io);

    console.log("⚡ [Socket.io] Initialized successfully.");
    return io;
};

/**
 * Get initialized Socket.IO instance for reusable queries anywhere in the app
 */
export const getIO = (): SocketIOServer => {
    if (!io) {
        throw new Error("Socket.io is not initialized. Please call initSocket(server) first.");
    }
    return io;
};

/**
 * Reusable helper: Send real-time event directly to a specific user's private room
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
 * Reusable helper: Send real-time event to a specific room
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
 * Reusable helper: Broadcast real-time event to all connected clients
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

// Re-export chat-specific helpers for backwards compatibility
export { emitToConversation, isUserOnline, getOnlineUserIds };
