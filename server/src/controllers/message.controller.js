import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";

// Get all users (for user list screen)
const getAllUsers = asyncHandler(async (req, res) => {
    const currentUserId = req.user._id;

    // Get all users except current user
    const users = await User.find({ _id: { $ne: currentUserId } })
        .select('username fullName avatar isOnline lastSeen')
        .sort({ isOnline: -1, lastSeen: -1 }); // Online users first

    return res.status(200).json(
        new ApiResponse(200, users, "Users fetched successfully")
    );
});

// Get conversation/messages between two users
const getMessages = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Validate user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
        throw new ApiError(404, "User not found");
    }

    // Get all messages between these two users
    const messages = await Message.find({
        $or: [
            { sender: currentUserId, receiver: userId },
            { sender: userId, receiver: currentUserId }
        ]
    })
        .populate('sender', 'username fullName avatar')
        .populate('receiver', 'username fullName avatar')
        .sort({ createdAt: 1 }); // Oldest first

    return res.status(200).json(
        new ApiResponse(200, messages, "Messages fetched successfully")
    );
});

// Get all conversations with last message
const getConversations = asyncHandler(async (req, res) => {
    const currentUserId = req.user._id;

    // Get all users the current user has chatted with
    const conversations = await Message.aggregate([
        {
            $match: {
                $or: [
                    { sender: currentUserId },
                    { receiver: currentUserId }
                ]
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $group: {
                _id: {
                    $cond: [
                        { $eq: ['$sender', currentUserId] },
                        '$receiver',
                        '$sender'
                    ]
                },
                lastMessage: { $first: '$$ROOT' }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $unwind: '$user'
        },
        {
            $project: {
                _id: 0,
                userId: '$_id',
                username: '$user.username',
                fullName: '$user.fullName',
                avatar: '$user.avatar',
                isOnline: '$user.isOnline',
                lastSeen: '$user.lastSeen',
                lastMessage: {
                    content: '$lastMessage.content',
                    createdAt: '$lastMessage.createdAt',
                    isRead: '$lastMessage.isRead',
                    sender: '$lastMessage.sender'
                }
            }
        },
        {
            $sort: { 'lastMessage.createdAt': -1 }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, conversations, "Conversations fetched successfully")
    );
});

export {
    getAllUsers,
    getMessages,
    getConversations
};