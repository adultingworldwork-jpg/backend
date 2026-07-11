import { FastifyInstance } from "fastify";
import { lettersRoutes } from "./letters.routes";

export async function lettersModule(app: FastifyInstance) {
  await app.register(lettersRoutes);
}
