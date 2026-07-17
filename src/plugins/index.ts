import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { config } from "@/config";

import corsPlugin from "./cors.plugin";
import multipartPlugin from "./multipart.plugin";
import responsePlugin from "./response.plugin";
import contextPlugin from "./context.plugin";
import servicesPlugin from "./services.plugin";
import jwtPlugin from "./jwt.plugin";
import metricsPlugin from "./metrics.plugin";
import auditPlugin from "./audit/audit.plugin";
import swaggerPlugin from "./swagger/swagger.plugin";

import redisPlugin from "./redis/redis.plugin";
import cachePlugin from "./cache/cache.plugin";
import queuePlugin from "./queue/queue.plugin";
import eventsPlugin from "./events/events.plugin";
import cloudinaryPlugin from "./cloudinary/cloudinary.plugin";
import realtimePlugin from "./realtime/realtime.plugin";
import presencePlugin from "./presence/presence.plugin";
import rateLimitPlugin from "./rate-limit/rate-limit.plugin";

type DbProvider = "mongodb";

const dbPluginMap: Record<
  DbProvider,
  () => Promise<{ default: FastifyPluginAsync }>
> = {
  mongodb: () => import("./db-mongoose/mongoose.plugin"),
};

export async function registerPlugins(app: FastifyInstance) {
  const provider = config.db.provider as DbProvider;
  const loader = dbPluginMap[provider];

  if (!loader) {
    throw new Error(`Unsupported DB provider: ${provider}`);
  }

  // Always-on platform plugins
  await app.register(corsPlugin);
  await app.register(multipartPlugin);

  // OpenAPI / Swagger UI — register before routes so all modules are documented
  await app.register(swaggerPlugin);

  const dbPlugin = await loader();
  await app.register(dbPlugin.default);

  await app.register(jwtPlugin);
  await app.register(responsePlugin);
  await app.register(metricsPlugin);
  await app.register(contextPlugin);
  await app.register(auditPlugin);
  // services depend on jwt + audit + ctx
  await app.register(servicesPlugin);

  const enabled = config.app.plugins;
  const isEnabled = (name: string) => enabled.includes(name);

  // Cloudinary: enable via PLUGINS=cloudinary (or always when credentials present)
  if (isEnabled("cloudinary") || config.cloudinary.cloudName) {
    await app.register(cloudinaryPlugin);
  }

  if (isEnabled("redis")) {
    await app.register(redisPlugin);
  }

  if (isEnabled("cache")) {
    if (!isEnabled("redis")) {
      app.log.warn("Cache plugin requires Redis plugin.");
    } else {
      await app.register(cachePlugin);
    }
  }

  if (isEnabled("queue")) {
    if (!isEnabled("redis")) {
      app.log.warn("Queue plugin requires Redis plugin.");
    } else {
      await app.register(queuePlugin);
    }
  }

  if (isEnabled("events")) {
    if (!isEnabled("redis")) {
      app.log.warn("Events plugin requires Redis plugin.");
    } else {
      await app.register(eventsPlugin);
    }
  }

  // Presence + rate-limit optional (redis); realtime uses memory fallback if absent
  if (isEnabled("presence")) {
    if (!isEnabled("redis")) {
      app.log.warn("Presence plugin requires Redis; using memory presence.");
    } else {
      await app.register(presencePlugin);
    }
  }

  if (isEnabled("rate-limit") || isEnabled("rateLimit")) {
    if (!isEnabled("redis")) {
      app.log.warn("Rate-limit plugin requires Redis; skipping.");
    } else {
      await app.register(rateLimitPlugin);
    }
  }

  // Socket.IO framework — always registered for chat (memory presence if no Redis)
  await app.register(realtimePlugin);
}
