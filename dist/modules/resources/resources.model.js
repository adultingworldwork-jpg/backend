"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resource = exports.RESOURCE_STATUS = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.RESOURCE_STATUS = ["DRAFT", "PUBLISHED"];
/**
 * Curated therapy / wellness resource library entry.
 * Not booking — content only.
 */
const resourceSchema = new mongoose_1.default.Schema({
    authorId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    summary: { type: String, default: "", maxlength: 500 },
    content: { type: String, required: true },
    category: { type: String, required: true, trim: true, index: true },
    tags: { type: [String], default: [], index: true },
    coverImage: { type: String, default: null },
    estimatedReadMinutes: { type: Number, default: 5, min: 1, max: 240 },
    featured: { type: Boolean, default: false, index: true },
    status: {
        type: String,
        enum: exports.RESOURCE_STATUS,
        default: "DRAFT",
        index: true,
    },
    publishedAt: { type: Date, default: null, index: true },
}, { timestamps: true });
resourceSchema.index({ status: 1, publishedAt: -1 });
resourceSchema.index({ status: 1, featured: 1, publishedAt: -1 });
resourceSchema.index({ category: 1, status: 1, publishedAt: -1 });
resourceSchema.index({ authorId: 1, updatedAt: -1 });
exports.Resource = mongoose_1.default.model("Resource", resourceSchema);
