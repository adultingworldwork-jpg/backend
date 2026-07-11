"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LettersRepository = void 0;
const letters_model_1 = require("./letters.model");
class LettersRepository {
    async create(data) {
        return letters_model_1.Letter.create({
            ...data,
            deliveredAt: null,
            readAt: null,
            archivedAt: null,
        });
    }
    async findById(id) {
        return letters_model_1.Letter.findById(id).lean();
    }
    async updateById(id, patch) {
        return letters_model_1.Letter.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    }
    async deleteById(id) {
        return letters_model_1.Letter.findByIdAndDelete(id).lean();
    }
    async listSent(senderId, page, limit) {
        // All letters authored by sender (drafts + sent + read + archived)
        return this.paginate({ senderId }, page, limit, { createdAt: -1 });
    }
    async listInbox(recipientId, page, limit) {
        // Received private letters not yet archived
        const q = {
            recipientId,
            type: "PRIVATE",
            status: { $in: ["SENT", "READ"] },
        };
        return this.paginate(q, page, limit, { deliveredAt: -1, createdAt: -1 });
    }
    async listPublic(page, limit) {
        // Public feed: PUBLIC + SENT only
        return this.paginate({ type: "PUBLIC", status: "SENT" }, page, limit, { deliveredAt: -1, createdAt: -1 });
    }
    /** Admin moderation list: PUBLIC letters only (any status). */
    async listPublicAll(page, limit) {
        return this.paginate({ type: "PUBLIC" }, page, limit, { createdAt: -1 });
    }
    async countAll() {
        return letters_model_1.Letter.countDocuments({});
    }
    async paginate(filter, page, limit, sort) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            letters_model_1.Letter.find(filter).sort(sort).skip(skip).limit(limit).lean(),
            letters_model_1.Letter.countDocuments(filter),
        ]);
        return { items, total, page, limit };
    }
}
exports.LettersRepository = LettersRepository;
