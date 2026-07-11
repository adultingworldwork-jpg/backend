import { FastifyInstance } from "fastify";
import { BlogController } from "./blog.controller";
import { authGuard, optionalAuthGuard } from "@/core/auth.guard";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/core/validation.middleware";
import {
  blogIdParamSchema,
  blogListQuerySchema,
  blogSlugParamSchema,
  blogTagParamSchema,
  createBlogSchema,
  updateBlogSchema,
} from "./blog.schema";

export async function blogRoutes(app: FastifyInstance) {
  const controller = new BlogController();

  // Static paths first (before :slug / :id)

  app.post(
    "/",
    { preHandler: [authGuard, validateBody(createBlogSchema)] },
    controller.create.bind(controller),
  );

  app.get(
    "/",
    {
      preHandler: [optionalAuthGuard, validateQuery(blogListQuerySchema)],
    },
    controller.listPublished.bind(controller),
  );

  app.get(
    "/me",
    {
      preHandler: [authGuard, validateQuery(blogListQuerySchema)],
    },
    controller.mine.bind(controller),
  );

  app.get(
    "/tag/:tag",
    {
      preHandler: [
        optionalAuthGuard,
        validateParams(blogTagParamSchema),
        validateQuery(blogListQuerySchema),
      ],
    },
    controller.byTag.bind(controller),
  );

  app.put(
    "/:id",
    {
      preHandler: [
        authGuard,
        validateParams(blogIdParamSchema),
        validateBody(updateBlogSchema),
      ],
    },
    controller.update.bind(controller),
  );

  app.delete(
    "/:id",
    {
      preHandler: [authGuard, validateParams(blogIdParamSchema)],
    },
    controller.remove.bind(controller),
  );

  app.get(
    "/:slug",
    {
      preHandler: [optionalAuthGuard, validateParams(blogSlugParamSchema)],
    },
    controller.bySlug.bind(controller),
  );
}
