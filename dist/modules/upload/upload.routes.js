"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = uploadRoutes;
const upload_controller_1 = require("./upload.controller");
const auth_guard_1 = require("../../core/auth.guard");
async function uploadRoutes(app) {
    const controller = new upload_controller_1.UploadController();
    // Auth required for uploads; anonymous product users will use JWT after Phase 1.
    app.post("/", { preHandler: [auth_guard_1.authGuard] }, controller.upload.bind(controller));
    app.delete("/:id", { preHandler: [auth_guard_1.authGuard] }, controller.remove.bind(controller));
}
