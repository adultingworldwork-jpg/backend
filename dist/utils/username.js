"use strict";
/**
 * Username normalization and slug generation (anonymous-first identity).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsernameRules = void 0;
exports.trimUsername = trimUsername;
exports.normalizeUsername = normalizeUsername;
exports.slugifyUsername = slugifyUsername;
exports.assertValidUsername = assertValidUsername;
exports.normalizeRecoveryPassphrase = normalizeRecoveryPassphrase;
const USERNAME_MIN = 2;
const USERNAME_MAX = 30;
/** Allowed display usernames: letters, numbers, spaces, _ . - */
const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9 _.\-]{0,28}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
function trimUsername(raw) {
    return raw.trim().replace(/\s+/g, " ");
}
/**
 * Case-insensitive unique key for lookups.
 * Lowercase + collapsed whitespace.
 */
function normalizeUsername(raw) {
    return trimUsername(raw).toLowerCase();
}
/**
 * URL-safe slug derived from username (for future public profiles).
 * e.g. "Moon Flower" → "moon-flower"
 */
function slugifyUsername(raw) {
    const base = normalizeUsername(raw)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
    return base.slice(0, 48) || "user";
}
function assertValidUsername(raw) {
    const username = trimUsername(raw);
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
        throw new Error(`Username must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters`);
    }
    if (!USERNAME_PATTERN.test(username)) {
        throw new Error("Username may only contain letters, numbers, spaces, underscores, dots, and hyphens");
    }
    return username;
}
/** Recovery passphrase normalization before hashing (case-insensitive). */
function normalizeRecoveryPassphrase(raw) {
    return raw.trim().toLowerCase();
}
exports.UsernameRules = {
    min: USERNAME_MIN,
    max: USERNAME_MAX,
    pattern: USERNAME_PATTERN,
};
