"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityReaction = exports.CommunityComment = exports.CommunityPost = exports.REACTION_TYPES = exports.COMMUNITY_VISIBILITY = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.COMMUNITY_VISIBILITY = ["PUBLIC", "COMMUNITY"];
exports.REACTION_TYPES = ["LIKE", "SUPPORT", "HUG", "THANKFUL"];
const attachmentSchema = new mongoose_1.default.Schema({
    uploadId: { type: String },
    url: { type: String, required: true },
}, { _id: false });
const communityPostSchema = new mongoose_1.default.Schema({
    authorId: { type: String, required: true, index: true },
    content: { type: String, required: true, maxlength: 5000 },
    attachments: { type: [attachmentSchema], default: [] },
    visibility: {
        type: String,
        enum: exports.COMMUNITY_VISIBILITY,
        default: "COMMUNITY",
        index: true,
    },
    commentsCount: { type: Number, default: 0 },
    reactionsCount: { type: Number, default: 0 },
}, { timestamps: true });
communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ authorId: 1, createdAt: -1 });
communityPostSchema.index({ visibility: 1, createdAt: -1 });
const communityCommentSchema = new mongoose_1.default.Schema({
    postId: { type: String, required: true, index: true },
    authorId: { type: String, required: true, index: true },
    content: { type: String, required: true, maxlength: 2000 },
}, { timestamps: true });
communityCommentSchema.index({ postId: 1, createdAt: -1 });
const communityReactionSchema = new mongoose_1.default.Schema({
    postId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: {
        type: String,
        enum: exports.REACTION_TYPES,
        required: true,
    },
}, { timestamps: { createdAt: true, updatedAt: true } });
communityReactionSchema.index({ postId: 1, userId: 1 }, { unique: true });
exports.CommunityPost = mongoose_1.default.model("CommunityPost", communityPostSchema);
exports.CommunityComment = mongoose_1.default.model("CommunityComment", communityCommentSchema);
exports.CommunityReaction = mongoose_1.default.model("CommunityReaction", communityReactionSchema);
