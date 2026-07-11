"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usernameParamSchema = exports.mediaRefSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
const profile_model_1 = require("./profile.model");
exports.updateProfileSchema = zod_1.z
    .object({
    displayName: zod_1.z
        .string()
        .trim()
        .min(1, "Display name is required")
        .max(30, "Display name must be at most 30 characters")
        .optional(),
    bio: zod_1.z.string().max(1000, "Bio must be at most 1000 characters").optional(),
    pronouns: zod_1.z
        .string()
        .max(40, "Pronouns must be at most 40 characters")
        .optional(),
    location: zod_1.z
        .string()
        .max(80, "Location must be at most 80 characters")
        .optional(),
    website: zod_1.z
        .union([
        zod_1.z.literal(""),
        zod_1.z.string().trim().url("Website must be a valid URL").max(200),
    ])
        .optional(),
    dateOfBirth: zod_1.z
        .union([
        zod_1.z.null(),
        zod_1.z.string().datetime({ offset: true }),
        zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD or ISO date"),
    ])
        .optional(),
    visibility: zod_1.z.enum(profile_model_1.PROFILE_VISIBILITY).optional(),
    preferences: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
})
    .strict();
exports.mediaRefSchema = zod_1.z
    .object({
    url: zod_1.z.string().url("url must be a valid URL").optional(),
    uploadId: zod_1.z.string().min(1).optional(),
})
    .strict()
    .refine((v) => Boolean(v.url || v.uploadId), {
    message: "Provide url or uploadId",
});
exports.usernameParamSchema = zod_1.z.object({
    username: zod_1.z.string().trim().min(1).max(30),
});
