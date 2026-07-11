"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = exports.Conversation = exports.MESSAGE_TYPES = void 0;
exports.orderParticipants = orderParticipants;
const mongoose_1 = __importDefault(require("mongoose"));
exports.MESSAGE_TYPES = ["TEXT", "IMAGE", "FILE", "SYSTEM"];
const attachmentSchema = new mongoose_1.default.Schema({
    uploadId: { type: String },
    url: { type: String, required: true },
}, { _id: false });
/**
 * One conversation per unique pair of users.
 * participantA / participantB are ordered lexicographically (A < B).
 */
const conversationSchema = new mongoose_1.default.Schema({
    participantA: { type: String, required: true, index: true },
    participantB: { type: String, required: true, index: true },
    lastMessageId: { type: String, default: null },
    lastMessageAt: { type: Date, default: null, index: true },
}, { timestamps: true });
conversationSchema.index({ participantA: 1, participantB: 1 }, { unique: true });
const messageSchema = new mongoose_1.default.Schema({
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    type: {
        type: String,
        enum: exports.MESSAGE_TYPES,
        default: "TEXT",
    },
    content: { type: String, default: "", maxlength: 10000 },
    attachments: { type: [attachmentSchema], default: [] },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
}, { timestamps: true });
messageSchema.index({ conversationId: 1, createdAt: -1 });
exports.Conversation = mongoose_1.default.model("Conversation", conversationSchema);
exports.Message = mongoose_1.default.model("Message", messageSchema);
/** Normalize pair so A < B lexicographically */
function orderParticipants(userId1, userId2) {
    if (userId1 === userId2) {
        throw new Error("Cannot create conversation with self");
    }
    return userId1 < userId2
        ? { participantA: userId1, participantB: userId2 }
        : { participantA: userId2, participantB: userId1 };
}
