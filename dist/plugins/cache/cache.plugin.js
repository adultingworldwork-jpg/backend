"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const cache_service_1 = require("./cache.service");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    const cache = new cache_service_1.CacheService(app.redis);
    app.decorate('cache', cache);
});
