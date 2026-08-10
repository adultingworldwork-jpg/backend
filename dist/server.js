"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config_1 = require("./config");
const app_1 = require("./app");
const seed_1 = require("./bootstrap/seed");
async function start() {
    const app = await (0, app_1.buildApp)();
    // Idempotent bootstrap (RBAC + default Super Admin when none exists)
    try {
        await (0, seed_1.runSeed)();
    }
    catch (err) {
        app.log.error({ err }, "Seed failed during startup");
        process.exit(1);
    }
    try {
        await app.listen({ port: config_1.config.app.port, host: "0.0.0.0" });
        app.log.info(`🚀 Server running on http://localhost:${config_1.config.app.port}`);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
}
start();
