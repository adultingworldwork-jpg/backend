"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.journalRoutes = journalRoutes;
const journal_controller_1 = require("./journal.controller");
const auth_guard_1 = require("../../core/auth.guard");
const validation_middleware_1 = require("../../core/validation.middleware");
const journal_schema_1 = require("./journal.schema");
const swagger_1 = require("../../plugins/swagger");
const paginatedJournals = (0, swagger_1.paginatedSchema)(swagger_1.JournalDtoSchema);
/**
 * All journal routes require authentication.
 * Ownership is enforced exclusively in JournalService (ownerId scoping).
 */
async function journalRoutes(app) {
    const c = new journal_controller_1.JournalController();
    app.post("/", {
        ...(0, swagger_1.docRoute)({
            tags: ["Journal"],
            summary: "Create a private journal entry",
            description: `
Create a private journal entry owned by the authenticated user.

**Privacy:** Journals are never readable by other users or admins. Non-owners always get \`JOURNAL_NOT_FOUND\`.

**Body:**
- \`title\` 1–200, \`content\` required (max 100k)
- \`mood\`: HAPPY | CALM | SAD | ANXIOUS | STRESSED | ANGRY | HOPEFUL | EXCITED | TIRED | OTHER
- \`tags\` max 20
- \`attachmentUploadIds\` max 10
        `.trim(),
            auth: "bearer",
            body: journal_schema_1.createJournalSchema,
            bodyExample: {
                title: "Morning reflection",
                content: "Today I practiced setting boundaries…",
                mood: "HOPEFUL",
                tags: ["boundaries", "growth"],
                attachmentUploadIds: [],
            },
            success: (0, swagger_1.created201)(swagger_1.JournalDtoSchema),
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(journal_schema_1.createJournalSchema)],
    }, c.create.bind(c));
    app.get("/", {
        ...(0, swagger_1.docRoute)({
            tags: ["Journal"],
            summary: "List my journal entries",
            description: `
Paginated list of the caller's journal entries only.

**Filters (query):**
- \`page\`, \`limit\`
- \`mood\` enum filter
- \`tag\` single tag filter
- \`from\` / \`to\` date range (\`YYYY-MM-DD\` or ISO datetime)
        `.trim(),
            auth: "bearer",
            querystring: journal_schema_1.journalListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedJournals),
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(journal_schema_1.journalListQuerySchema)],
    }, c.list.bind(c));
    app.put("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Journal"],
            summary: "Update a journal entry",
            description: `
Update an owned journal entry. At least one field required.

**Errors:** \`JOURNAL_NOT_FOUND\` for missing or non-owned entries (no existence leak).
        `.trim(),
            auth: "bearer",
            params: journal_schema_1.journalIdParamSchema,
            body: journal_schema_1.updateJournalSchema,
            success: (0, swagger_1.ok200)(swagger_1.JournalDtoSchema),
            errors: [404],
        }),
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(journal_schema_1.journalIdParamSchema),
            (0, validation_middleware_1.validateBody)(journal_schema_1.updateJournalSchema),
        ],
    }, c.update.bind(c));
    app.delete("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Journal"],
            summary: "Delete a journal entry",
            description: `Permanently delete an owned journal entry.`,
            auth: "bearer",
            params: journal_schema_1.journalIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(journal_schema_1.journalIdParamSchema)],
    }, c.remove.bind(c));
    app.get("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Journal"],
            summary: "Get a journal entry",
            description: `
Fetch a single owned journal entry.

**Privacy:** Non-owners receive 404 — never 403 — to avoid leaking existence.
        `.trim(),
            auth: "bearer",
            params: journal_schema_1.journalIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.JournalDtoSchema),
            errors: [404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(journal_schema_1.journalIdParamSchema)],
    }, c.get.bind(c));
}
