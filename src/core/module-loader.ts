import * as fs from "fs";
import * as path from "path";
import { FastifyInstance } from "fastify";
import { toKebabCase } from "@/utils/string/case";
import { config } from "@/config";
import { setupErrorHandler } from "@/core/error-handler";

export async function registerModules(app: FastifyInstance) {
  const modulesPath = path.resolve(__dirname, "..", "modules");
  const moduleDirs = fs
    .readdirSync(modulesPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name);
  const basePrefix = `${config.app.api.prefix}/${config.app.api.version}`;
  const moduleFileName = path.extname(__filename) === ".js" ? "index.js" : "index.ts";

  for (const dir of moduleDirs) {
    const modulePath = path.join(modulesPath, dir, moduleFileName);

    if (!fs.existsSync(modulePath)) continue;

    const moduleImport = require(modulePath);
    const moduleFunction = moduleImport[`${dir}Module`];

    if (typeof moduleFunction === "function") {
      const systemModules = ["health", "metrics"];
      const isSystemModule = systemModules.includes(dir);

      const prefix = isSystemModule
        ? ""
        : `${basePrefix}/${toKebabCase(dir)}`;

      // Register inside a child context that shares the standard error envelope.
      // Fastify error handlers are encapsulated — root setErrorHandler alone
      // does not apply to routes registered via app.register without this.
      await app.register(
        async (instance) => {
          setupErrorHandler(instance);
          await moduleFunction(instance);
        },
        { prefix },
      );

      app.log.info(`✅ Module loaded: ${dir}`);
    }
  }
}
