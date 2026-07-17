import { FastifyInstance } from "fastify";
import { JournalController } from "./journal.controller";
import { authGuard } from "@/core/auth.guard";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/core/validation.middleware";
import {
  createJournalSchema,
  journalIdParamSchema,
  journalListQuerySchema,
  updateJournalSchema,
} from "./journal.schema";
import {
  JournalDtoSchema,
  OkSchema,
  created201,
  docRoute,
  ok200,
  paginatedSchema,
} from "@/plugins/swagger";

const paginatedJournals = paginatedSchema(JournalDtoSchema);

/**
 * All journal routes require authentication.
 * Ownership is enforced exclusively in JournalService (ownerId scoping).
 */
export async function journalRoutes(app: FastifyInstance) {
  const c = new JournalController();

  app.post(
    "/",
    {
      ...docRoute({
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
        body: createJournalSchema,
        bodyExample: {
          title: "Morning reflection",
          content: "Today I practiced setting boundaries…",
          mood: "HOPEFUL",
          tags: ["boundaries", "growth"],
          attachmentUploadIds: [],
        },
        success: created201(JournalDtoSchema),
      }),
      preHandler: [authGuard, validateBody(createJournalSchema)],
    },
    c.create.bind(c),
  );

  app.get(
    "/",
    {
      ...docRoute({
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
        querystring: journalListQuerySchema,
        success: ok200(paginatedJournals),
      }),
      preHandler: [authGuard, validateQuery(journalListQuerySchema)],
    },
    c.list.bind(c),
  );

  app.put(
    "/:id",
    {
      ...docRoute({
        tags: ["Journal"],
        summary: "Update a journal entry",
        description: `
Update an owned journal entry. At least one field required.

**Errors:** \`JOURNAL_NOT_FOUND\` for missing or non-owned entries (no existence leak).
        `.trim(),
        auth: "bearer",
        params: journalIdParamSchema,
        body: updateJournalSchema,
        success: ok200(JournalDtoSchema),
        errors: [404],
      }),
      preHandler: [
        authGuard,
        validateParams(journalIdParamSchema),
        validateBody(updateJournalSchema),
      ],
    },
    c.update.bind(c),
  );

  app.delete(
    "/:id",
    {
      ...docRoute({
        tags: ["Journal"],
        summary: "Delete a journal entry",
        description: `Permanently delete an owned journal entry.`,
        auth: "bearer",
        params: journalIdParamSchema,
        success: ok200(OkSchema, { ok: true }),
        errors: [404],
      }),
      preHandler: [authGuard, validateParams(journalIdParamSchema)],
    },
    c.remove.bind(c),
  );

  app.get(
    "/:id",
    {
      ...docRoute({
        tags: ["Journal"],
        summary: "Get a journal entry",
        description: `
Fetch a single owned journal entry.

**Privacy:** Non-owners receive 404 — never 403 — to avoid leaking existence.
        `.trim(),
        auth: "bearer",
        params: journalIdParamSchema,
        success: ok200(JournalDtoSchema),
        errors: [404],
      }),
      preHandler: [authGuard, validateParams(journalIdParamSchema)],
    },
    c.get.bind(c),
  );
}
