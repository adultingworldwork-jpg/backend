"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const crypto_1 = require("crypto");
/**
 * Request Context Plugin
 * Attaches requestId, client metadata, and a child logger to every request.
 * Auth guard enriches ctx.user after successful JWT verification.
 */
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    app.addHook("onRequest", async (request) => {
        const requestId = request.headers["x-request-id"]?.trim() ||
            (0, crypto_1.randomUUID)();
        const forwarded = request.headers["x-forwarded-for"];
        const ip = (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ||
            request.ip;
        request.ctx = {
            requestId,
            ip,
            userAgent: request.headers["user-agent"],
            method: request.method,
            path: request.url,
        };
        request.log = request.log.child({
            requestId,
            ip,
            method: request.method,
            path: request.url,
        });
    });
}, {
    name: "request-context",
});
