"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const mongoose_adapter_1 = require("./mongoose.adapter");
async function mongoosePlugin(app) {
    const db = new mongoose_adapter_1.MongooseAdapter();
    await db.connect();
    app.decorate("db", db);
    app.addHook("onClose", async () => {
        await db.disconnect();
    });
}
exports.default = (0, fastify_plugin_1.default)(mongoosePlugin);
