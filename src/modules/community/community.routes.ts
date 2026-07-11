import { FastifyInstance } from "fastify";
import { CommunityController } from "./community.controller";
import { authGuard, optionalAuthGuard } from "@/core/auth.guard";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/core/validation.middleware";
import {
  commentIdParamSchema,
  communityIdParamSchema,
  communityListQuerySchema,
  createCommentSchema,
  createCommunityPostSchema,
  reactionSchema,
  updateCommentSchema,
  updateCommunityPostSchema,
} from "./community.schema";

export async function communityRoutes(app: FastifyInstance) {
  const c = new CommunityController();

  // ── Static / multi-segment paths first ─────────────────

  app.post(
    "/",
    { preHandler: [authGuard, validateBody(createCommunityPostSchema)] },
    c.createPost.bind(c),
  );

  app.get(
    "/",
    {
      preHandler: [optionalAuthGuard, validateQuery(communityListQuerySchema)],
    },
    c.listPosts.bind(c),
  );

  app.get(
    "/me",
    {
      preHandler: [authGuard, validateQuery(communityListQuerySchema)],
    },
    c.getMyPosts.bind(c),
  );

  app.put(
    "/comments/:commentId",
    {
      preHandler: [
        authGuard,
        validateParams(commentIdParamSchema),
        validateBody(updateCommentSchema),
      ],
    },
    c.updateComment.bind(c),
  );

  app.delete(
    "/comments/:commentId",
    {
      preHandler: [authGuard, validateParams(commentIdParamSchema)],
    },
    c.deleteComment.bind(c),
  );

  // ── Nested under :id ───────────────────────────────────

  app.post(
    "/:id/comments",
    {
      preHandler: [
        authGuard,
        validateParams(communityIdParamSchema),
        validateBody(createCommentSchema),
      ],
    },
    c.addComment.bind(c),
  );

  app.get(
    "/:id/comments",
    {
      preHandler: [
        optionalAuthGuard,
        validateParams(communityIdParamSchema),
        validateQuery(communityListQuerySchema),
      ],
    },
    c.listComments.bind(c),
  );

  app.put(
    "/:id/reaction",
    {
      preHandler: [
        authGuard,
        validateParams(communityIdParamSchema),
        validateBody(reactionSchema),
      ],
    },
    c.react.bind(c),
  );

  app.delete(
    "/:id/reaction",
    {
      preHandler: [authGuard, validateParams(communityIdParamSchema)],
    },
    c.removeReaction.bind(c),
  );

  app.put(
    "/:id",
    {
      preHandler: [
        authGuard,
        validateParams(communityIdParamSchema),
        validateBody(updateCommunityPostSchema),
      ],
    },
    c.updatePost.bind(c),
  );

  app.delete(
    "/:id",
    {
      preHandler: [authGuard, validateParams(communityIdParamSchema)],
    },
    c.deletePost.bind(c),
  );

  app.get(
    "/:id",
    {
      preHandler: [
        optionalAuthGuard,
        validateParams(communityIdParamSchema),
      ],
    },
    c.getPost.bind(c),
  );
}
