"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const event_service_1 = require("../../events/event.service");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    const event = new event_service_1.EventService(app.queue);
    app.decorate('event', event);
    console.log('Event plugin registered');
});
