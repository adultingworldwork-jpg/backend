import { FastifyInstance } from "fastify";
import { UserController } from "./user.controller";

/**
 * Legacy/stub user listing — hidden from public OpenAPI docs.
 * Prefer Admin `/api/v1/admin/users` for production user management.
 */
export async function userRoutes(app: FastifyInstance) {
  const controller = new UserController();

  app.get(
    "/",
    {
      schema: {
        hide: true,
        tags: ["Users"],
        summary: "List users (legacy stub — hidden)",
        description:
          "Internal/legacy endpoint without production auth guarantees. Use Admin APIs instead.",
        deprecated: true,
      },
    },
    controller.getUsers.bind(controller),
  );
}
