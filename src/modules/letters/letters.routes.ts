import { FastifyInstance } from "fastify";
import { LettersController } from "./letters.controller";
import { authGuard, optionalAuthGuard } from "@/core/auth.guard";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/core/validation.middleware";
import {
  createLetterSchema,
  letterIdParamSchema,
  letterListQuerySchema,
  updateLetterSchema,
} from "./letters.schema";
import {
  LetterDtoSchema,
  OkSchema,
  created201,
  docRoute,
  ok200,
  paginatedSchema,
} from "@/plugins/swagger";

const paginatedLetters = paginatedSchema(LetterDtoSchema);

export async function lettersRoutes(app: FastifyInstance) {
  const c = new LettersController();

  app.post(
    "/",
    {
      ...docRoute({
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
        body: createLetterSchema,
        bodyExample: {
          type: "PRIVATE",
          title: "A letter I never sent",
          content: "I wanted you to know…",
          mood: "SAD",
          recipientId: "665f1a2b3c4d5e6f7a8b9c99",
          attachmentUploadIds: [],
        },
        success: created201(LetterDtoSchema),
        errors: [400],
      }),
      preHandler: [authGuard, validateBody(createLetterSchema)],
    },
    c.create.bind(c),
  );

  app.get(
    "/me/sent",
    {
      ...docRoute({
        tags: ["Letters"],
        summary: "List letters I sent",
        description: `Paginated sent/outbound letters for the authenticated user.`,
        auth: "bearer",
        querystring: letterListQuerySchema,
        success: ok200(paginatedLetters),
      }),
      preHandler: [authGuard, validateQuery(letterListQuerySchema)],
    },
    c.sent.bind(c),
  );

  app.get(
    "/me/inbox",
    {
      ...docRoute({
        tags: ["Letters"],
        summary: "List letters in my inbox",
        description: `Paginated private letters addressed to the authenticated user.`,
        auth: "bearer",
        querystring: letterListQuerySchema,
        success: ok200(paginatedLetters),
      }),
      preHandler: [authGuard, validateQuery(letterListQuerySchema)],
    },
    c.inbox.bind(c),
  );

  app.get(
    "/public",
    {
      ...docRoute({
        tags: ["Letters"],
        summary: "Public letter feed",
        description: `
List sent PUBLIC letters.

**Auth:** Optional Bearer.
        `.trim(),
        auth: "optional",
        querystring: letterListQuerySchema,
        success: ok200(paginatedLetters),
      }),
      preHandler: [optionalAuthGuard, validateQuery(letterListQuerySchema)],
    },
    c.publicFeed.bind(c),
  );

  app.post(
    "/:id/send",
    {
      ...docRoute({
        tags: ["Letters"],
        summary: "Send a draft letter",
        description: `
Transition a DRAFT letter to SENT and set \`deliveredAt\`.

**Preconditions:** Caller is the sender; letter status is DRAFT.

**Errors:** \`LETTER_NOT_FOUND\`, \`LETTER_FORBIDDEN\`, \`LETTER_INVALID_STATE\`.
        `.trim(),
        auth: "bearer",
        params: letterIdParamSchema,
        success: ok200(LetterDtoSchema),
        errors: [400, 403, 404],
      }),
      preHandler: [authGuard, validateParams(letterIdParamSchema)],
    },
    c.send.bind(c),
  );

  app.post(
    "/:id/archive",
    {
      ...docRoute({
        tags: ["Letters"],
        summary: "Archive a letter",
        description: `
Archive a letter for the caller (sender or recipient as enforced by service).

**Postconditions:** status ARCHIVED; \`archivedAt\` set.
        `.trim(),
        auth: "bearer",
        params: letterIdParamSchema,
        success: ok200(LetterDtoSchema),
        errors: [400, 403, 404],
      }),
      preHandler: [authGuard, validateParams(letterIdParamSchema)],
    },
    c.archive.bind(c),
  );

  app.put(
    "/:id",
    {
      ...docRoute({
        tags: ["Letters"],
        summary: "Update a draft letter",
        description: `
Update letter fields while still editable (typically DRAFT). At least one field required.
        `.trim(),
        auth: "bearer",
        params: letterIdParamSchema,
        body: updateLetterSchema,
        success: ok200(LetterDtoSchema),
        errors: [400, 403, 404],
      }),
      preHandler: [
        authGuard,
        validateParams(letterIdParamSchema),
        validateBody(updateLetterSchema),
      ],
    },
    c.update.bind(c),
  );

  app.delete(
    "/:id",
    {
      ...docRoute({
        tags: ["Letters"],
        summary: "Delete a letter",
        description: `Delete a letter when allowed by ownership/state rules.`,
        auth: "bearer",
        params: letterIdParamSchema,
        success: ok200(OkSchema, { ok: true }),
        errors: [403, 404],
      }),
      preHandler: [authGuard, validateParams(letterIdParamSchema)],
    },
    c.remove.bind(c),
  );

  app.get(
    "/:id",
    {
      ...docRoute({
        tags: ["Letters"],
        summary: "Get a letter by id",
        description: `
Fetch a letter if the caller is allowed (sender, recipient, or public visibility rules).

**Auth:** Optional Bearer — public letters may be readable anonymously after send.
        `.trim(),
        auth: "optional",
        params: letterIdParamSchema,
        success: ok200(LetterDtoSchema),
        errors: [403, 404],
      }),
      preHandler: [optionalAuthGuard, validateParams(letterIdParamSchema)],
    },
    c.get.bind(c),
  );
}
