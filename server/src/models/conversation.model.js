import mongoose, { Schema } from "mongoose";

const conversationSchema = new Schema(
    {
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true
            }
        ],
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: "Message"
        },
        lastMessageAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);


conversationSchema.index({ participants: 1 }, { unique: true });

export const Conversation = mongoose.model("Conversation", conversationSchema);