"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lettersRoutes = lettersRoutes;
const letters_controller_1 = require("./letters.controller");
const auth_guard_1 = require("@/core/auth.guard");
const validation_middleware_1 = require("@/core/validation.middleware");
const letters_schema_1 = require("./letters.schema");
async function lettersRoutes(app) {
    const c = new letters_controller_1.LettersController();
    // Static multi-segment paths first
    app.post("/", { preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(letters_schema_1.createLetterSchema)] }, c.create.bind(c));
    app.get("/me/sent", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(letters_schema_1.letterListQuerySchema)],
    }, c.sent.bind(c));
    app.get("/me/inbox", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateQuery)(letters_schema_1.letterListQuerySchema)],
    }, c.inbox.bind(c));
    app.get("/public", {
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateQuery)(letters_schema_1.letterListQuerySchema)],
    }, c.publicFeed.bind(c));
    app.post("/:id/send", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(letters_schema_1.letterIdParamSchema)],
    }, c.send.bind(c));
    app.post("/:id/archive", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(letters_schema_1.letterIdParamSchema)],
    }, c.archive.bind(c));
    app.put("/:id", {
        preHandler: [
            auth_guard_1.authGuard,
            (0, validation_middleware_1.validateParams)(letters_schema_1.letterIdParamSchema),
            (0, validation_middleware_1.validateBody)(letters_schema_1.updateLetterSchema),
        ],
    }, c.update.bind(c));
    app.delete("/:id", {
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateParams)(letters_schema_1.letterIdParamSchema)],
    }, c.remove.bind(c));
    app.get("/:id", {
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateParams)(letters_schema_1.letterIdParamSchema)],
    }, c.get.bind(c));
}
