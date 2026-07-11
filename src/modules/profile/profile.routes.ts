import { FastifyInstance } from "fastify";
import { ProfileController } from "./profile.controller";
import { authGuard, optionalAuthGuard } from "@/core/auth.guard";
import {
  validateBody,
  validateParams,
} from "@/core/validation.middleware";
import {
  updateProfileSchema,
  usernameParamSchema,
} from "./profile.schema";

export async function profileRoutes(app: FastifyInstance) {
  const controller = new ProfileController();

  app.get(
    "/me",
    { preHandler: [authGuard] },
    controller.getMe.bind(controller),
  );

  app.put(
    "/me",
    { preHandler: [authGuard, validateBody(updateProfileSchema)] },
    controller.updateMe.bind(controller),
  );

  // Media endpoints: auth required; body may be JSON ref or multipart
  app.patch(
    "/avatar",
    { preHandler: [authGuard] },
    controller.updateAvatar.bind(controller),
  );

  app.patch(
    "/cover",
    { preHandler: [authGuard] },
    controller.updateCover.bind(controller),
  );

  // Public lookup by auth username — visibility enforced in service
  app.get(
    "/:username",
    {
      preHandler: [optionalAuthGuard, validateParams(usernameParamSchema)],
    },
    controller.getByUsername.bind(controller),
  );
}
