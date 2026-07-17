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
import {
  CommunityCommentDtoSchema,
  CommunityPostDtoSchema,
  CommunityReactionDtoSchema,
  OkSchema,
  created201,
  docRoute,
  ok200,
  paginatedSchema,
} from "@/plugins/swagger";

const paginatedPosts = paginatedSchema(CommunityPostDtoSchema);
const paginatedComments = paginatedSchema(CommunityCommentDtoSchema);

export async function communityRoutes(app: FastifyInstance) {
  const c = new CommunityController();

  app.post(
    "/",
    {
      ...docRoute({
        tags: ["Community"],
        summary: "Create a community post",
        description: `
Create a community feed post.

**Body:**
- \`content\` 1–5000 chars
- \`visibility\` PUBLIC | COMMUNITY (default COMMUNITY)
- \`attachmentUploadIds\` up to 5 existing upload ids

**Auth:** Bearer required.
        `.trim(),
        auth: "bearer",
        body: createCommunityPostSchema,
        bodyExample: {
          content: "Feeling grateful for this community today.",
          visibility: "COMMUNITY",
          attachmentUploadIds: [],
        },
        success: created201(CommunityPostDtoSchema),
      }),
      preHandler: [authGuard, validateBody(createCommunityPostSchema)],
    },
    c.createPost.bind(c),
  );

  app.get(
    "/",
    {
      ...docRoute({
        tags: ["Community"],
        summary: "List community posts",
        description: `
Paginated community feed.

**Auth:** Optional Bearer — enriches \`isOwner\` and \`myReaction\`.

Visibility filtering may hide COMMUNITY posts from anonymous users depending on product rules.
        `.trim(),
        auth: "optional",
        querystring: communityListQuerySchema,
        success: ok200(paginatedPosts),
      }),
      preHandler: [optionalAuthGuard, validateQuery(communityListQuerySchema)],
    },
    c.listPosts.bind(c),
  );

  app.get(
    "/me",
    {
      ...docRoute({
        tags: ["Community"],
        summary: "List my community posts",
        description: `List posts authored by the authenticated user.`,
        auth: "bearer",
        querystring: communityListQuerySchema,
        success: ok200(paginatedPosts),
      }),
      preHandler: [authGuard, validateQuery(communityListQuerySchema)],
    },
    c.getMyPosts.bind(c),
  );

  app.put(
    "/comments/:commentId",
    {
      ...docRoute({
        tags: ["Community"],
        summary: "Update a comment",
        description: `
Edit your own comment content (max 2000 chars).

**Errors:** \`COMMUNITY_COMMENT_NOT_FOUND\`, \`COMMUNITY_COMMENT_FORBIDDEN\`.
        `.trim(),
        auth: "bearer",
        params: commentIdParamSchema,
        body: updateCommentSchema,
        success: ok200(CommunityCommentDtoSchema),
        errors: [403, 404],
      }),
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
      ...docRoute({
        tags: ["Community"],
        summary: "Delete a comment",
        description: `Delete your own comment. Decrements the post comment count.`,
        auth: "bearer",
        params: commentIdParamSchema,
        success: ok200(OkSchema, { ok: true }),
        errors: [403, 404],
      }),
      preHandler: [authGuard, validateParams(commentIdParamSchema)],
    },
    c.deleteComment.bind(c),
  );

  app.post(
    "/:id/comments",
    {
      ...docRoute({
        tags: ["Community"],
        summary: "Add a comment to a post",
        description: `
Comment on a community post.

**Auth:** Bearer. Content 1–2000 characters.
        `.trim(),
        auth: "bearer",
        params: communityIdParamSchema,
        body: createCommentSchema,
        success: created201(CommunityCommentDtoSchema),
        errors: [404],
      }),
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
      ...docRoute({
        tags: ["Community"],
        summary: "List comments on a post",
        description: `Paginated comments for a post (oldest/newest per service defaults).`,
        auth: "optional",
        params: communityIdParamSchema,
        querystring: communityListQuerySchema,
        success: ok200(paginatedComments),
        errors: [404],
      }),
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
      ...docRoute({
        tags: ["Community"],
        summary: "Set reaction on a post",
        description: `
Upsert the viewer's reaction on a post.

**Reaction types:** LIKE | SUPPORT | HUG | THANKFUL

**Side effects:** Replaces previous reaction if any; updates reactionsCount.
        `.trim(),
        auth: "bearer",
        params: communityIdParamSchema,
        paramsExample: { id: "665f1a2b3c4d5e6f7a8b9c11" },
        body: reactionSchema,
        bodyExample: { type: "SUPPORT" },
        success: ok200(CommunityReactionDtoSchema),
        errors: [404],
      }),
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
      ...docRoute({
        tags: ["Community"],
        summary: "Remove my reaction",
        description: `Remove the authenticated user's reaction from a post.`,
        auth: "bearer",
        params: communityIdParamSchema,
        success: ok200(OkSchema, { ok: true }),
        errors: [404],
      }),
      preHandler: [authGuard, validateParams(communityIdParamSchema)],
    },
    c.removeReaction.bind(c),
  );

  app.put(
    "/:id",
    {
      ...docRoute({
        tags: ["Community"],
        summary: "Update a community post",
        description: `
Update owned post fields (content, visibility, attachments). At least one field required.
        `.trim(),
        auth: "bearer",
        params: communityIdParamSchema,
        body: updateCommunityPostSchema,
        success: ok200(CommunityPostDtoSchema),
        errors: [403, 404],
      }),
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
      ...docRoute({
        tags: ["Community"],
        summary: "Delete a community post",
        description: `Delete owned post and related comments/reactions as enforced by the service.`,
        auth: "bearer",
        params: communityIdParamSchema,
        success: ok200(OkSchema, { ok: true }),
        errors: [403, 404],
      }),
      preHandler: [authGuard, validateParams(communityIdParamSchema)],
    },
    c.deletePost.bind(c),
  );

  app.get(
    "/:id",
    {
      ...docRoute({
        tags: ["Community"],
        summary: "Get a community post",
        description: `
Fetch a single post by id.

**Auth:** Optional Bearer for \`isOwner\` / \`myReaction\`.
        `.trim(),
        auth: "optional",
        params: communityIdParamSchema,
        success: ok200(CommunityPostDtoSchema),
        errors: [403, 404],
      }),
      preHandler: [optionalAuthGuard, validateParams(communityIdParamSchema)],
    },
    c.getPost.bind(c),
  );
}
