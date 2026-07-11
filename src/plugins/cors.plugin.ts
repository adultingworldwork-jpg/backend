import fp from "fastify-plugin";
import cors from "@fastify/cors";
import { FastifyInstance } from "fastify";
import { config } from "@/config";

/**
 * CORS for browser clients (Next.js). Registered through the framework plugin layer.
 */
async function corsPlugin(app: FastifyInstance) {
  const origins = config.app.corsOrigin;

  await app.register(cors, {
    origin: origins.length === 1 && origins[0] === "*" ? true : origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.log.info({ origins }, "CORS enabled");
}

export default fp(corsPlugin);
