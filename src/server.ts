import "dotenv/config";
import { config } from "@/config";
import { buildApp } from "./app";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.app.port, host: "0.0.0.0" });
    app.log.info(`🚀 Server running on http://localhost:${config.app.port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
