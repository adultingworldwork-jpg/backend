"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogRepository = void 0;
const blog_model_1 = require("./blog.model");
class BlogRepository {
    async create(data) {
        return blog_model_1.Blog.create(data);
    }
    async findById(id) {
        return blog_model_1.Blog.findById(id).lean();
    }
    async findBySlug(slug) {
        return blog_model_1.Blog.findOne({ slug }).lean();
    }
    async slugExists(slug, excludeId) {
        const q = { slug };
        if (excludeId)
            q._id = { $ne: excludeId };
        const found = await blog_model_1.Blog.findOne(q).select("_id").lean();
        return Boolean(found);
    }
    async updateById(id, patch) {
        return blog_model_1.Blog.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    }
    async deleteById(id) {
        return blog_model_1.Blog.findByIdAndDelete(id).lean();
    }
    async findPublished(page, limit) {
        const filter = { status: "PUBLISHED" };
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            blog_model_1.Blog.find(filter)
                .sort({ publishedAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            blog_model_1.Blog.countDocuments(filter),
        ]);
        return { items, total, page, limit };
    }
    async findByAuthor(authorId, page, limit) {
        const filter = { authorId };
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            blog_model_1.Blog.find(filter)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            blog_model_1.Blog.countDocuments(filter),
        ]);
        return { items, total, page, limit };
    }
    async findPublishedByTag(tag, page, limit) {
        const filter = { status: "PUBLISHED", tags: tag };
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            blog_model_1.Blog.find(filter)
                .sort({ publishedAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            blog_model_1.Blog.countDocuments(filter),
        ]);
        return { items, total, page, limit };
    }
    async countAll() {
        return blog_model_1.Blog.countDocuments({});
    }
    async listAll(page, limit) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            blog_model_1.Blog.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            blog_model_1.Blog.countDocuments({}),
        ]);
        return { items, total, page, limit };
    }
}
exports.BlogRepository = BlogRepository;
