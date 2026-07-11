"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminModule = adminModule;
const admin_routes_1 = require("./admin.routes");
async function adminModule(app) {
    await app.register(admin_routes_1.adminRoutes);
}
