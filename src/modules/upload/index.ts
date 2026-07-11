import { FastifyInstance } from "fastify";
import { uploadRoutes } from "./upload.routes";

export async function uploadModule(app: FastifyInstance) {
  await app.register(uploadRoutes);
}
