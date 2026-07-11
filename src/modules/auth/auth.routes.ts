import { FastifyInstance } from "fastify";
import { AuthController } from "./auth.controller";
import { authGuard } from "@/core/auth.guard";
import { validateBody } from "@/core/validation.middleware";
import {
  loginSchema,
  logoutSchema,
  recoverSchema,
  refreshSchema,
  registerSchema,
} from "./auth.schema";

export async function authRoutes(app: FastifyInstance) {
  const controller = new AuthController();

  app.post(
    "/register",
    { preHandler: [validateBody(registerSchema)] },
    controller.register.bind(controller),
  );

  app.post(
    "/login",
    { preHandler: [validateBody(loginSchema)] },
    controller.login.bind(controller),
  );

  app.post(
    "/recover",
    { preHandler: [validateBody(recoverSchema)] },
    controller.recover.bind(controller),
  );

  app.post(
    "/refresh",
    { preHandler: [validateBody(refreshSchema)] },
    controller.refresh.bind(controller),
  );

  app.get(
    "/me",
    { preHandler: [authGuard] },
    controller.me.bind(controller),
  );

  app.post(
    "/logout",
    {
      preHandler: [
        // Optional auth — allow body-only refresh revoke
        async (request, reply) => {
          const header = request.headers.authorization;
          if (header) {
            await authGuard(request, reply);
          }
        },
      ],
    },
    async (request, reply) => {
      // Body optional for logout
      if (request.body && typeof request.body === "object") {
        const parsed = logoutSchema.safeParse(request.body);
        if (!parsed.success) {
          throw parsed.error;
        }
        request.body = parsed.data;
      } else {
        request.body = {};
      }
      return controller.logout(request, reply);
    },
  );
}
