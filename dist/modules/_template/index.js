"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateModule = templateModule;
const template_routes_1 = require("./template.routes");
async function templateModule(app) {
    await app.register(template_routes_1.templateRoutes);
}
