"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const user_controller_1 = require("./user.controller");
/**
 * Legacy/stub user listing — hidden from public OpenAPI docs.
 * Prefer Admin `/api/v1/admin/users` for production user management.
 */
async function userRoutes(app) {
    const controller = new user_controller_1.UserController();
    app.get("/", {
        schema: {
            hide: true,
            tags: ["Users"],
            summary: "List users (legacy stub — hidden)",
            description: "Internal/legacy endpoint without production auth guarantees. Use Admin APIs instead.",
            deprecated: true,
        },
    }, controller.getUsers.bind(controller));
}
