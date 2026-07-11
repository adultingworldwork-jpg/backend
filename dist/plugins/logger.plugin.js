"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const pino_1 = __importDefault(require("pino"));
const logger_1 = require("../config/logger");
async function loggerPlugin(app) {
    const logger = (0, pino_1.default)(logger_1.loggerConfig);
    // Decorate Fastify instance
    app.decorate('logger', logger);
    app.addHook('onRequest', async (request) => {
        request.log = logger;
    });
}
exports.default = (0, fastify_plugin_1.default)(loggerPlugin);
