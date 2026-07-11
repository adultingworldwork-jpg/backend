import { FastifyInstance } from "fastify";
import { AdminController } from "./admin.controller";
import { adminGuard } from "@/core/auth.guard";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/core/validation.middleware";
import {
  commentIdParamSchema,
  contentIdParamSchema,
  paginationQuerySchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from "./admin.schema";

export async function adminRoutes(app: FastifyInstance) {
  const c = new AdminController();

  // Dashboard
  app.get(
    "/dashboard",
    { preHandler: [adminGuard] },
    c.dashboard.bind(c),
  );

  // Users
  app.get(
    "/users",
    {
      preHandler: [adminGuard, validateQuery(paginationQuerySchema)],
    },
    c.listUsers.bind(c),
  );

  app.get(
    "/users/:id",
    {
      preHandler: [adminGuard, validateParams(userIdParamSchema)],
    },
    c.getUser.bind(c),
  );

  app.patch(
    "/users/:id/status",
    {
      preHandler: [
        adminGuard,
        validateParams(userIdParamSchema),
        validateBody(updateUserStatusSchema),
      ],
    },
    c.updateUserStatus.bind(c),
  );

  app.patch(
    "/users/:id/role",
    {
      preHandler: [
        adminGuard,
        validateParams(userIdParamSchema),
        validateBody(updateUserRoleSchema),
      ],
    },
    c.updateUserRole.bind(c),
  );

  // Blog moderation
  app.get(
    "/blog",
    {
      preHandler: [adminGuard, validateQuery(paginationQuerySchema)],
    },
    c.listBlogs.bind(c),
  );

  app.delete(
    "/blog/:id",
    {
      preHandler: [adminGuard, validateParams(contentIdParamSchema)],
    },
    c.deleteBlog.bind(c),
  );

  // Community moderation — comments before :id to avoid shadowing
  app.delete(
    "/community/comments/:id",
    {
      preHandler: [adminGuard, validateParams(commentIdParamSchema)],
    },
    c.deleteCommunityComment.bind(c),
  );

  app.get(
    "/community",
    {
      preHandler: [adminGuard, validateQuery(paginationQuerySchema)],
    },
    c.listCommunity.bind(c),
  );

  app.delete(
    "/community/:id",
    {
      preHandler: [adminGuard, validateParams(contentIdParamSchema)],
    },
    c.deleteCommunityPost.bind(c),
  );

  // Therapy resources
  app.get(
    "/resources",
    {
      preHandler: [adminGuard, validateQuery(paginationQuerySchema)],
    },
    c.listResources.bind(c),
  );

  app.delete(
    "/resources/:id",
    {
      preHandler: [adminGuard, validateParams(contentIdParamSchema)],
    },
    c.deleteResource.bind(c),
  );

  // Public letters only
  app.get(
    "/letters",
    {
      preHandler: [adminGuard, validateQuery(paginationQuerySchema)],
    },
    c.listLetters.bind(c),
  );

  app.delete(
    "/letters/:id",
    {
      preHandler: [adminGuard, validateParams(contentIdParamSchema)],
    },
    c.deleteLetter.bind(c),
  );

  // Explicit privacy denials (no content ever returned)
  app.get(
    "/journals",
    { preHandler: [adminGuard] },
    c.denyJournals.bind(c),
  );
  app.get(
    "/journals/:id",
    { preHandler: [adminGuard] },
    c.denyJournals.bind(c),
  );
  app.get(
    "/chat",
    { preHandler: [adminGuard] },
    c.denyChat.bind(c),
  );
  app.get(
    "/chat/:id",
    { preHandler: [adminGuard] },
    c.denyChat.bind(c),
  );
  app.get(
    "/messages",
    { preHandler: [adminGuard] },
    c.denyChat.bind(c),
  );
  app.get(
    "/messages/:id",
    { preHandler: [adminGuard] },
    c.denyChat.bind(c),
  );
}
