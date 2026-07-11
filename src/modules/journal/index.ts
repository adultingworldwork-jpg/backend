import { FastifyInstance } from "fastify";
import { journalRoutes } from "./journal.routes";

export async function journalModule(app: FastifyInstance) {
  await app.register(journalRoutes);
}
