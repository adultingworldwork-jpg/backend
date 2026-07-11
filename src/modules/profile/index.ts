import { FastifyInstance } from "fastify";
import { profileRoutes } from "./profile.routes";

export async function profileModule(app: FastifyInstance) {
  await app.register(profileRoutes);
}
