"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userModule = userModule;
const user_routes_1 = require("./user.routes");
async function userModule(app) {
    await app.register(user_routes_1.userRoutes);
}
