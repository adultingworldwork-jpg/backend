import Fastify from "fastify";
import { setupPlugins } from "./core/register-plugins";
import { setupErrorHandler } from "./core/error-handler";
// import { registerModules } from "./core/register-modules"; // manual register
import { registerModules } from "@/core/module-loader"; //auto register
import { loggerConfig } from "@/config/logger";
import { loadEventListeners } from "./events/event.loader";
import fp from "fastify-plugin";
import cors from "@fastify/cors";

export async function buildApp() {
  const app = Fastify({
    logger: loggerConfig,
    // Atlas / cold connections can exceed the default 10s plugin boot window
    pluginTimeout: 60_000,
  });

  // Global error envelope — register early so all routes share it
  setupErrorHandler(app);

  await setupPlugins(app);
  await registerModules(app);

  await app.register(cors, {
    origin: [
      "http://localhost:3000",
      "https://audulting101.vercel.app/", 
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  /**
   * this is an experimental feature
   * enabling this will allow you to use socket io in your application
   * but may behave unexpectedly
   */

  // await loadEventListeners(app.event);

  return app;
}
