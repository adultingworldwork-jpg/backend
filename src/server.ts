import "dotenv/config";
import { config } from "@/config";
import { buildApp } from "./app";
import { runSeed } from "@/bootstrap/seed";

async function start() {
  const app = await buildApp();

  // Idempotent bootstrap (RBAC + default Super Admin when none exists)
  try {
    await runSeed();
  } catch (err) {
    app.log.error({ err }, "Seed failed during startup");
    process.exit(1);
  }

  try {
    await app.listen({ port: config.app.port, host: "0.0.0.0" });
    app.log.info(`🚀 Server running on http://localhost:${config.app.port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
