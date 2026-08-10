"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = adminRoutes;
const admin_controller_1 = require("./admin.controller");
const auth_guard_1 = require("../../core/auth.guard");
const validation_middleware_1 = require("../../core/validation.middleware");
const admin_schema_1 = require("./admin.schema");
const swagger_1 = require("../../plugins/swagger");
const paginatedAdminUsers = (0, swagger_1.paginatedSchema)(swagger_1.AdminUserDtoSchema);
async function adminRoutes(app) {
    const c = new admin_controller_1.AdminController();
    // Dashboard
    app.get("/dashboard", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "Admin dashboard statistics",
            description: `
Aggregate platform counts for the admin console.

**Auth:** Admin only.

**Privacy:** Includes **counts** for journals/messages only — never content.
        `.trim(),
            auth: "admin",
            success: (0, swagger_1.ok200)(swagger_1.AdminDashboardSchema),
        }),
        preHandler: [auth_guard_1.adminGuard],
    }, c.dashboard.bind(c));
    // Users
    app.get("/users", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "List users",
            description: `
Paginated user directory for moderation.

**Auth:** Admin only.
**Query:** page, limit.
        `.trim(),
            auth: "admin",
            querystring: admin_schema_1.paginationQuerySchema,
            success: (0, swagger_1.ok200)(paginatedAdminUsers),
        }),
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateQuery)(admin_schema_1.paginationQuerySchema)],
    }, c.listUsers.bind(c));
    app.get("/users/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "Get user by id",
            description: `Fetch a single user for admin management.`,
            auth: "admin",
            params: admin_schema_1.userIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.AdminUserDtoSchema),
            errors: [404],
        }),
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateParams)(admin_schema_1.userIdParamSchema)],
    }, c.getUser.bind(c));
    app.patch("/users/:id/status", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "Update user status",
            description: `
Set admin-managed account status.

**Status values:** ACTIVE | SUSPENDED | LOCKED

**Notes:** SUSPENDED/LOCKED users cannot login. Admins cannot use this to lock themselves out in invalid ways — see service rules.

**Errors:** \`ADMIN_INVALID_STATUS\`, \`ADMIN_TARGET_NOT_FOUND\`, \`ADMIN_CANNOT_MODIFY_SELF\` (where applicable).
        `.trim(),
            auth: "admin",
            params: admin_schema_1.userIdParamSchema,
            paramsExample: { id: "665f1a2b3c4d5e6f7a8b9c0d" },
            body: admin_schema_1.updateUserStatusSchema,
            bodyExample: { status: "SUSPENDED" },
            success: (0, swagger_1.ok200)(swagger_1.AdminUserDtoSchema),
            errors: [400, 404],
        }),
        preHandler: [
            auth_guard_1.adminGuard,
            (0, validation_middleware_1.validateParams)(admin_schema_1.userIdParamSchema),
            (0, validation_middleware_1.validateBody)(admin_schema_1.updateUserStatusSchema),
        ],
    }, c.updateUserStatus.bind(c));
    app.patch("/users/:id/role", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "Update user role",
            description: `
Assign role USER or ADMIN.

**Auth:** Admin only.
**Restriction:** Administrators cannot change their own role (\`ADMIN_CANNOT_MODIFY_SELF\`).
        `.trim(),
            auth: "admin",
            params: admin_schema_1.userIdParamSchema,
            paramsExample: { id: "665f1a2b3c4d5e6f7a8b9c0d" },
            body: admin_schema_1.updateUserRoleSchema,
            bodyExample: { role: "ADMIN" },
            success: (0, swagger_1.ok200)(swagger_1.AdminUserDtoSchema),
            errors: [400, 404],
        }),
        preHandler: [
            auth_guard_1.adminGuard,
            (0, validation_middleware_1.validateParams)(admin_schema_1.userIdParamSchema),
            (0, validation_middleware_1.validateBody)(admin_schema_1.updateUserRoleSchema),
        ],
    }, c.updateUserRole.bind(c));
    // Blog moderation
    app.get("/blog", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "List blog posts (moderation)",
            description: `Paginated blog posts for moderation (all statuses as implemented by admin service).`,
            auth: "admin",
            querystring: admin_schema_1.paginationQuerySchema,
            success: (0, swagger_1.ok200)((0, swagger_1.paginatedSchema)(swagger_1.BlogDtoSchema)),
        }),
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateQuery)(admin_schema_1.paginationQuerySchema)],
    }, c.listBlogs.bind(c));
    app.delete("/blog/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "Delete blog post (moderation)",
            description: `Force-delete a blog post as administrator.`,
            auth: "admin",
            params: admin_schema_1.contentIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [404],
        }),
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateParams)(admin_schema_1.contentIdParamSchema)],
    }, c.deleteBlog.bind(c));
    // Community moderation — comments before :id to avoid shadowing
    app.delete("/community/comments/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "Delete community comment (moderation)",
            description: `Force-delete a community comment.`,
            auth: "admin",
            params: admin_schema_1.commentIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [404],
        }),
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateParams)(admin_schema_1.commentIdParamSchema)],
    }, c.deleteCommunityComment.bind(c));
    app.get("/community", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "List community posts (moderation)",
            description: `Paginated community posts for moderation.`,
            auth: "admin",
            querystring: admin_schema_1.paginationQuerySchema,
            success: (0, swagger_1.ok200)((0, swagger_1.paginatedSchema)(swagger_1.CommunityPostDtoSchema)),
        }),
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateQuery)(admin_schema_1.paginationQuerySchema)],
    }, c.listCommunity.bind(c));
    app.delete("/community/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "Delete community post (moderation)",
            description: `Force-delete a community post.`,
            auth: "admin",
            params: admin_schema_1.contentIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [404],
        }),
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateParams)(admin_schema_1.contentIdParamSchema)],
    }, c.deleteCommunityPost.bind(c));
    // Therapy resources
    app.get("/resources", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "List therapy resources (moderation)",
            description: `Paginated therapy resources for moderation.`,
            auth: "admin",
            querystring: admin_schema_1.paginationQuerySchema,
            success: (0, swagger_1.ok200)((0, swagger_1.paginatedSchema)(swagger_1.ResourceDtoSchema)),
        }),
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateQuery)(admin_schema_1.paginationQuerySchema)],
    }, c.listResources.bind(c));
    app.delete("/resources/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "Delete therapy resource (moderation)",
            description: `Force-delete a therapy resource.`,
            auth: "admin",
            params: admin_schema_1.contentIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [404],
        }),
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateParams)(admin_schema_1.contentIdParamSchema)],
    }, c.deleteResource.bind(c));
    // Public letters only
    app.get("/letters", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "List public letters (moderation)",
            description: `
Paginated **public** letters only.

**Privacy:** Private letters are never listed or readable by admins.
        `.trim(),
            auth: "admin",
            querystring: admin_schema_1.paginationQuerySchema,
            success: (0, swagger_1.ok200)((0, swagger_1.paginatedSchema)(swagger_1.LetterDtoSchema)),
        }),
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateQuery)(admin_schema_1.paginationQuerySchema)],
    }, c.listLetters.bind(c));
    app.delete("/letters/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "Delete public letter (moderation)",
            description: `Force-delete a public letter. Private letters remain inaccessible.`,
            auth: "admin",
            params: admin_schema_1.contentIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [403, 404],
        }),
        preHandler: [auth_guard_1.adminGuard, (0, validation_middleware_1.validateParams)(admin_schema_1.contentIdParamSchema)],
    }, c.deleteLetter.bind(c));
    // Explicit privacy denials (no content ever returned)
    const privacyDenySchema = {
        ...(0, swagger_1.docRoute)({
            tags: ["Admin"],
            summary: "Privacy wall — access denied",
            description: `
**Explicit privacy denial endpoint.**

Journals and chat message content are **never** accessible to administrators.
These routes always return \`ADMIN_PRIVACY_VIOLATION\` (403).

Provided so clients and scanners receive a clear contract instead of accidental exposure.
      `.trim(),
            auth: "admin",
            errors: [403],
        }).schema,
        response: {
            403: {
                description: "Privacy violation — content never available to admins",
                ...swagger_1.commonErrorResponses[403],
                example: {
                    success: false,
                    data: null,
                    error: {
                        type: "ADMIN_PRIVACY_VIOLATION",
                        message: "This content is private and not accessible to administrators",
                    },
                },
            },
        },
    };
    app.get("/journals", {
        schema: {
            ...privacyDenySchema,
            summary: "Journals list — always forbidden",
        },
        preHandler: [auth_guard_1.adminGuard],
    }, c.denyJournals.bind(c));
    app.get("/journals/:id", {
        schema: {
            ...privacyDenySchema,
            summary: "Journal by id — always forbidden",
            params: {
                type: "object",
                properties: {
                    id: { type: "string", description: "Journal id (never returned)" },
                },
            },
        },
        preHandler: [auth_guard_1.adminGuard],
    }, c.denyJournals.bind(c));
    app.get("/chat", {
        schema: {
            ...privacyDenySchema,
            summary: "Chat list — always forbidden",
        },
        preHandler: [auth_guard_1.adminGuard],
    }, c.denyChat.bind(c));
    app.get("/chat/:id", {
        schema: {
            ...privacyDenySchema,
            summary: "Chat by id — always forbidden",
            params: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        description: "Conversation id (content never returned)",
                    },
                },
            },
        },
        preHandler: [auth_guard_1.adminGuard],
    }, c.denyChat.bind(c));
    app.get("/messages", {
        schema: {
            ...privacyDenySchema,
            summary: "Messages list — always forbidden",
        },
        preHandler: [auth_guard_1.adminGuard],
    }, c.denyChat.bind(c));
    app.get("/messages/:id", {
        schema: {
            ...privacyDenySchema,
            summary: "Message by id — always forbidden",
            params: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        description: "Message id (content never returned)",
                    },
                },
            },
        },
        preHandler: [auth_guard_1.adminGuard],
    }, c.denyChat.bind(c));
}
