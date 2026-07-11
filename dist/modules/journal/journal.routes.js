"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.journalRoutes = journalRoutes;
const journal_controller_1 = require("./journal.controller");
const auth_guard_1 = require("@/core/auth.guard");
const validation_middleware_1 = require("@/core/validation.middleware");
const journal_schema_1 = require("./journal.schema");
/**
 * All journal routes require authentication.
 * Ownership is enforced exclusively in JournalService (ownerId scoping).
 */
async function journalRoutes(app) {
    const c = new journal_controller_1.JournalController();
    app.post("/", { preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(journal_schema_1.createJournalSchema)] }, c.create.bind(c));
    app.get("/", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(journal_schema_1.journalListQuerySchema)],
    }, c.list.bind(c));
    app.put("/:id", {
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(journal_schema_1.journalIdParamSchema),
            (0, validation_middleware_1.validateBody)(journal_schema_1.updateJournalSchema),
        ],
    }, c.update.bind(c));
    app.delete("/:id", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(journal_schema_1.journalIdParamSchema)],
    }, c.remove.bind(c));
    app.get("/:id", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(journal_schema_1.journalIdParamSchema)],
    }, c.get.bind(c));
}
