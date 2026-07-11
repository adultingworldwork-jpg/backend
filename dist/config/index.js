"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const env_1 = require("./env");
exports.config = {
    app: {
        env: env_1.env.NODE_ENV,
        port: env_1.env.PORT,
        api: {
            prefix: env_1.env.API_PREFIX,
            version: env_1.env.API_VERSION,
        },
        plugins: env_1.env.PLUGINS.split(",")
            .map((p) => p.trim())
            .filter((p) => p.length > 0),
        corsOrigin: env_1.env.CORS_ORIGIN.split(",")
            .map((o) => o.trim())
            .filter((o) => o.length > 0),
    },
    db: {
        url: env_1.env.MONGO_URI,
        provider: env_1.env.DB_PROVIDER,
    },
    jwt: {
        secret: env_1.env.JWT_SECRET,
    },
    log: {
        level: env_1.env.LOG_LEVEL,
    },
    redis: {
        host: env_1.env.REDIS_HOST,
        port: env_1.env.REDIS_PORT,
        password: env_1.env.REDIS_PASSWORD,
    },
    cloudinary: {
        cloudName: env_1.env.CLOUDINARY_CLOUD_NAME,
        apiKey: env_1.env.CLOUDINARY_API_KEY,
        apiSecret: env_1.env.CLOUDINARY_API_SECRET,
        folder: env_1.env.CLOUDINARY_FOLDER,
    },
};
