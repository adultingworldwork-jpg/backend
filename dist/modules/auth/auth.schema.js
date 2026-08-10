"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutSchema = exports.refreshSchema = exports.recoverSchema = exports.adminLoginSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const username_1 = require("../../utils/username");
exports.registerSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .trim()
        .min(username_1.UsernameRules.min, `Username must be at least ${username_1.UsernameRules.min} characters`)
        .max(username_1.UsernameRules.max, `Username must be at most ${username_1.UsernameRules.max} characters`)
        .describe("Display username (2–30 chars). Letters, numbers, spaces, underscores, dots, hyphens. Uniqueness is case-insensitive."),
    password: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(60, "Password must be at most 60 characters")
        .describe("Account password (8–60 characters). Never returned by the API."),
    recoveryPassphrase: zod_1.z
        .string()
        .trim()
        .min(1, "Recovery passphrase is required")
        .max(40, "Recovery passphrase must be at most 40 characters")
        .describe("Secret passphrase for password recovery (1–40 chars). Store securely — there is no email reset."),
    acceptedTerms: zod_1.z
        .literal(true, "You must accept the Community Agreement")
        .describe("Must be literal true — user accepted the Community Agreement."),
});
exports.loginSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .trim()
        .min(1, "Username is required")
        .describe("Username (case-insensitive match)."),
    password: zod_1.z
        .string()
        .min(1, "Password is required")
        .describe("Account password."),
});
/**
 * Admin Panel password-only login (single password field on the UI).
 * Backend matches the password against platform admin accounts only.
 */
exports.adminLoginSchema = zod_1.z.object({
    password: zod_1.z
        .string()
        .min(1, "Password is required")
        .describe("Admin Panel password."),
});
exports.recoverSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .trim()
        .min(1, "Username is required")
        .describe("Username of the account to recover."),
    recoveryPassphrase: zod_1.z
        .string()
        .trim()
        .min(1, "Recovery passphrase is required")
        .describe("Recovery passphrase set at registration."),
    newPassword: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(60, "Password must be at most 60 characters")
        .describe("New password (8–60 characters). Invalidates all refresh tokens."),
});
exports.refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z
        .string()
        .min(1, "Refresh token is required")
        .describe("Current refresh JWT. Must be replaced after each successful refresh."),
});
exports.logoutSchema = zod_1.z.object({
    refreshToken: zod_1.z
        .string()
        .optional()
        .describe("Optional refresh token to revoke when Bearer header is not sent."),
});
