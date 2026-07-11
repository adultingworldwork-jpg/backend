"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const register_plugins_1 = require("./core/register-plugins");
const error_handler_1 = require("./core/error-handler");
// import { registerModules } from "./core/register-modules"; // manual register
const module_loader_1 = require("./core/module-loader"); //auto register
const logger_1 = require("./config/logger");
async function buildApp() {
    const app = (0, fastify_1.default)({
        logger: logger_1.loggerConfig,
        // Atlas / cold connections can exceed the default 10s plugin boot window
        pluginTimeout: 60000,
    });
    // Global error envelope — register early so all routes share it
    (0, error_handler_1.setupErrorHandler)(app);
    await (0, register_plugins_1.setupPlugins)(app);
    await (0, module_loader_1.registerModules)(app);
    /**
     * this is an experimental feature
     * enabling this will allow you to use socket io in your application
     * but may behave unexpectedly
     */
    // await loadEventListeners(app.event);
    return app;
}
