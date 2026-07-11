import { z } from "zod";
import { UsernameRules } from "@/utils/username";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(UsernameRules.min, `Username must be at least ${UsernameRules.min} characters`)
    .max(UsernameRules.max, `Username must be at most ${UsernameRules.max} characters`),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(60, "Password must be at most 60 characters"),
  recoveryPassphrase: z
    .string()
    .trim()
    .min(1, "Recovery passphrase is required")
    .max(40, "Recovery passphrase must be at most 40 characters"),
  acceptedTerms: z.literal(true, "You must accept the Community Agreement"),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const recoverSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  recoveryPassphrase: z.string().trim().min(1, "Recovery passphrase is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(60, "Password must be at most 60 characters"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RecoverInput = z.infer<typeof recoverSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
