"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
async function responsePlugin(app) {
    app.decorateReply('success', function (data, statusCode = 200) {
        this.status(statusCode).send({
            success: true,
            data,
            error: null,
        });
    });
    app.decorateReply('error', function (error, statusCode = 500) {
        this.status(statusCode).send({
            success: false,
            data: null,
            error,
        });
    });
}
exports.default = (0, fastify_plugin_1.default)(responsePlugin);
