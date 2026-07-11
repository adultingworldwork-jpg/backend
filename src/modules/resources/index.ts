import { FastifyInstance } from "fastify";
import { resourcesRoutes } from "./resources.routes";

export async function resourcesModule(app: FastifyInstance) {
  await app.register(resourcesRoutes);
}
