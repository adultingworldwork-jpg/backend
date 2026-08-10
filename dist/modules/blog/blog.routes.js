"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogRoutes = blogRoutes;
const blog_controller_1 = require("./blog.controller");
const auth_guard_1 = require("../../core/auth.guard");
const validation_middleware_1 = require("../../core/validation.middleware");
const blog_schema_1 = require("./blog.schema");
const swagger_1 = require("../../plugins/swagger");
const paginatedBlogs = (0, swagger_1.paginatedSchema)(swagger_1.BlogDtoSchema);
async function blogRoutes(app) {
    const controller = new blog_controller_1.BlogController();
    app.post("/", {
        ...(0, swagger_1.docRoute)({
            tags: ["Blog"],
            summary: "Create a blog post",
            description: `
Create a draft or published blog post for the authenticated author.

**Who should use it:** Authors writing long-form content.

**Business purpose:** Persist title/content/tags with optional cover image.

**Body highlights:**
- \`title\` 1–200, \`content\` required (max 100k)
- \`tags\` max 20 (normalized lowercase)
- \`coverImage\` URL or null; or \`coverUploadId\` to resolve from Files
- \`status\`: DRAFT (default) | PUBLISHED

**Postconditions:** Post created; slug generated uniquely; if PUBLISHED, \`publishedAt\` set.
        `.trim(),
            auth: "bearer",
            body: blog_schema_1.createBlogSchema,
            bodyExample: {
                title: "How I budgeted my first paycheck",
                content: "Start with needs, then savings, then wants…",
                excerpt: "A practical starter guide for first-job finances.",
                tags: ["budgeting", "career"],
                coverImage: null,
                status: "DRAFT",
            },
            success: (0, swagger_1.created201)(swagger_1.BlogDtoSchema),
            errors: [400, 409],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(blog_schema_1.createBlogSchema)],
    }, controller.create.bind(controller));
    app.get("/", {
        ...(0, swagger_1.docRoute)({
            tags: ["Blog"],
            summary: "List published blog posts",
            description: `
Paginated feed of **published** posts (newest first).

**Auth:** Optional Bearer — owners get \`isOwner: true\` when applicable.

**Query:** \`page\` (default 1), \`limit\` (default 20, max 100).
        `.trim(),
            auth: "optional",
            querystring: blog_schema_1.blogListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedBlogs),
        }),
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateQuery)(blog_schema_1.blogListQuerySchema)],
    }, controller.listPublished.bind(controller));
    app.get("/me", {
        ...(0, swagger_1.docRoute)({
            tags: ["Blog"],
            summary: "List my blog posts",
            description: `
List all posts owned by the authenticated user (drafts + published).

**Who should use it:** Author dashboard.
        `.trim(),
            auth: "bearer",
            querystring: blog_schema_1.blogListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedBlogs),
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(blog_schema_1.blogListQuerySchema)],
    }, controller.mine.bind(controller));
    app.get("/tag/:tag", {
        ...(0, swagger_1.docRoute)({
            tags: ["Blog"],
            summary: "List published posts by tag",
            description: `
Filter published posts by a single tag (path param).

**Auth:** Optional Bearer.
        `.trim(),
            auth: "optional",
            params: blog_schema_1.blogTagParamSchema,
            querystring: blog_schema_1.blogListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedBlogs),
        }),
        preHandler: [
            auth_guard_1.optionalAuthGuard,
            (0, validation_middleware_1.validateParams)(blog_schema_1.blogTagParamSchema),
            (0, validation_middleware_1.validateQuery)(blog_schema_1.blogListQuerySchema),
        ],
    }, controller.byTag.bind(controller));
    app.put("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Blog"],
            summary: "Update a blog post",
            description: `
Update an owned blog post. At least one field required.

**Auth:** Bearer — must be the author (or admin path via Admin module for delete).

**Errors:** \`BLOG_NOT_FOUND\`, \`BLOG_FORBIDDEN\`, \`BLOG_SLUG_EXISTS\`.
        `.trim(),
            auth: "bearer",
            params: blog_schema_1.blogIdParamSchema,
            body: blog_schema_1.updateBlogSchema,
            success: (0, swagger_1.ok200)(swagger_1.BlogDtoSchema),
            errors: [403, 404, 409],
        }),
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(blog_schema_1.blogIdParamSchema),
            (0, validation_middleware_1.validateBody)(blog_schema_1.updateBlogSchema),
        ],
    }, controller.update.bind(controller));
    app.delete("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Blog"],
            summary: "Delete a blog post",
            description: `
Soft/hard delete of an owned post.

**Auth:** Bearer — author only.
        `.trim(),
            auth: "bearer",
            params: blog_schema_1.blogIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [403, 404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(blog_schema_1.blogIdParamSchema)],
    }, controller.remove.bind(controller));
    app.get("/:slug", {
        ...(0, swagger_1.docRoute)({
            tags: ["Blog"],
            summary: "Get blog post by slug",
            description: `
Fetch a single post by slug.

**Auth:** Optional Bearer. Drafts are only visible to the owner.

**Errors:** \`BLOG_NOT_FOUND\`.
        `.trim(),
            auth: "optional",
            params: blog_schema_1.blogSlugParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.BlogDtoSchema),
            errors: [404],
        }),
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateParams)(blog_schema_1.blogSlugParamSchema)],
    }, controller.bySlug.bind(controller));
}
