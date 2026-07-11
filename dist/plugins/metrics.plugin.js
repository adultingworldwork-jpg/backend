"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const metrics_1 = require("@/core/metrics");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    app.addHook('onRequest', async (request) => {
        request.startTime = process.hrtime();
    });
    app.addHook('onResponse', async (request, reply) => {
        const diff = process.hrtime(request.startTime);
        const duration = diff[0] + diff[1] / 1e9;
        const route = request.routeOptions?.url ?? request.url;
        metrics_1.httpRequestsTotal.inc({
            method: request.method,
            route,
            status: reply.statusCode,
        });
        metrics_1.httpRequestDuration.observe({
            method: request.method,
            route,
            status: reply.statusCode,
        }, duration);
    });
});
