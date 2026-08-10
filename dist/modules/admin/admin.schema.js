"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRoleSchema = exports.updateUserStatusSchema = exports.commentIdParamSchema = exports.contentIdParamSchema = exports.userIdParamSchema = exports.paginationQuerySchema = exports.ADMIN_ROLES = void 0;
const zod_1 = require("zod");
const rbac_model_1 = require("../../models/rbac.model");
exports.ADMIN_ROLES = ["USER", "ADMIN"];
exports.paginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce
        .number()
        .int()
        .min(1)
        .optional()
        .default(1)
        .describe("Page number (1-based, default 1)"),
    limit: zod_1.z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe("Page size (default 20, max 100)"),
});
exports.userIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1).describe("User id"),
});
exports.contentIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1).describe("Content resource id"),
});
exports.commentIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1).describe("Comment id"),
});
exports.updateUserStatusSchema = zod_1.z
    .object({
    status: zod_1.z
        .enum(rbac_model_1.USER_STATUSES)
        .describe("Admin-managed status: ACTIVE | SUSPENDED | LOCKED"),
})
    .strict();
exports.updateUserRoleSchema = zod_1.z
    .object({
    role: zod_1.z.enum(exports.ADMIN_ROLES).describe("Role assignment: USER or ADMIN"),
})
    .strict();
