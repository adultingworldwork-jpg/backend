"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRoutes = profileRoutes;
const profile_controller_1 = require("./profile.controller");
const auth_guard_1 = require("../../core/auth.guard");
const validation_middleware_1 = require("../../core/validation.middleware");
const profile_schema_1 = require("./profile.schema");
async function profileRoutes(app) {
    const controller = new profile_controller_1.ProfileController();
    app.get("/me", { preHandler: [auth_guard_1.authGuard] }, controller.getMe.bind(controller));
    app.put("/me", { preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(profile_schema_1.updateProfileSchema)] }, controller.updateMe.bind(controller));
    // Media endpoints: auth required; body may be JSON ref or multipart
    app.patch("/avatar", { preHandler: [auth_guard_1.authGuard] }, controller.updateAvatar.bind(controller));
    app.patch("/cover", { preHandler: [auth_guard_1.authGuard] }, controller.updateCover.bind(controller));
    // Public lookup by auth username — visibility enforced in service
    app.get("/:username", {
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateParams)(profile_schema_1.usernameParamSchema)],
    }, controller.getByUsername.bind(controller));
}
