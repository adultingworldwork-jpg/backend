"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalController = void 0;
const journal_service_1 = require("./journal.service");
class JournalController {
    service(request) {
        return new journal_service_1.JournalService({
            ctx: request.ctx,
            audit: request.server.audit,
        });
    }
    async create(request, reply) {
        const data = await this.service(request).createEntry(request.body);
        return reply.success(data, 201);
    }
    async update(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).updateEntry(id, request.body);
        return reply.success(data);
    }
    async remove(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).deleteEntry(id);
        return reply.success(data);
    }
    async list(request, reply) {
        const data = await this.service(request).listEntries(request.query);
        return reply.success(data);
    }
    async get(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).getEntry(id);
        return reply.success(data);
    }
}
exports.JournalController = JournalController;
