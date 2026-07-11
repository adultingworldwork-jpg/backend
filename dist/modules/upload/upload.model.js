"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Upload = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const uploadSchema = new mongoose_1.default.Schema({
    ownerId: { type: String, index: true },
    purpose: {
        type: String,
        enum: ["blog_cover", "book_cover", "book_pdf", "avatar", "cover", "general"],
        default: "general",
    },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    publicId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    resourceType: {
        type: String,
        enum: ["image", "raw", "video", "auto"],
        default: "image",
    },
}, { timestamps: { createdAt: true, updatedAt: false } });
exports.Upload = mongoose_1.default.model("Upload", uploadSchema);
