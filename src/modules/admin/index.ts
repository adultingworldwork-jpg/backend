import { FastifyInstance } from "fastify";
import { adminRoutes } from "./admin.routes";

export async function adminModule(app: FastifyInstance) {
  await app.register(adminRoutes);
}
