"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_SIZE_BY_PURPOSE = exports.ALLOWED_MIME_TYPES = exports.uploadPurposeSchema = void 0;
const zod_1 = require("zod");
exports.uploadPurposeSchema = zod_1.z
    .enum([
    "blog_cover",
    "book_cover",
    "book_pdf",
    "avatar",
    "cover",
    "general",
])
    .default("general");
exports.ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
];
/** Max bytes by purpose (matches product admin UX) */
exports.MAX_SIZE_BY_PURPOSE = {
    blog_cover: 5 * 1024 * 1024,
    book_cover: 5 * 1024 * 1024,
    avatar: 5 * 1024 * 1024,
    cover: 5 * 1024 * 1024,
    general: 5 * 1024 * 1024,
    book_pdf: 10 * 1024 * 1024,
};
