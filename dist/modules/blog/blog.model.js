"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blog = exports.BLOG_STATUS = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.BLOG_STATUS = ["DRAFT", "PUBLISHED"];
const blogSchema = new mongoose_1.default.Schema({
    authorId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, default: "", maxlength: 500 },
    content: { type: String, required: true },
    coverImage: { type: String, default: null },
    tags: { type: [String], default: [], index: true },
    status: {
        type: String,
        enum: exports.BLOG_STATUS,
        default: "DRAFT",
        index: true,
    },
    publishedAt: { type: Date, default: null, index: true },
}, { timestamps: true });
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ authorId: 1, updatedAt: -1 });
blogSchema.index({ tags: 1, status: 1, publishedAt: -1 });
exports.Blog = mongoose_1.default.model("Blog", blogSchema);
