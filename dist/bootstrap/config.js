"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const env_schema_1 = require("../config/env.schema");
function loadConfig() {
    const parsed = env_schema_1.envSchema.parse(process.env);
    return parsed;
}
