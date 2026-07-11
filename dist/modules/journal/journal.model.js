"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Journal = exports.JOURNAL_MOODS = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.JOURNAL_MOODS = [
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
 * Private journal entry — owner-only.
 * Never query without ownerId filter in the service layer.
 */
const journalSchema = new mongoose_1.default.Schema({
    ownerId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 100000 },
    mood: {
        type: String,
        enum: exports.JOURNAL_MOODS,
        default: "OTHER",
        index: true,
    },
    tags: { type: [String], default: [], index: true },
    attachments: { type: [attachmentSchema], default: [] },
}, { timestamps: true });
journalSchema.index({ ownerId: 1, createdAt: -1 });
journalSchema.index({ ownerId: 1, mood: 1, createdAt: -1 });
journalSchema.index({ ownerId: 1, tags: 1, createdAt: -1 });
exports.Journal = mongoose_1.default.model("Journal", journalSchema);
