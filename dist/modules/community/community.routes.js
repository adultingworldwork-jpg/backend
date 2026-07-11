"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityRoutes = communityRoutes;
const community_controller_1 = require("./community.controller");
const auth_guard_1 = require("@/core/auth.guard");
const validation_middleware_1 = require("@/core/validation.middleware");
const community_schema_1 = require("./community.schema");
async function communityRoutes(app) {
    const c = new community_controller_1.CommunityController();
    // ── Static / multi-segment paths first ─────────────────
    app.post("/", { preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(community_schema_1.createCommunityPostSchema)] }, c.createPost.bind(c));
    app.get("/", {
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateQuery)(community_schema_1.communityListQuerySchema)],
    }, c.listPosts.bind(c));
    app.get("/me", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(community_schema_1.communityListQuerySchema)],
    }, c.getMyPosts.bind(c));
    app.put("/comments/:commentId", {
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(community_schema_1.commentIdParamSchema),
            (0, validation_middleware_1.validateBody)(community_schema_1.updateCommentSchema),
        ],
    }, c.updateComment.bind(c));
    app.delete("/comments/:commentId", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(community_schema_1.commentIdParamSchema)],
    }, c.deleteComment.bind(c));
    // ── Nested under :id ───────────────────────────────────
    app.post("/:id/comments", {
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema),
            (0, validation_middleware_1.validateBody)(community_schema_1.createCommentSchema),
        ],
    }, c.addComment.bind(c));
    app.get("/:id/comments", {
        preHandler: [
            auth_guard_1.optionalAuthGuard,
            (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema),
            (0, validation_middleware_1.validateQuery)(community_schema_1.communityListQuerySchema),
        ],
    }, c.listComments.bind(c));
    app.put("/:id/reaction", {
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema),
            (0, validation_middleware_1.validateBody)(community_schema_1.reactionSchema),
        ],
    }, c.react.bind(c));
    app.delete("/:id/reaction", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema)],
    }, c.removeReaction.bind(c));
    app.put("/:id", {
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema),
            (0, validation_middleware_1.validateBody)(community_schema_1.updateCommunityPostSchema),
        ],
    }, c.updatePost.bind(c));
    app.delete("/:id", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema)],
    }, c.deletePost.bind(c));
    app.get("/:id", {
        preHandler: [
            auth_guard_1.optionalAuthGuard,
            (0, validation_middleware_1.validateParams)(community_schema_1.communityIdParamSchema),
        ],
    }, c.getPost.bind(c));
}
