import { z } from "zod";
import { USER_STATUSES } from "@/models/rbac.model";

export const ADMIN_ROLES = ["USER", "ADMIN"] as const;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export const contentIdParamSchema = z.object({
  id: z.string().min(1),
});

export const commentIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateUserStatusSchema = z
  .object({
    status: z.enum(USER_STATUSES),
  })
  .strict();

export const updateUserRoleSchema = z
  .object({
    role: z.enum(ADMIN_ROLES),
  })
  .strict();

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
