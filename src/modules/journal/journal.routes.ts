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

/**
 * All journal routes require authentication.
 * Ownership is enforced exclusively in JournalService (ownerId scoping).
 */
export async function journalRoutes(app: FastifyInstance) {
  const c = new JournalController();

  app.post(
    "/",
    { preHandler: [authGuard, validateBody(createJournalSchema)] },
    c.create.bind(c),
  );

  app.get(
    "/",
    {
      preHandler: [authGuard, validateQuery(journalListQuerySchema)],
    },
    c.list.bind(c),
  );

  app.put(
    "/:id",
    {
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
      preHandler: [authGuard, validateParams(journalIdParamSchema)],
    },
    c.remove.bind(c),
  );

  app.get(
    "/:id",
    {
      preHandler: [authGuard, validateParams(journalIdParamSchema)],
    },
    c.get.bind(c),
  );
}
