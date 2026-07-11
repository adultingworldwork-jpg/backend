"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const cors_1 = __importDefault(require("@fastify/cors"));
const config_1 = require("@/config");
/**
 * CORS for browser clients (Next.js). Registered through the framework plugin layer.
 */
async function corsPlugin(app) {
    const origins = config_1.config.app.corsOrigin;
    await app.register(cors_1.default, {
        origin: origins.length === 1 && origins[0] === "*" ? true : origins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });
    app.log.info({ origins }, "CORS enabled");
}
exports.default = (0, fastify_plugin_1.default)(corsPlugin);
