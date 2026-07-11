"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(["development", "production", "test"])
        .default("development"),
    PORT: zod_1.z.coerce.number().default(3000),
    DB_PROVIDER: zod_1.z.literal("mongodb"),
    MONGO_URI: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(10),
    LOG_LEVEL: zod_1.z.enum(["info", "warn", "error", "debug"]).default("info"),
    API_PREFIX: zod_1.z.string().default("/api"),
    API_VERSION: zod_1.z.string().default("v1"),
    REDIS_HOST: zod_1.z.string().default("127.0.0.1"),
    REDIS_PORT: zod_1.z.coerce.number().default(6379),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    PLUGINS: zod_1.z.string().default(""),
    /** Comma-separated browser origins allowed by CORS (e.g. http://localhost:3001) */
    CORS_ORIGIN: zod_1.z.string().default("http://localhost:3001"),
    /** Cloudinary (required when PLUGINS includes cloudinary) */
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().optional(),
    CLOUDINARY_API_KEY: zod_1.z.string().optional(),
    CLOUDINARY_API_SECRET: zod_1.z.string().optional(),
    CLOUDINARY_FOLDER: zod_1.z.string().default("adulting101"),
});
