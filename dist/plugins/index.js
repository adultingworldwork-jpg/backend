"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPlugins = registerPlugins;
const config_1 = require("../config");
const cors_plugin_1 = __importDefault(require("./cors.plugin"));
const multipart_plugin_1 = __importDefault(require("./multipart.plugin"));
const response_plugin_1 = __importDefault(require("./response.plugin"));
const context_plugin_1 = __importDefault(require("./context.plugin"));
const services_plugin_1 = __importDefault(require("./services.plugin"));
const jwt_plugin_1 = __importDefault(require("./jwt.plugin"));
const metrics_plugin_1 = __importDefault(require("./metrics.plugin"));
const audit_plugin_1 = __importDefault(require("./audit/audit.plugin"));
const swagger_plugin_1 = __importDefault(require("./swagger/swagger.plugin"));
const redis_plugin_1 = __importDefault(require("./redis/redis.plugin"));
const cache_plugin_1 = __importDefault(require("./cache/cache.plugin"));
const queue_plugin_1 = __importDefault(require("./queue/queue.plugin"));
const events_plugin_1 = __importDefault(require("./events/events.plugin"));
const cloudinary_plugin_1 = __importDefault(require("./cloudinary/cloudinary.plugin"));
const realtime_plugin_1 = __importDefault(require("./realtime/realtime.plugin"));
const presence_plugin_1 = __importDefault(require("./presence/presence.plugin"));
const rate_limit_plugin_1 = __importDefault(require("./rate-limit/rate-limit.plugin"));
const dbPluginMap = {
    mongodb: () => Promise.resolve().then(() => __importStar(require("./db-mongoose/mongoose.plugin"))),
};
async function registerPlugins(app) {
    const provider = config_1.config.db.provider;
    const loader = dbPluginMap[provider];
    if (!loader) {
        throw new Error(`Unsupported DB provider: ${provider}`);
    }
    // Always-on platform plugins
    await app.register(cors_plugin_1.default);
    await app.register(multipart_plugin_1.default);
    // OpenAPI / Swagger UI — register before routes so all modules are documented
    await app.register(swagger_plugin_1.default);
    const dbPlugin = await loader();
    await app.register(dbPlugin.default);
    await app.register(jwt_plugin_1.default);
    await app.register(response_plugin_1.default);
    await app.register(metrics_plugin_1.default);
    await app.register(context_plugin_1.default);
    await app.register(audit_plugin_1.default);
    // services depend on jwt + audit + ctx
    await app.register(services_plugin_1.default);
    const enabled = config_1.config.app.plugins;
    const isEnabled = (name) => enabled.includes(name);
    // Cloudinary: enable via PLUGINS=cloudinary (or always when credentials present)
    if (isEnabled("cloudinary") || config_1.config.cloudinary.cloudName) {
        await app.register(cloudinary_plugin_1.default);
    }
    if (isEnabled("redis")) {
        await app.register(redis_plugin_1.default);
    }
    if (isEnabled("cache")) {
        if (!isEnabled("redis")) {
            app.log.warn("Cache plugin requires Redis plugin.");
        }
        else {
            await app.register(cache_plugin_1.default);
        }
    }
    if (isEnabled("queue")) {
        if (!isEnabled("redis")) {
            app.log.warn("Queue plugin requires Redis plugin.");
        }
        else {
            await app.register(queue_plugin_1.default);
        }
    }
    if (isEnabled("events")) {
        if (!isEnabled("redis")) {
            app.log.warn("Events plugin requires Redis plugin.");
        }
        else {
            await app.register(events_plugin_1.default);
        }
    }
    // Presence + rate-limit optional (redis); realtime uses memory fallback if absent
    if (isEnabled("presence")) {
        if (!isEnabled("redis")) {
            app.log.warn("Presence plugin requires Redis; using memory presence.");
        }
        else {
            await app.register(presence_plugin_1.default);
        }
    }
    if (isEnabled("rate-limit") || isEnabled("rateLimit")) {
        if (!isEnabled("redis")) {
            app.log.warn("Rate-limit plugin requires Redis; skipping.");
        }
        else {
            await app.register(rate_limit_plugin_1.default);
        }
    }
    // Socket.IO framework — always registered for chat (memory presence if no Redis)
    await app.register(realtime_plugin_1.default);
}
