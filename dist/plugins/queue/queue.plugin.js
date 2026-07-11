"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const queue_service_1 = require("./queue.service");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    const queue = new queue_service_1.QueueService(app.redis);
    app.decorate('queue', queue);
});
