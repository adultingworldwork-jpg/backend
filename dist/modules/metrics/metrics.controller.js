"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsController = void 0;
const metrics_service_1 = require("./metrics.service");
class metricsController {
    async findAll(request, reply) {
        const service = new metrics_service_1.metricsService();
        const data = await service.findAll();
        return reply.success(data);
    }
}
exports.metricsController = metricsController;
