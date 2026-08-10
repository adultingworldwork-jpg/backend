import { z } from "zod";
import { USER_STATUSES } from "@/models/rbac.model";

export const ADMIN_ROLES = ["USER", "ADMIN"] as const;

export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .default(1)
    .describe("Page number (1-based, default 1)"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe("Page size (default 20, max 100)"),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1).describe("User id"),
});

export const contentIdParamSchema = z.object({
  id: z.string().min(1).describe("Content resource id"),
});

export const commentIdParamSchema = z.object({
  id: z.string().min(1).describe("Comment id"),
});

export const updateUserStatusSchema = z
  .object({
    status: z
      .enum(USER_STATUSES)
      .describe("Admin-managed status: ACTIVE | SUSPENDED | LOCKED"),
  })
  .strict();

export const updateUserRoleSchema = z
  .object({
    role: z.enum(ADMIN_ROLES).describe("Role assignment: USER or ADMIN"),
  })
  .strict();

export const createTherapistSchema = z
  .object({
    name: z.string().trim().min(1).max(80).describe("Therapist full name"),
    specialty: z
      .string()
      .trim()
      .max(120)
      .optional()
      .default("")
      .describe("Specialty / role (optional)"),
    code: z
      .string()
      .regex(/^\d{4}$/, "Access code must be exactly 4 digits")
      .describe("4-digit access code"),
  })
  .strict();

export const updateTherapistSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    specialty: z.string().trim().max(120).optional(),
    code: z
      .string()
      .regex(/^\d{4}$/, "Access code must be exactly 4 digits")
      .optional(),
    repliesCount: z.number().int().min(0).optional(),
    sessionsAttended: z.number().int().min(0).optional(),
  })
  .strict();

export const verifyTherapistSchema = z
  .object({
    name: z.string().trim().min(1).max(80).describe("Therapist display name"),
    code: z
      .string()
      .regex(/^\d{4}$/, "Access code must be exactly 4 digits")
      .describe("4-digit access code"),
  })
  .strict();

export const therapistIdParamSchema = z.object({
  id: z.string().min(1).describe("Therapist id"),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type CreateTherapistInput = z.infer<typeof createTherapistSchema>;
export type UpdateTherapistInput = z.infer<typeof updateTherapistSchema>;
export type VerifyTherapistInput = z.infer<typeof verifyTherapistSchema>;
