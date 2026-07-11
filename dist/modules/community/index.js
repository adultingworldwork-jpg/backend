"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityModule = communityModule;
const community_routes_1 = require("./community.routes");
async function communityModule(app) {
    await app.register(community_routes_1.communityRoutes);
}
