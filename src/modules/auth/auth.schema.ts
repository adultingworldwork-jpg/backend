import { z } from "zod";
import { UsernameRules } from "@/utils/username";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(UsernameRules.min, `Username must be at least ${UsernameRules.min} characters`)
    .max(UsernameRules.max, `Username must be at most ${UsernameRules.max} characters`)
    .describe(
      "Display username (2–30 chars). Letters, numbers, spaces, underscores, dots, hyphens. Uniqueness is case-insensitive.",
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(60, "Password must be at most 60 characters")
    .describe("Account password (8–60 characters). Never returned by the API."),
  recoveryPassphrase: z
    .string()
    .trim()
    .min(1, "Recovery passphrase is required")
    .max(40, "Recovery passphrase must be at most 40 characters")
    .describe(
      "Secret passphrase for password recovery (1–40 chars). Store securely — there is no email reset.",
    ),
  acceptedTerms: z
    .literal(true, "You must accept the Community Agreement")
    .describe("Must be literal true — user accepted the Community Agreement."),
});

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .describe("Username (case-insensitive match)."),
  password: z
    .string()
    .min(1, "Password is required")
    .describe("Account password."),
});

export const recoverSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .describe("Username of the account to recover."),
  recoveryPassphrase: z
    .string()
    .trim()
    .min(1, "Recovery passphrase is required")
    .describe("Recovery passphrase set at registration."),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(60, "Password must be at most 60 characters")
    .describe("New password (8–60 characters). Invalidates all refresh tokens."),
});

export const refreshSchema = z.object({
  refreshToken: z
    .string()
    .min(1, "Refresh token is required")
    .describe("Current refresh JWT. Must be replaced after each successful refresh."),
});

export const logoutSchema = z.object({
  refreshToken: z
    .string()
    .optional()
    .describe("Optional refresh token to revoke when Bearer header is not sent."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RecoverInput = z.infer<typeof recoverSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
