import { FastifyInstance } from "fastify";
import { LettersController } from "./letters.controller";
import { authGuard, optionalAuthGuard } from "@/core/auth.guard";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/core/validation.middleware";
import {
  createLetterSchema,
  letterIdParamSchema,
  letterListQuerySchema,
  updateLetterSchema,
} from "./letters.schema";

export async function lettersRoutes(app: FastifyInstance) {
  const c = new LettersController();

  // Static multi-segment paths first
  app.post(
    "/",
    { preHandler: [authGuard, validateBody(createLetterSchema)] },
    c.create.bind(c),
  );

  app.get(
    "/me/sent",
    {
      preHandler: [authGuard, validateQuery(letterListQuerySchema)],
    },
    c.sent.bind(c),
  );

  app.get(
    "/me/inbox",
    {
      preHandler: [authGuard, validateQuery(letterListQuerySchema)],
    },
    c.inbox.bind(c),
  );

  app.get(
    "/public",
    {
      preHandler: [optionalAuthGuard, validateQuery(letterListQuerySchema)],
    },
    c.publicFeed.bind(c),
  );

  app.post(
    "/:id/send",
    {
      preHandler: [authGuard, validateParams(letterIdParamSchema)],
    },
    c.send.bind(c),
  );

  app.post(
    "/:id/archive",
    {
      preHandler: [authGuard, validateParams(letterIdParamSchema)],
    },
    c.archive.bind(c),
  );

  app.put(
    "/:id",
    {
      preHandler: [
        authGuard,
        validateParams(letterIdParamSchema),
        validateBody(updateLetterSchema),
      ],
    },
    c.update.bind(c),
  );

  app.delete(
    "/:id",
    {
      preHandler: [authGuard, validateParams(letterIdParamSchema)],
    },
    c.remove.bind(c),
  );

  app.get(
    "/:id",
    {
      preHandler: [optionalAuthGuard, validateParams(letterIdParamSchema)],
    },
    c.get.bind(c),
  );
}
