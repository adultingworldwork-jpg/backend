"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config_1 = require("./config");
const app_1 = require("./app");
async function start() {
    const app = await (0, app_1.buildApp)();
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
