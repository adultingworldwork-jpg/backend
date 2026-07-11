"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityRepository = void 0;
const community_model_1 = require("./community.model");
class CommunityRepository {
    // ── Posts ──────────────────────────────────────────────
    async createPost(data) {
        return community_model_1.CommunityPost.create({
            ...data,
            commentsCount: 0,
            reactionsCount: 0,
        });
    }
    async findPostById(id) {
        return community_model_1.CommunityPost.findById(id).lean();
    }
    async updatePost(id, patch) {
        return community_model_1.CommunityPost.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    }
    async deletePost(id) {
        return community_model_1.CommunityPost.findByIdAndDelete(id).lean();
    }
    async listPosts(filter, page, limit) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            community_model_1.CommunityPost.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            community_model_1.CommunityPost.countDocuments(filter),
        ]);
        return { items, total, page, limit };
    }
    async incComments(postId, delta) {
        return community_model_1.CommunityPost.findByIdAndUpdate(postId, { $inc: { commentsCount: delta } }, { new: true }).lean();
    }
    async incReactions(postId, delta) {
        return community_model_1.CommunityPost.findByIdAndUpdate(postId, { $inc: { reactionsCount: delta } }, { new: true }).lean();
    }
    // ── Comments ───────────────────────────────────────────
    async createComment(data) {
        return community_model_1.CommunityComment.create(data);
    }
    async findCommentById(id) {
        return community_model_1.CommunityComment.findById(id).lean();
    }
    async updateComment(id, content) {
        return community_model_1.CommunityComment.findByIdAndUpdate(id, { $set: { content } }, { new: true }).lean();
    }
    async deleteComment(id) {
        return community_model_1.CommunityComment.findByIdAndDelete(id).lean();
    }
    async listComments(postId, page, limit) {
        const skip = (page - 1) * limit;
        const filter = { postId };
        const [items, total] = await Promise.all([
            community_model_1.CommunityComment.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            community_model_1.CommunityComment.countDocuments(filter),
        ]);
        return { items, total, page, limit };
    }
    async deleteCommentsByPost(postId) {
        return community_model_1.CommunityComment.deleteMany({ postId });
    }
    // ── Reactions ──────────────────────────────────────────
    async findReaction(postId, userId) {
        return community_model_1.CommunityReaction.findOne({ postId, userId }).lean();
    }
    async upsertReaction(postId, userId, type) {
        return community_model_1.CommunityReaction.findOneAndUpdate({ postId, userId }, { $set: { type }, $setOnInsert: { postId, userId } }, { upsert: true, new: true }).lean();
    }
    async deleteReaction(postId, userId) {
        return community_model_1.CommunityReaction.findOneAndDelete({ postId, userId }).lean();
    }
    async deleteReactionsByPost(postId) {
        return community_model_1.CommunityReaction.deleteMany({ postId });
    }
    async countReactions(postId) {
        return community_model_1.CommunityReaction.countDocuments({ postId });
    }
    async countPosts() {
        return community_model_1.CommunityPost.countDocuments({});
    }
    async countComments() {
        return community_model_1.CommunityComment.countDocuments({});
    }
    async listAllPosts(page, limit) {
        return this.listPosts({}, page, limit);
    }
}
exports.CommunityRepository = CommunityRepository;
