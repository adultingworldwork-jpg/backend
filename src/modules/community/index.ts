import { FastifyInstance } from "fastify";
import { communityRoutes } from "./community.routes";

export async function communityModule(app: FastifyInstance) {
  await app.register(communityRoutes);
}
