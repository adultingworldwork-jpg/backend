"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadModule = uploadModule;
const upload_routes_1 = require("./upload.routes");
async function uploadModule(app) {
    await app.register(upload_routes_1.uploadRoutes);
}
