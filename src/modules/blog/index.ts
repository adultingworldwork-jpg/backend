import { FastifyInstance } from "fastify";
import { blogRoutes } from "./blog.routes";

export async function blogModule(app: FastifyInstance) {
  await app.register(blogRoutes);
}
