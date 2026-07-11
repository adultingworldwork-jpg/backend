"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerModules = registerModules;
const user_1 = require("@/modules/user");
const health_1 = require("@/modules/health");
async function registerModules(app) {
    await app.register(health_1.healthModule, { prefix: '/api/health' });
    await app.register(user_1.userModule, { prefix: '/api' });
}
