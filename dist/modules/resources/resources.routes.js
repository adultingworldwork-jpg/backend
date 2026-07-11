"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourcesRoutes = resourcesRoutes;
const resources_controller_1 = require("./resources.controller");
const auth_guard_1 = require("@/core/auth.guard");
const validation_middleware_1 = require("@/core/validation.middleware");
const resources_schema_1 = require("./resources.schema");
async function resourcesRoutes(app) {
    const c = new resources_controller_1.ResourcesController();
    app.post("/", { preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(resources_schema_1.createResourceSchema)] }, c.create.bind(c));
    app.get("/", {
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateQuery)(resources_schema_1.resourceListQuerySchema)],
    }, c.list.bind(c));
    app.get("/featured", {
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateQuery)(resources_schema_1.resourceListQuerySchema)],
    }, c.featured.bind(c));
    app.get("/me", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(resources_schema_1.resourceListQuerySchema)],
    }, c.mine.bind(c));
    app.get("/category/:category", {
        preHandler: [
            auth_guard_1.optionalAuthGuard,
            (0, validation_middleware_1.validateParams)(resources_schema_1.resourceCategoryParamSchema),
            (0, validation_middleware_1.validateQuery)(resources_schema_1.resourceListQuerySchema),
        ],
    }, c.byCategory.bind(c));
    app.get("/tag/:tag", {
        preHandler: [
            auth_guard_1.optionalAuthGuard,
            (0, validation_middleware_1.validateParams)(resources_schema_1.resourceTagParamSchema),
            (0, validation_middleware_1.validateQuery)(resources_schema_1.resourceListQuerySchema),
        ],
    }, c.byTag.bind(c));
    app.post("/:id/publish", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(resources_schema_1.resourceIdParamSchema)],
    }, c.publish.bind(c));
    app.put("/:id", {
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(resources_schema_1.resourceIdParamSchema),
            (0, validation_middleware_1.validateBody)(resources_schema_1.updateResourceSchema),
        ],
    }, c.update.bind(c));
    app.delete("/:id", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(resources_schema_1.resourceIdParamSchema)],
    }, c.remove.bind(c));
    app.get("/:slug", {
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateParams)(resources_schema_1.resourceSlugParamSchema)],
    }, c.bySlug.bind(c));
}
