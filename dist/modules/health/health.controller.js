"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const health_service_1 = require("./health.service");
const healthService = new health_service_1.HealthService();
class HealthController {
    async check(request, reply) {
        request.log.info('Health check triggered');
        const data = healthService.getStatus();
        return reply.send({
            success: true,
            data,
        });
    }
}
exports.HealthController = HealthController;
