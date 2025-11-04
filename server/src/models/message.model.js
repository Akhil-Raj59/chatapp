import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
    {
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        receiver: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        content: {
            type: String,
            required: true,
            trim: true
        },
        isRead: {
            type: Boolean,
            default: false
        },
        isDelivered: {
            type: Boolean,
            default: false
        },
        readAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);


messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);