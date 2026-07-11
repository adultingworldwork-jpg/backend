"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const presence_service_1 = require("./presence.service");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    const presence = new presence_service_1.PresenceService(app.redis);
    app.decorate('presence', presence);
});
