"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogRoutes = blogRoutes;
const blog_controller_1 = require("./blog.controller");
const auth_guard_1 = require("@/core/auth.guard");
const validation_middleware_1 = require("@/core/validation.middleware");
const blog_schema_1 = require("./blog.schema");
async function blogRoutes(app) {
    const controller = new blog_controller_1.BlogController();
    // Static paths first (before :slug / :id)
    app.post("/", { preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(blog_schema_1.createBlogSchema)] }, controller.create.bind(controller));
    app.get("/", {
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateQuery)(blog_schema_1.blogListQuerySchema)],
    }, controller.listPublished.bind(controller));
    app.get("/me", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(blog_schema_1.blogListQuerySchema)],
    }, controller.mine.bind(controller));
    app.get("/tag/:tag", {
        preHandler: [
            auth_guard_1.optionalAuthGuard,
            (0, validation_middleware_1.validateParams)(blog_schema_1.blogTagParamSchema),
            (0, validation_middleware_1.validateQuery)(blog_schema_1.blogListQuerySchema),
        ],
    }, controller.byTag.bind(controller));
    app.put("/:id", {
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(blog_schema_1.blogIdParamSchema),
            (0, validation_middleware_1.validateBody)(blog_schema_1.updateBlogSchema),
        ],
    }, controller.update.bind(controller));
    app.delete("/:id", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(blog_schema_1.blogIdParamSchema)],
    }, controller.remove.bind(controller));
    app.get("/:slug", {
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateParams)(blog_schema_1.blogSlugParamSchema)],
    }, controller.bySlug.bind(controller));
}
