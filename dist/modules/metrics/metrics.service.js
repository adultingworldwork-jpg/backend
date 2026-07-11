"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsService = void 0;
const metrics_repository_1 = require("./metrics.repository");
class metricsService {
    constructor() {
        this.repo = new metrics_repository_1.metricsRepository();
    }
    async findAll() {
        return this.repo.findAll();
    }
}
exports.metricsService = metricsService;
