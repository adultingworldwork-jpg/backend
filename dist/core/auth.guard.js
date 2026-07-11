"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authGuard = authGuard;
exports.optionalAuthGuard = optionalAuthGuard;
exports.adminGuard = adminGuard;
const app_error_1 = require("@/utils/app-error");
async function authGuard(request, _reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        request.log.warn("Missing Authorization header");
        throw app_error_1.AppError.fromCode("UNAUTHORIZED");
    }
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        request.log.warn({ authHeader }, "Invalid Authorization format");
        throw app_error_1.AppError.fromCode("INVALID_TOKEN", "Invalid token format");
    }
    try {
        const decoded = request.server.jwt.verifyAccess(token);
        request.ctx.user = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role,
            permissions: decoded.permissions,
            type: decoded.userType || decoded.type,
        };
        request.log = request.log.child({
            userId: decoded.id,
            username: decoded.username,
            role: decoded.role,
            requestId: request.ctx.requestId,
        });
        request.log.debug("User authenticated");
    }
    catch (error) {
        request.log.warn({ error }, "Token verification failed");
        throw app_error_1.AppError.fromCode("INVALID_TOKEN");
    }
}
/**
 * Attach user when a Bearer token is present; otherwise continue anonymously.
 * Used for visibility-gated public profile reads.
 */
async function optionalAuthGuard(request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader)
        return;
    await authGuard(request, reply);
}
/**
 * Require authenticated ADMIN role (or admin.access permission).
 * Must run after authGuard, or include auth itself.
 */
async function adminGuard(request, reply) {
    await authGuard(request, reply);
    const role = (request.ctx.user?.role || "").toLowerCase();
    const permissions = request.ctx.user?.permissions || [];
    const isAdmin = role === "admin" || permissions.includes("admin.access");
    if (!isAdmin) {
        request.log.warn({ userId: request.ctx.user?.id, role }, "Admin access denied");
        throw app_error_1.AppError.fromCode("ADMIN_REQUIRED");
    }
}
