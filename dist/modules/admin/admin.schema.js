"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.therapistIdParamSchema = exports.verifyTherapistSchema = exports.updateTherapistSchema = exports.createTherapistSchema = exports.updateUserRoleSchema = exports.updateUserStatusSchema = exports.commentIdParamSchema = exports.contentIdParamSchema = exports.userIdParamSchema = exports.paginationQuerySchema = exports.ADMIN_ROLES = void 0;
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
exports.createTherapistSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(1).max(80).describe("Therapist full name"),
    specialty: zod_1.z
        .string()
        .trim()
        .max(120)
        .optional()
        .default("")
        .describe("Specialty / role (optional)"),
    code: zod_1.z
        .string()
        .regex(/^\d{4}$/, "Access code must be exactly 4 digits")
        .describe("4-digit access code"),
})
    .strict();
exports.updateTherapistSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(1).max(80).optional(),
    specialty: zod_1.z.string().trim().max(120).optional(),
    code: zod_1.z
        .string()
        .regex(/^\d{4}$/, "Access code must be exactly 4 digits")
        .optional(),
    repliesCount: zod_1.z.number().int().min(0).optional(),
    sessionsAttended: zod_1.z.number().int().min(0).optional(),
})
    .strict();
exports.verifyTherapistSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(1).max(80).describe("Therapist display name"),
    code: zod_1.z
        .string()
        .regex(/^\d{4}$/, "Access code must be exactly 4 digits")
        .describe("4-digit access code"),
})
    .strict();
exports.therapistIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1).describe("Therapist id"),
});
