import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import jwt from "jsonwebtoken";

// Store active users: { userId: socketId }
const activeUsers = new Map();

export const setupSocketHandlers = (io) => {
    
    // Middleware to authenticate socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            
            if (!token) {
                return next(new Error("Authentication error"));
            }

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            socket.userId = decoded._id;
            next();
        } catch (error) {
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", async (socket) => {
        console.log(`🔌 User connected: ${socket.userId}`);

        // Store user's socket connection
        activeUsers.set(socket.userId, socket.id);

        // Update user's online status in database
        await User.findByIdAndUpdate(socket.userId, {
            isOnline: true,
            socketId: socket.id,
            lastSeen: new Date()
        });

        // Broadcast to all clients that this user is online
        socket.broadcast.emit("user:online", { userId: socket.userId });

        // Send list of online users to the newly connected user
        const onlineUserIds = Array.from(activeUsers.keys());
        socket.emit("users:online", { userIds: onlineUserIds });

        // ========== MESSAGE EVENTS ==========

        // Send message
        socket.on("message:send", async (data) => {
            try {
                const { receiverId, content } = data;

                // Save message to database
                const message = await Message.create({
                    sender: socket.userId,
                    receiver: receiverId,
                    content: content.trim(),
                    isDelivered: activeUsers.has(receiverId) // Mark as delivered if receiver is online
                });

                // Populate sender info
                await message.populate('sender', 'username fullName avatar');

                // Get receiver's socket ID
                const receiverSocketId = activeUsers.get(receiverId);

                if (receiverSocketId) {
                    // Send message to receiver
                    io.to(receiverSocketId).emit("message:new", {
                        message: message
                    });

                    // Send delivery confirmation to sender
                    socket.emit("message:delivered", {
                        messageId: message._id,
                        receiverId: receiverId
                    });
                }

                // Send confirmation to sender
                socket.emit("message:sent", {
                    message: message
                });

            } catch (error) {
                console.error("Error sending message:", error);
                socket.emit("message:error", { error: "Failed to send message" });
            }
        });

        // Mark message as read
        socket.on("message:read", async (data) => {
            try {
                const { messageId, senderId } = data;

                // Update message in database
                await Message.findByIdAndUpdate(messageId, {
                    isRead: true,
                    readAt: new Date()
                });

                // Notify sender that message was read
                const senderSocketId = activeUsers.get(senderId);
                if (senderSocketId) {
                    io.to(senderSocketId).emit("message:read-receipt", {
                        messageId: messageId,
                        readerId: socket.userId,
                        readAt: new Date()
                    });
                }

            } catch (error) {
                console.error("Error marking message as read:", error);
            }
        });

        // ========== TYPING EVENTS ==========

        // User started typing
        socket.on("typing:start", (data) => {
            const { receiverId } = data;
            const receiverSocketId = activeUsers.get(receiverId);
            
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("typing:started", {
                    userId: socket.userId
                });
            }
        });

        // User stopped typing
        socket.on("typing:stop", (data) => {
            const { receiverId } = data;
            const receiverSocketId = activeUsers.get(receiverId);
            
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("typing:stopped", {
                    userId: socket.userId
                });
            }
        });

        // ========== DISCONNECT EVENT ==========

        socket.on("disconnect", async () => {
            console.log(`🔌 User disconnected: ${socket.userId}`);

            // Remove from active users
            activeUsers.delete(socket.userId);

            // Update user's online status in database
            await User.findByIdAndUpdate(socket.userId, {
                isOnline: false,
                socketId: null,
                lastSeen: new Date()
            });

            // Broadcast to all clients that this user is offline
            socket.broadcast.emit("user:offline", {
                userId: socket.userId,
                lastSeen: new Date()
            });
        });
    });
};