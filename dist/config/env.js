"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const env_schema_1 = require("./env.schema");
function loadEnv() {
    const rawEnv = { ...process.env };
    if ((rawEnv.NODE_ENV ?? "development") === "test") {
        rawEnv.MONGO_URI ?? (rawEnv.MONGO_URI = "mongodb://localhost:27017/nodejs_framework_test");
        rawEnv.DB_PROVIDER ?? (rawEnv.DB_PROVIDER = "mongodb");
        rawEnv.JWT_SECRET ?? (rawEnv.JWT_SECRET = "test-secret-12345");
        rawEnv.REDIS_HOST ?? (rawEnv.REDIS_HOST = "127.0.0.1");
        rawEnv.REDIS_PORT ?? (rawEnv.REDIS_PORT = "6379");
        rawEnv.PLUGINS ?? (rawEnv.PLUGINS = "");
    }
    const parsed = env_schema_1.envSchema.safeParse(rawEnv);
    if (!parsed.success) {
        console.error("❌ Invalid environment variables");
        console.error(parsed.error.format());
        throw new Error("Invalid environment variables");
    }
    return parsed.data;
}
exports.env = loadEnv();
