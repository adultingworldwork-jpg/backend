import { FastifyInstance } from "fastify";
import { ResourcesController } from "./resources.controller";
import { authGuard, optionalAuthGuard } from "@/core/auth.guard";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/core/validation.middleware";
import {
  createResourceSchema,
  resourceCategoryParamSchema,
  resourceIdParamSchema,
  resourceListQuerySchema,
  resourceSlugParamSchema,
  resourceTagParamSchema,
  updateResourceSchema,
} from "./resources.schema";

export async function resourcesRoutes(app: FastifyInstance) {
  const c = new ResourcesController();

  app.post(
    "/",
    { preHandler: [authGuard, validateBody(createResourceSchema)] },
    c.create.bind(c),
  );

  app.get(
    "/",
    {
      preHandler: [optionalAuthGuard, validateQuery(resourceListQuerySchema)],
    },
    c.list.bind(c),
  );

  app.get(
    "/featured",
    {
      preHandler: [optionalAuthGuard, validateQuery(resourceListQuerySchema)],
    },
    c.featured.bind(c),
  );

  app.get(
    "/me",
    {
      preHandler: [authGuard, validateQuery(resourceListQuerySchema)],
    },
    c.mine.bind(c),
  );

  app.get(
    "/category/:category",
    {
      preHandler: [
        optionalAuthGuard,
        validateParams(resourceCategoryParamSchema),
        validateQuery(resourceListQuerySchema),
      ],
    },
    c.byCategory.bind(c),
  );

  app.get(
    "/tag/:tag",
    {
      preHandler: [
        optionalAuthGuard,
        validateParams(resourceTagParamSchema),
        validateQuery(resourceListQuerySchema),
      ],
    },
    c.byTag.bind(c),
  );

  app.post(
    "/:id/publish",
    {
      preHandler: [authGuard, validateParams(resourceIdParamSchema)],
    },
    c.publish.bind(c),
  );

  app.put(
    "/:id",
    {
      preHandler: [
        authGuard,
        validateParams(resourceIdParamSchema),
        validateBody(updateResourceSchema),
      ],
    },
    c.update.bind(c),
  );

  app.delete(
    "/:id",
    {
      preHandler: [authGuard, validateParams(resourceIdParamSchema)],
    },
    c.remove.bind(c),
  );

  app.get(
    "/:slug",
    {
      preHandler: [optionalAuthGuard, validateParams(resourceSlugParamSchema)],
    },
    c.bySlug.bind(c),
  );
}
