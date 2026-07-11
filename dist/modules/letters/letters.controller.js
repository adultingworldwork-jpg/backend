"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LettersController = void 0;
const letters_service_1 = require("./letters.service");
class LettersController {
    service(request) {
        return new letters_service_1.LettersService({
            ctx: request.ctx,
            audit: request.server.audit,
        });
    }
    async create(request, reply) {
        const data = await this.service(request).createLetter(request.body);
        return reply.success(data, 201);
    }
    async update(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).updateLetter(id, request.body);
        return reply.success(data);
    }
    async remove(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).deleteLetter(id);
        return reply.success(data);
    }
    async send(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).sendLetter(id);
        return reply.success(data);
    }
    async archive(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).archiveLetter(id);
        return reply.success(data);
    }
    async sent(request, reply) {
        const data = await this.service(request).getSent(request.query);
        return reply.success(data);
    }
    async inbox(request, reply) {
        const data = await this.service(request).getInbox(request.query);
        return reply.success(data);
    }
    async publicFeed(request, reply) {
        const data = await this.service(request).getPublicLetters(request.query);
        return reply.success(data);
    }
    async get(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).getLetter(id);
        return reply.success(data);
    }
}
exports.LettersController = LettersController;
