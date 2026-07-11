"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const config_1 = require("@/config");
const cloudinary_service_1 = require("./cloudinary.service");
async function cloudinaryPlugin(app) {
    const storage = new cloudinary_service_1.CloudinaryStorageService(config_1.config.cloudinary);
    if (!storage.configured) {
        app.log.warn("Cloudinary plugin enabled but CLOUDINARY_* env vars are incomplete. Uploads will fail until configured.");
    }
    else {
        app.log.info("Cloudinary storage configured");
    }
    app.decorate("storage", storage);
}
exports.default = (0, fastify_plugin_1.default)(cloudinaryPlugin, {
    name: "cloudinary",
});
