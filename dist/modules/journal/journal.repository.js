"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalRepository = void 0;
const journal_model_1 = require("./journal.model");
class JournalRepository {
    async create(data) {
        return journal_model_1.Journal.create(data);
    }
    /**
     * Always query by ownerId — never fetch by id alone for authorization paths.
     */
    async findByIdForOwner(id, ownerId) {
        return journal_model_1.Journal.findOne({ _id: id, ownerId }).lean();
    }
    async updateForOwner(id, ownerId, patch) {
        return journal_model_1.Journal.findOneAndUpdate({ _id: id, ownerId }, { $set: patch }, { new: true }).lean();
    }
    async deleteForOwner(id, ownerId) {
        return journal_model_1.Journal.findOneAndDelete({ _id: id, ownerId }).lean();
    }
    async listForOwner(ownerId, filter, page, limit) {
        const q = { ownerId };
        if (filter.mood)
            q.mood = filter.mood;
        if (filter.tag)
            q.tags = filter.tag;
        if (filter.from || filter.to) {
            const createdAt = {};
            if (filter.from)
                createdAt.$gte = filter.from;
            if (filter.to)
                createdAt.$lte = filter.to;
            q.createdAt = createdAt;
        }
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            journal_model_1.Journal.find(q)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            journal_model_1.Journal.countDocuments(q),
        ]);
        return { items, total, page, limit };
    }
    /** Aggregate count only — never expose content to admins. */
    async countAll() {
        return journal_model_1.Journal.countDocuments({});
    }
}
exports.JournalRepository = JournalRepository;
