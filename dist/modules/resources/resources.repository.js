"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourcesRepository = void 0;
const resources_model_1 = require("./resources.model");
class ResourcesRepository {
    async create(data) {
        return resources_model_1.Resource.create(data);
    }
    async findById(id) {
        return resources_model_1.Resource.findById(id).lean();
    }
    async findBySlug(slug) {
        return resources_model_1.Resource.findOne({ slug }).lean();
    }
    async slugExists(slug, excludeId) {
        const q = { slug };
        if (excludeId)
            q._id = { $ne: excludeId };
        const found = await resources_model_1.Resource.findOne(q).select("_id").lean();
        return Boolean(found);
    }
    async updateById(id, patch) {
        return resources_model_1.Resource.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    }
    async deleteById(id) {
        return resources_model_1.Resource.findByIdAndDelete(id).lean();
    }
    async listPublished(page, limit) {
        return this.paginate({ status: "PUBLISHED" }, page, limit, { publishedAt: -1, createdAt: -1 });
    }
    async listFeatured(page, limit) {
        return this.paginate({ status: "PUBLISHED", featured: true }, page, limit, { publishedAt: -1, createdAt: -1 });
    }
    async listByCategory(category, page, limit) {
        // Case-insensitive category match via normalized storage or regex
        return this.paginate({
            status: "PUBLISHED",
            category: new RegExp(`^${escapeRegex(category)}$`, "i"),
        }, page, limit, { publishedAt: -1, createdAt: -1 });
    }
    async listByTag(tag, page, limit) {
        return this.paginate({ status: "PUBLISHED", tags: tag }, page, limit, { publishedAt: -1, createdAt: -1 });
    }
    async listByAuthor(authorId, page, limit) {
        return this.paginate({ authorId }, page, limit, { updatedAt: -1 });
    }
    async countAll() {
        return resources_model_1.Resource.countDocuments({});
    }
    async listAll(page, limit) {
        return this.paginate({}, page, limit, { createdAt: -1 });
    }
    async paginate(filter, page, limit, sort) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            resources_model_1.Resource.find(filter).sort(sort).skip(skip).limit(limit).lean(),
            resources_model_1.Resource.countDocuments(filter),
        ]);
        return { items, total, page, limit };
    }
}
exports.ResourcesRepository = ResourcesRepository;
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
