"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Letter = exports.LETTER_MOODS = exports.LETTER_STATUSES = exports.LETTER_TYPES = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.LETTER_TYPES = ["PRIVATE", "PUBLIC"];
exports.LETTER_STATUSES = ["DRAFT", "SENT", "READ", "ARCHIVED"];
exports.LETTER_MOODS = [
    "HAPPY",
    "CALM",
    "SAD",
    "ANXIOUS",
    "STRESSED",
    "ANGRY",
    "HOPEFUL",
    "EXCITED",
    "TIRED",
    "OTHER",
];
const attachmentSchema = new mongoose_1.default.Schema({
    uploadId: { type: String },
    url: { type: String, required: true },
}, { _id: false });
/**
 * Standalone emotional letter — not a chat thread.
 * No replies, no conversation.
 */
const letterSchema = new mongoose_1.default.Schema({
    senderId: { type: String, required: true, index: true },
    recipientId: { type: String, default: null, index: true },
    type: {
        type: String,
        enum: exports.LETTER_TYPES,
        required: true,
        index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 20000 },
    mood: {
        type: String,
        enum: exports.LETTER_MOODS,
        default: "OTHER",
    },
    attachments: { type: [attachmentSchema], default: [] },
    status: {
        type: String,
        enum: exports.LETTER_STATUSES,
        default: "DRAFT",
        index: true,
    },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
}, { timestamps: true });
letterSchema.index({ senderId: 1, createdAt: -1 });
letterSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
letterSchema.index({ type: 1, status: 1, deliveredAt: -1 });
exports.Letter = mongoose_1.default.model("Letter", letterSchema);
