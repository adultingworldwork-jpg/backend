"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutSchema = exports.refreshSchema = exports.recoverSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const username_1 = require("../../utils/username");
exports.registerSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .trim()
        .min(username_1.UsernameRules.min, `Username must be at least ${username_1.UsernameRules.min} characters`)
        .max(username_1.UsernameRules.max, `Username must be at most ${username_1.UsernameRules.max} characters`),
    password: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(60, "Password must be at most 60 characters"),
    recoveryPassphrase: zod_1.z
        .string()
        .trim()
        .min(1, "Recovery passphrase is required")
        .max(40, "Recovery passphrase must be at most 40 characters"),
    acceptedTerms: zod_1.z.literal(true, "You must accept the Community Agreement"),
});
exports.loginSchema = zod_1.z.object({
    username: zod_1.z.string().trim().min(1, "Username is required"),
    password: zod_1.z.string().min(1, "Password is required"),
});
exports.recoverSchema = zod_1.z.object({
    username: zod_1.z.string().trim().min(1, "Username is required"),
    recoveryPassphrase: zod_1.z.string().trim().min(1, "Recovery passphrase is required"),
    newPassword: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(60, "Password must be at most 60 characters"),
});
exports.refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, "Refresh token is required"),
});
exports.logoutSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().optional(),
});
