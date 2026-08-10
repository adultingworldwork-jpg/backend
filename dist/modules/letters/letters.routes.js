"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lettersRoutes = lettersRoutes;
const letters_controller_1 = require("./letters.controller");
const auth_guard_1 = require("../../core/auth.guard");
const validation_middleware_1 = require("../../core/validation.middleware");
const letters_schema_1 = require("./letters.schema");
const swagger_1 = require("../../plugins/swagger");
const paginatedLetters = (0, swagger_1.paginatedSchema)(swagger_1.LetterDtoSchema);
async function lettersRoutes(app) {
    const c = new letters_controller_1.LettersController();
    app.post("/", {
        ...(0, swagger_1.docRoute)({
            tags: ["Letters"],
            summary: "Create a letter (draft)",
            description: `
Create a standalone emotional letter in DRAFT status (not a chat thread — no replies).

**Types:**
- \`PRIVATE\` — requires \`recipientId\`
- \`PUBLIC\` — must not include \`recipientId\`

**Body:** title, content (max 20k), mood, optional attachments (max 5).

**Postconditions:** Letter stored as DRAFT until \`POST /:id/send\`.
        `.trim(),
            auth: "bearer",
            body: letters_schema_1.createLetterSchema,
            bodyExample: {
                type: "PRIVATE",
                title: "A letter I never sent",
                content: "I wanted you to know…",
                mood: "SAD",
                recipientId: "665f1a2b3c4d5e6f7a8b9c99",
                attachmentUploadIds: [],
            },
            success: (0, swagger_1.created201)(swagger_1.LetterDtoSchema),
            errors: [400],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(letters_schema_1.createLetterSchema)],
    }, c.create.bind(c));
    app.get("/me/sent", {
        ...(0, swagger_1.docRoute)({
            tags: ["Letters"],
            summary: "List letters I sent",
            description: `Paginated sent/outbound letters for the authenticated user.`,
            auth: "bearer",
            querystring: letters_schema_1.letterListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedLetters),
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(letters_schema_1.letterListQuerySchema)],
    }, c.sent.bind(c));
    app.get("/me/inbox", {
        ...(0, swagger_1.docRoute)({
            tags: ["Letters"],
            summary: "List letters in my inbox",
            description: `Paginated private letters addressed to the authenticated user.`,
            auth: "bearer",
            querystring: letters_schema_1.letterListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedLetters),
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(letters_schema_1.letterListQuerySchema)],
    }, c.inbox.bind(c));
    app.get("/public", {
        ...(0, swagger_1.docRoute)({
            tags: ["Letters"],
            summary: "Public letter feed",
            description: `
List sent PUBLIC letters.

**Auth:** Optional Bearer.
        `.trim(),
            auth: "optional",
            querystring: letters_schema_1.letterListQuerySchema,
            success: (0, swagger_1.ok200)(paginatedLetters),
        }),
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateQuery)(letters_schema_1.letterListQuerySchema)],
    }, c.publicFeed.bind(c));
    app.post("/:id/send", {
        ...(0, swagger_1.docRoute)({
            tags: ["Letters"],
            summary: "Send a draft letter",
            description: `
Transition a DRAFT letter to SENT and set \`deliveredAt\`.

**Preconditions:** Caller is the sender; letter status is DRAFT.

**Errors:** \`LETTER_NOT_FOUND\`, \`LETTER_FORBIDDEN\`, \`LETTER_INVALID_STATE\`.
        `.trim(),
            auth: "bearer",
            params: letters_schema_1.letterIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.LetterDtoSchema),
            errors: [400, 403, 404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(letters_schema_1.letterIdParamSchema)],
    }, c.send.bind(c));
    app.post("/:id/archive", {
        ...(0, swagger_1.docRoute)({
            tags: ["Letters"],
            summary: "Archive a letter",
            description: `
Archive a letter for the caller (sender or recipient as enforced by service).

**Postconditions:** status ARCHIVED; \`archivedAt\` set.
        `.trim(),
            auth: "bearer",
            params: letters_schema_1.letterIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.LetterDtoSchema),
            errors: [400, 403, 404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(letters_schema_1.letterIdParamSchema)],
    }, c.archive.bind(c));
    app.put("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Letters"],
            summary: "Update a draft letter",
            description: `
Update letter fields while still editable (typically DRAFT). At least one field required.
        `.trim(),
            auth: "bearer",
            params: letters_schema_1.letterIdParamSchema,
            body: letters_schema_1.updateLetterSchema,
            success: (0, swagger_1.ok200)(swagger_1.LetterDtoSchema),
            errors: [400, 403, 404],
        }),
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(letters_schema_1.letterIdParamSchema),
            (0, validation_middleware_1.validateBody)(letters_schema_1.updateLetterSchema),
        ],
    }, c.update.bind(c));
    app.delete("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Letters"],
            summary: "Delete a letter",
            description: `Delete a letter when allowed by ownership/state rules.`,
            auth: "bearer",
            params: letters_schema_1.letterIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [403, 404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(letters_schema_1.letterIdParamSchema)],
    }, c.remove.bind(c));
    app.get("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Letters"],
            summary: "Get a letter by id",
            description: `
Fetch a letter if the caller is allowed (sender, recipient, or public visibility rules).

**Auth:** Optional Bearer — public letters may be readable anonymously after send.
        `.trim(),
            auth: "optional",
            params: letters_schema_1.letterIdParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.LetterDtoSchema),
            errors: [403, 404],
        }),
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateParams)(letters_schema_1.letterIdParamSchema)],
    }, c.get.bind(c));
}
