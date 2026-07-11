"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authModule = authModule;
const auth_routes_1 = require("./auth.routes");
async function authModule(app) {
    await app.register(auth_routes_1.authRoutes);
}
