"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourcesController = void 0;
const resources_service_1 = require("./resources.service");
class ResourcesController {
    service(request) {
        return new resources_service_1.ResourcesService({
            ctx: request.ctx,
            audit: request.server.audit,
        });
    }
    async create(request, reply) {
        const data = await this.service(request).createResource(request.body);
        return reply.success(data, 201);
    }
    async update(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).updateResource(id, request.body);
        return reply.success(data);
    }
    async remove(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).deleteResource(id);
        return reply.success(data);
    }
    async publish(request, reply) {
        const { id } = request.params;
        const data = await this.service(request).publishResource(id);
        return reply.success(data);
    }
    async list(request, reply) {
        const data = await this.service(request).listPublished(request.query);
        return reply.success(data);
    }
    async featured(request, reply) {
        const data = await this.service(request).listFeatured(request.query);
        return reply.success(data);
    }
    async byCategory(request, reply) {
        const { category } = request.params;
        const data = await this.service(request).listByCategory(category, request.query);
        return reply.success(data);
    }
    async byTag(request, reply) {
        const { tag } = request.params;
        const data = await this.service(request).listByTag(tag, request.query);
        return reply.success(data);
    }
    async bySlug(request, reply) {
        const { slug } = request.params;
        const data = await this.service(request).getResource(slug);
        return reply.success(data);
    }
    async mine(request, reply) {
        const data = await this.service(request).getMyResources(request.query);
        return reply.success(data);
    }
}
exports.ResourcesController = ResourcesController;
