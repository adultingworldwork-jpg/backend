"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityRoutes = communityRoutes;
const community_controller_1 = require("./community.controller");
const auth_guard_1 = require("../../core/auth.guard");
const validation_middleware_1 = require("../../core/validation.middleware");
const community_schema_1 = require("./community.schema");
const swagger_1 = require("../../plugins/swagger");
const paginatedPosts = (0, swagger_1.paginatedSchema)(swagger_1.CommunityPostDtoSchema);
const paginatedComments = (0, swagger_1.paginatedSchema)(swagger_1.CommunityCommentDtoSchema);
async function communityRoutes(app) {
    const c = new community_controller_1.CommunityController();
    app.post("/", {
        ...(0, swagger_1.docRoute)({
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
            body: community_schema_1.createCommunityPostSchema,
            bodyExample: {
                content: "Feeling grateful for this community today.",
                visibility: "COMMUNITY",
                attachmentUploadIds: [],
            },
            success: (0, swagger_1.created201)(swagger_1.CommunityPostDtoSchema),
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(community_schema_1.createCommunityPostSchema)],
    }, c.createPost.bind(c));
    app.get("/", {
        ...(0, swagger_1.docRoute)({
            tags: ["Community"],
            summary: "List community posts",
            description: `
Paginated community feed.

**Auth:** Optional Bearer — enriches \`isOwner\` and \`myReaction\`.

Visibility filtering may hide COMMUNITY posts from anonymous users depending on product rules.
        `.trim(),
            auth: "optional",
            querystring: community_schema_1.communityListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedPosts),
        }),
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateQuery)(community_schema_1.communityListQuerySchema)],
    }, c.listPosts.bind(c));
    app.get("/me", {
        ...(0, swagger_1.docRoute)({
            tags: ["Community"],
            summary: "List my community posts",
            description: `List posts authored by the authenticated user.`,
            auth: "bearer",
            querystring: community_schema_1.communityListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedPosts),
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(community_schema_1.communityListQuerySchema)],
    }, c.getMyPosts.bind(c));
    app.put("/comments/:commentId", {
        ...(0, swagger_1.docRoute)({
            tags: ["Community"],
            summary: "Update a comment",
            description: `
Edit your own comment content (max 2000 chars).

**Errors:** \`COMMUNITY_COMMENT_NOT_FOUND\`, \`COMMUNITY_COMMENT_FORBIDDEN\`.
        `.trim(),
            auth: "bearer",
            params: community_schema_1.commentIdParamSchema,
            body: community_schema_1.updateCommentSchema,
            success: (0, swagger_1.ok200)(swagger_1.CommunityCommentDtoSchema),
            errors: [403, 404],
        }),
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(community_schema_1.commentIdParamSchema),
            (0, validation_middleware_1.validateBody)(community_schema_1.updateCommentSchema),
        ],
    }, c.updateComment.bind(c));
    app.delete("/comments/:commentId", {
        ...(0, swagger_1.docRoute)({
            tags: ["Community"],
            summary: "Delete a comment",
            description: `Delete your own comment. Decrements the post comment count.`,
            auth: "bearer",
            params: community_schema_1.commentIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [403, 404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(community_schema_1.commentIdParamSchema)],
    }, c.deleteComment.bind(c));
    app.post("/:id/comments", {
        ...(0, swagger_1.docRoute)({
            tags: ["Community"],
            summary: "Add a comment to a post",
            description: `
Comment on a community post.

**Auth:** Bearer. Content 1–2000 characters.
        `.trim(),
            auth: "bearer",
            params: community_schema_1.communityIdParamSchema,
            body: community_schema_1.createCommentSchema,
            success: (0, swagger_1.created201)(swagger_1.CommunityCommentDtoSchema),
            errors: [404],
        }),
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema),
            (0, validation_middleware_1.validateBody)(community_schema_1.createCommentSchema),
        ],
    }, c.addComment.bind(c));
    app.get("/:id/comments", {
        ...(0, swagger_1.docRoute)({
            tags: ["Community"],
            summary: "List comments on a post",
            description: `Paginated comments for a post (oldest/newest per service defaults).`,
            auth: "optional",
            params: community_schema_1.communityIdParamSchema,
            querystring: community_schema_1.communityListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedComments),
            errors: [404],
        }),
        preHandler: [
            auth_guard_1.optionalAuthGuard,
            (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema),
            (0, validation_middleware_1.validateQuery)(community_schema_1.communityListQuerySchema),
        ],
    }, c.listComments.bind(c));
    app.put("/:id/reaction", {
        ...(0, swagger_1.docRoute)({
            tags: ["Community"],
            summary: "Set reaction on a post",
            description: `
Upsert the viewer's reaction on a post.

**Reaction types:** LIKE | SUPPORT | HUG | THANKFUL

**Side effects:** Replaces previous reaction if any; updates reactionsCount.
        `.trim(),
            auth: "bearer",
            params: community_schema_1.communityIdParamSchema,
            paramsExample: { id: "665f1a2b3c4d5e6f7a8b9c11" },
            body: community_schema_1.reactionSchema,
            bodyExample: { type: "SUPPORT" },
            success: (0, swagger_1.ok200)(swagger_1.CommunityReactionDtoSchema),
            errors: [404],
        }),
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema),
            (0, validation_middleware_1.validateBody)(community_schema_1.reactionSchema),
        ],
    }, c.react.bind(c));
    app.delete("/:id/reaction", {
        ...(0, swagger_1.docRoute)({
            tags: ["Community"],
            summary: "Remove my reaction",
            description: `Remove the authenticated user's reaction from a post.`,
            auth: "bearer",
            params: community_schema_1.communityIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema)],
    }, c.removeReaction.bind(c));
    app.put("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Community"],
            summary: "Update a community post",
            description: `
Update owned post fields (content, visibility, attachments). At least one field required.
        `.trim(),
            auth: "bearer",
            params: community_schema_1.communityIdParamSchema,
            body: community_schema_1.updateCommunityPostSchema,
            success: (0, swagger_1.ok200)(swagger_1.CommunityPostDtoSchema),
            errors: [403, 404],
        }),
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema),
            (0, validation_middleware_1.validateBody)(community_schema_1.updateCommunityPostSchema),
        ],
    }, c.updatePost.bind(c));
    app.delete("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Community"],
            summary: "Delete a community post",
            description: `Delete owned post and related comments/reactions as enforced by the service.`,
            auth: "bearer",
            params: community_schema_1.communityIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [403, 404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema)],
    }, c.deletePost.bind(c));
    app.get("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Community"],
            summary: "Get a community post",
            description: `
Fetch a single post by id.

**Auth:** Optional Bearer for \`isOwner\` / \`myReaction\`.
        `.trim(),
            auth: "optional",
            params: community_schema_1.communityIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.CommunityPostDtoSchema),
            errors: [403, 404],
        }),
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema)],
    }, c.getPost.bind(c));
}
