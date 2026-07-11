"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const rate_limit_service_1 = require("./rate-limit.service");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    const service = new rate_limit_service_1.RateLimitService(app.redis);
    app.decorate('rateLimit', service);
});
