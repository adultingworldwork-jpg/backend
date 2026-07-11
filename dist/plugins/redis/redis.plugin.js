"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../../config");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    const redis = new ioredis_1.default({
        host: config_1.config.redis.host,
        port: config_1.config.redis.port,
        password: config_1.config.redis.password,
    });
    redis.on('connect', () => {
        app.log.info('✅ Redis connected');
    });
    redis.on('error', (err) => {
        app.log.error({ err }, '❌ Redis error');
    });
    app.decorate('redis', redis);
    app.addHook('onClose', async () => {
        await redis.quit();
    });
});
