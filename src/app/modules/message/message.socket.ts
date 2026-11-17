import { Server as SocketIOServer, Socket } from "socket.io";
import { getIO } from "../../../utils/socket";

// Track active online users: userId -> Set of socket IDs (supports multiple tabs/devices)
const onlineUsersMap = new Map<string, Set<string>>();

/**
 * Register all chat, conversation, and messaging socket events
 */
export const registerChatSocket = (io: SocketIOServer): void => {
    io.on("connection", (socket: Socket) => {
        const userId: string | undefined = (socket as any).userId;

        // Auto-join private room and track online presence if authenticated via token
        if (userId) {
            socket.join(`user_${userId}`);

            if (!onlineUsersMap.has(userId)) {
                onlineUsersMap.set(userId, new Set());
                io.emit("user_online", { userId });
            }
            onlineUsersMap.get(userId)?.add(socket.id);
        }

        // Join specific conversation room
        socket.on("join_conversation", (conversationId: string) => {
            if (conversationId) {
                const room = `conversation_${conversationId}`;
                socket.join(room);
                console.log(`💬 [Chat Socket] Socket ${socket.id} joined conversation: ${room}`);
            }
        });

        // Leave specific conversation room
        socket.on("leave_conversation", (conversationId: string) => {
            if (conversationId) {
                const room = `conversation_${conversationId}`;
                socket.leave(room);
                console.log(`💬 [Chat Socket] Socket ${socket.id} left conversation: ${room}`);
            }
        });

        // Real-time typing indicators
        socket.on("typing_start", (data: { conversationId: string; recipientId?: string; senderName?: string }) => {
            if (data?.conversationId) {
                socket.to(`conversation_${data.conversationId}`).emit("user_typing", {
                    conversationId: data.conversationId,
                    userId: userId || (socket as any).userId,
                    senderName: data.senderName,
                });
            }
        });

        socket.on("typing_stop", (data: { conversationId: string; recipientId?: string }) => {
            if (data?.conversationId) {
                socket.to(`conversation_${data.conversationId}`).emit("user_stop_typing", {
                    conversationId: data.conversationId,
                    userId: userId || (socket as any).userId,
                });
            }
        });

        // Real-time message read receipt event
        socket.on("mark_messages_read", (data: { conversationId: string; readBy?: string }) => {
            if (data?.conversationId) {
                socket.to(`conversation_${data.conversationId}`).emit("messages_read", {
                    conversationId: data.conversationId,
                    readBy: data.readBy || userId,
                    readAt: new Date(),
                });
            }
        });

        // Disconnect cleanup for presence tracking
        socket.on("disconnect", () => {
            for (const [uid, sockets] of onlineUsersMap.entries()) {
                if (sockets.has(socket.id)) {
                    sockets.delete(socket.id);
                    if (sockets.size === 0) {
                        onlineUsersMap.delete(uid);
                        io.emit("user_offline", { userId: uid });
                        console.log(`👤 [Chat Socket] User ${uid} is now offline.`);
                    }
                    break;
                }
            }
        });
    });

    console.log("💬 [Chat Socket] Handlers registered successfully.");
};

/**
 * Emit event to a specific conversation room
 */
export const emitToConversation = <T = any>(conversationId: string, event: string, data: T): boolean => {
    try {
        const io = getIO();
        io.to(`conversation_${conversationId}`).emit(event, data);
        return true;
    } catch (err) {
        console.error(`[Chat Socket] Failed to emit ${event} to conversation ${conversationId}:`, err);
        return false;
    }
};

/**
 * Check if a user is currently online (has active socket connections)
 */
export const isUserOnline = (userId: string): boolean => {
    return (onlineUsersMap.get(userId)?.size || 0) > 0;
};

/**
 * Get list of currently online user IDs
 */
export const getOnlineUserIds = (): string[] => {
    return Array.from(onlineUsersMap.keys());
};

