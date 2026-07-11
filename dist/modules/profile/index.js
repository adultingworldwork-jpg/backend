"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileModule = profileModule;
const profile_routes_1 = require("./profile.routes");
async function profileModule(app) {
    await app.register(profile_routes_1.profileRoutes);
}
