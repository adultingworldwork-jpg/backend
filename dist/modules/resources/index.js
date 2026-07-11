"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourcesModule = resourcesModule;
const resources_routes_1 = require("./resources.routes");
async function resourcesModule(app) {
    await app.register(resources_routes_1.resourcesRoutes);
}
