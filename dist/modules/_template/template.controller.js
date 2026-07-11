"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateController = void 0;
const template_service_1 = require("./template.service");
class TemplateController {
    async create(request, reply) {
        const service = new template_service_1.TemplateService(request.ctx);
        const data = await service.create(request.body);
        return reply.success(data);
    }
    async findAll(request, reply) {
        const service = new template_service_1.TemplateService(request.ctx);
        const data = await service.findAll();
        return reply.success(data);
    }
}
exports.TemplateController = TemplateController;
