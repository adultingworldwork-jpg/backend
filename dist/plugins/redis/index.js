"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPlugins = registerPlugins;
const redis_plugin_1 = __importDefault(require("./redis.plugin"));
async function registerPlugins(app) {
    await app.register(redis_plugin_1.default);
}
