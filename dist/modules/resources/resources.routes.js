"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourcesRoutes = resourcesRoutes;
const resources_controller_1 = require("./resources.controller");
const auth_guard_1 = require("../../core/auth.guard");
const validation_middleware_1 = require("../../core/validation.middleware");
const resources_schema_1 = require("./resources.schema");
const swagger_1 = require("../../plugins/swagger");
const paginatedResources = (0, swagger_1.paginatedSchema)(swagger_1.ResourceDtoSchema);
async function resourcesRoutes(app) {
    const c = new resources_controller_1.ResourcesController();
    app.post("/", {
        ...(0, swagger_1.docRoute)({
            tags: ["Resources"],
            summary: "Create a therapy resource",
            description: `
Create a curated wellness/therapy resource (content library — not booking).

**Body:** title, content, category, optional summary/tags/cover/featured/status.

**Defaults:** status DRAFT, estimatedReadMinutes 5, featured false.
        `.trim(),
            auth: "bearer",
            body: resources_schema_1.createResourceSchema,
            bodyExample: {
                title: "Grounding techniques for anxiety",
                summary: "Quick exercises you can use anywhere.",
                content: "Step 1: Name five things you can see…",
                category: "anxiety",
                tags: ["grounding", "anxiety"],
                estimatedReadMinutes: 5,
                featured: false,
                status: "DRAFT",
            },
            success: (0, swagger_1.created201)(swagger_1.ResourceDtoSchema),
            errors: [400, 409],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(resources_schema_1.createResourceSchema)],
    }, c.create.bind(c));
    app.get("/", {
        ...(0, swagger_1.docRoute)({
            tags: ["Resources"],
            summary: "List published resources",
            description: `
Paginated published resource library.

**Auth:** Optional Bearer.
        `.trim(),
            auth: "optional",
            querystring: resources_schema_1.resourceListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedResources),
        }),
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateQuery)(resources_schema_1.resourceListQuerySchema)],
    }, c.list.bind(c));
    app.get("/featured", {
        ...(0, swagger_1.docRoute)({
            tags: ["Resources"],
            summary: "List featured published resources",
            description: `Paginated list of featured published resources.`,
            auth: "optional",
            querystring: resources_schema_1.resourceListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedResources),
        }),
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateQuery)(resources_schema_1.resourceListQuerySchema)],
    }, c.featured.bind(c));
    app.get("/me", {
        ...(0, swagger_1.docRoute)({
            tags: ["Resources"],
            summary: "List my resources",
            description: `List draft + published resources owned by the authenticated author.`,
            auth: "bearer",
            querystring: resources_schema_1.resourceListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedResources),
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(resources_schema_1.resourceListQuerySchema)],
    }, c.mine.bind(c));
    app.get("/category/:category", {
        ...(0, swagger_1.docRoute)({
            tags: ["Resources"],
            summary: "List published resources by category",
            description: `Filter published resources by category path param.`,
            auth: "optional",
            params: resources_schema_1.resourceCategoryParamSchema,
            querystring: resources_schema_1.resourceListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedResources),
        }),
        preHandler: [
            auth_guard_1.optionalAuthGuard,
            (0, validation_middleware_1.validateParams)(resources_schema_1.resourceCategoryParamSchema),
            (0, validation_middleware_1.validateQuery)(resources_schema_1.resourceListQuerySchema),
        ],
    }, c.byCategory.bind(c));
    app.get("/tag/:tag", {
        ...(0, swagger_1.docRoute)({
            tags: ["Resources"],
            summary: "List published resources by tag",
            description: `Filter published resources by tag path param.`,
            auth: "optional",
            params: resources_schema_1.resourceTagParamSchema,
            querystring: resources_schema_1.resourceListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedResources),
        }),
        preHandler: [
            auth_guard_1.optionalAuthGuard,
            (0, validation_middleware_1.validateParams)(resources_schema_1.resourceTagParamSchema),
            (0, validation_middleware_1.validateQuery)(resources_schema_1.resourceListQuerySchema),
        ],
    }, c.byTag.bind(c));
    app.post("/:id/publish", {
        ...(0, swagger_1.docRoute)({
            tags: ["Resources"],
            summary: "Publish a resource",
            description: `
Set resource status to PUBLISHED and stamp \`publishedAt\`.

**Auth:** Bearer — must be the author.
        `.trim(),
            auth: "bearer",
            params: resources_schema_1.resourceIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.ResourceDtoSchema),
            errors: [403, 404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(resources_schema_1.resourceIdParamSchema)],
    }, c.publish.bind(c));
    app.put("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Resources"],
            summary: "Update a resource",
            description: `Update owned resource fields. At least one field required.`,
            auth: "bearer",
            params: resources_schema_1.resourceIdParamSchema,
            body: resources_schema_1.updateResourceSchema,
            success: (0, swagger_1.ok200)(swagger_1.ResourceDtoSchema),
            errors: [403, 404, 409],
        }),
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(resources_schema_1.resourceIdParamSchema),
            (0, validation_middleware_1.validateBody)(resources_schema_1.updateResourceSchema),
        ],
    }, c.update.bind(c));
    app.delete("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Resources"],
            summary: "Delete a resource",
            description: `Delete an owned resource.`,
            auth: "bearer",
            params: resources_schema_1.resourceIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [403, 404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(resources_schema_1.resourceIdParamSchema)],
    }, c.remove.bind(c));
    app.get("/:slug", {
        ...(0, swagger_1.docRoute)({
            tags: ["Resources"],
            summary: "Get resource by slug",
            description: `
Fetch a single resource by slug.

**Auth:** Optional Bearer. Drafts visible to owner only.
        `.trim(),
            auth: "optional",
            params: resources_schema_1.resourceSlugParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.ResourceDtoSchema),
            errors: [404],
        }),
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateParams)(resources_schema_1.resourceSlugParamSchema)],
    }, c.bySlug.bind(c));
}
