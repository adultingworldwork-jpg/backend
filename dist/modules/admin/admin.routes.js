"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = adminRoutes;
const admin_controller_1 = require("./admin.controller");
const auth_guard_1 = require("../../core/auth.guard");
const validation_middleware_1 = require("../../core/validation.middleware");
const admin_schema_1 = require("./admin.schema");
async function adminRoutes(app) {
    const c = new admin_controller_1.AdminController();
    // Dashboard
    app.get("/dashboard", { preHandler: [auth_guard_1.adminGuard] }, c.dashboard.bind(c));
    // Users
    app.get("/users", {
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateQuery)(admin_schema_1.paginationQuerySchema)],
    }, c.listUsers.bind(c));
    app.get("/users/:id", {
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateParams)(admin_schema_1.userIdParamSchema)],
    }, c.getUser.bind(c));
    app.patch("/users/:id/status", {
        preHandler: [
            auth_guard_1.adminGuard,
            (0, validation_middleware_1.validateParams)(admin_schema_1.userIdParamSchema),
            (0, validation_middleware_1.validateBody)(admin_schema_1.updateUserStatusSchema),
        ],
    }, c.updateUserStatus.bind(c));
    app.patch("/users/:id/role", {
        preHandler: [
            auth_guard_1.adminGuard,
            (0, validation_middleware_1.validateParams)(admin_schema_1.userIdParamSchema),
            (0, validation_middleware_1.validateBody)(admin_schema_1.updateUserRoleSchema),
        ],
    }, c.updateUserRole.bind(c));
    // Blog moderation
    app.get("/blog", {
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateQuery)(admin_schema_1.paginationQuerySchema)],
    }, c.listBlogs.bind(c));
    app.delete("/blog/:id", {
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateParams)(admin_schema_1.contentIdParamSchema)],
    }, c.deleteBlog.bind(c));
    // Community moderation — comments before :id to avoid shadowing
    app.delete("/community/comments/:id", {
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateParams)(admin_schema_1.commentIdParamSchema)],
    }, c.deleteCommunityComment.bind(c));
    app.get("/community", {
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateQuery)(admin_schema_1.paginationQuerySchema)],
    }, c.listCommunity.bind(c));
    app.delete("/community/:id", {
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateParams)(admin_schema_1.contentIdParamSchema)],
    }, c.deleteCommunityPost.bind(c));
    // Therapy resources
    app.get("/resources", {
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateQuery)(admin_schema_1.paginationQuerySchema)],
    }, c.listResources.bind(c));
    app.delete("/resources/:id", {
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateParams)(admin_schema_1.contentIdParamSchema)],
    }, c.deleteResource.bind(c));
    // Public letters only
    app.get("/letters", {
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateQuery)(admin_schema_1.paginationQuerySchema)],
    }, c.listLetters.bind(c));
    app.delete("/letters/:id", {
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateParams)(admin_schema_1.contentIdParamSchema)],
    }, c.deleteLetter.bind(c));
    // Explicit privacy denials (no content ever returned)
    app.get("/journals", { preHandler: [auth_guard_1.adminGuard] }, c.denyJournals.bind(c));
    app.get("/journals/:id", { preHandler: [auth_guard_1.adminGuard] }, c.denyJournals.bind(c));
    app.get("/chat", { preHandler: [auth_guard_1.adminGuard] }, c.denyChat.bind(c));
    app.get("/chat/:id", { preHandler: [auth_guard_1.adminGuard] }, c.denyChat.bind(c));
    app.get("/messages", { preHandler: [auth_guard_1.adminGuard] }, c.denyChat.bind(c));
    app.get("/messages/:id", { preHandler: [auth_guard_1.adminGuard] }, c.denyChat.bind(c));
}
