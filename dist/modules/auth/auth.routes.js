"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const auth_controller_1 = require("./auth.controller");
const auth_guard_1 = require("../../core/auth.guard");
const validation_middleware_1 = require("../../core/validation.middleware");
const auth_schema_1 = require("./auth.schema");
async function authRoutes(app) {
    const controller = new auth_controller_1.AuthController();
    app.post("/register", { preHandler: [(0, validation_middleware_1.validateBody)(auth_schema_1.registerSchema)] }, controller.register.bind(controller));
    app.post("/login", { preHandler: [(0, validation_middleware_1.validateBody)(auth_schema_1.loginSchema)] }, controller.login.bind(controller));
    app.post("/recover", { preHandler: [(0, validation_middleware_1.validateBody)(auth_schema_1.recoverSchema)] }, controller.recover.bind(controller));
    app.post("/refresh", { preHandler: [(0, validation_middleware_1.validateBody)(auth_schema_1.refreshSchema)] }, controller.refresh.bind(controller));
    app.get("/me", { preHandler: [auth_guard_1.authGuard] }, controller.me.bind(controller));
    app.post("/logout", {
        preHandler: [
            // Optional auth — allow body-only refresh revoke
            async (request, reply) => {
                const header = request.headers.authorization;
                if (header) {
                    await (0, auth_guard_1.authGuard)(request, reply);
                }
            },
        ],
    }, async (request, reply) => {
        // Body optional for logout
        if (request.body && typeof request.body === "object") {
            const parsed = auth_schema_1.logoutSchema.safeParse(request.body);
            if (!parsed.success) {
                throw parsed.error;
            }
            request.body = parsed.data;
        }
        else {
            request.body = {};
        }
        return controller.logout(request, reply);
    });
}
