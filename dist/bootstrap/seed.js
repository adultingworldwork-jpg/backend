"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SUPER_ADMIN = void 0;
exports.dropLegacyUserIndexes = dropLegacyUserIndexes;
exports.seedRbac = seedRbac;
exports.seedDefaultSuperAdmin = seedDefaultSuperAdmin;
exports.runSeed = runSeed;
const bcrypt_1 = __importDefault(require("bcrypt"));
const rbac_model_1 = require("../models/rbac.model");
const profile_model_1 = require("../modules/profile/profile.model");
const auth_constants_1 = require("../modules/auth/auth.constants");
const username_1 = require("../utils/username");
/**
 * Default Super Admin credentials (development / testing only).
 *
 * Adulting101 is username-based (no email field). The login identifier is
 * stored as `username` and matches the Email value printed below so existing
 * login API / admin panel `username|password` flow works unchanged.
 *
 * Platform role name is `admin` (highest privilege / SUPER_ADMIN equivalent).
 * Guards and FE check `role === "admin"` or `admin.access` permission.
 */
exports.DEFAULT_SUPER_ADMIN = {
    /** Login username (shown as Email in console for convenience). */
    email: "admin@test.com",
    password: "Admin@123",
    name: "System Administrator",
    /** Recovery passphrase required by User schema (not printed). */
    recoveryPassphrase: "default-dev-recovery-passphrase",
};
const PERMISSION_NAMES = [
    "user.read",
    "user.create",
    "user.update",
    "user.delete",
    "admin.access",
];
/**
 * Drop legacy email-based unique indexes from pre–Phase-1 schema.
 */
async function dropLegacyUserIndexes() {
    try {
        const col = rbac_model_1.User.collection;
        for (const name of ["email_1"]) {
            try {
                await col.dropIndex(name);
                console.log(`Dropped legacy index: ${name}`);
            }
            catch {
                /* index may not exist */
            }
        }
    }
    catch {
        /* collection may not exist yet */
    }
}
/**
 * Idempotent RBAC seed — permissions + admin/user roles.
 */
async function seedRbac() {
    const permissionIds = [];
    for (const name of PERMISSION_NAMES) {
        const doc = await rbac_model_1.Permission.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
        permissionIds.push(doc._id);
    }
    await rbac_model_1.Role.findOneAndUpdate({ name: "admin" }, { name: "admin", permissions: permissionIds }, { upsert: true, new: true });
    await rbac_model_1.Role.findOneAndUpdate({ name: "user" }, { name: "user", permissions: [] }, { upsert: true, new: true });
    console.log("✅ Seeded roles: admin, user");
}
/**
 * Idempotent default Super Admin seed.
 *
 * - Does nothing if the default Super Admin (username) already exists.
 * - Never creates a second copy of this account (unique usernameNormalized).
 * - Hashes password with the same bcrypt rounds as Auth module.
 * - Status ACTIVE; role = platform `admin` (SUPER_ADMIN equivalent).
 * - Prints credentials only when the account is newly created.
 */
async function seedDefaultSuperAdmin() {
    const username = exports.DEFAULT_SUPER_ADMIN.email;
    const usernameNormalized = (0, username_1.normalizeUsername)(username);
    const usernameSlug = (0, username_1.slugifyUsername)(username);
    // Idempotent: this specific default admin must not be duplicated
    const existingByUsername = await rbac_model_1.User.findOne({ usernameNormalized }).lean();
    if (existingByUsername) {
        return { created: false, reason: "already_exists" };
    }
    const adminRole = await rbac_model_1.Role.findOne({ name: "admin" }).lean();
    if (!adminRole) {
        throw new Error('Role "admin" is missing. Run RBAC seed before seeding Super Admin.');
    }
    const passwordHash = await bcrypt_1.default.hash(exports.DEFAULT_SUPER_ADMIN.password, auth_constants_1.BCRYPT_ROUNDS);
    const recoveryPassphraseHash = await bcrypt_1.default.hash((0, username_1.normalizeRecoveryPassphrase)(exports.DEFAULT_SUPER_ADMIN.recoveryPassphrase), auth_constants_1.BCRYPT_ROUNDS);
    const user = await rbac_model_1.User.create({
        username,
        usernameNormalized,
        usernameSlug,
        passwordHash,
        recoveryPassphraseHash,
        role: adminRole._id,
        acceptedTermsAt: new Date(),
        status: "ACTIVE",
        failedLoginAttempts: 0,
        lockUntil: null,
        currentRefreshTokenHash: null,
        previousRefreshTokenHash: null,
    });
    const userId = String(user._id);
    // Profile display name ("System Administrator") — same pattern as registration
    const existingProfile = await profile_model_1.Profile.findOne({ userId }).lean();
    if (!existingProfile) {
        await profile_model_1.Profile.create({
            userId,
            displayName: exports.DEFAULT_SUPER_ADMIN.name,
            bio: "",
            avatar: null,
            coverImage: null,
            pronouns: "",
            location: "",
            website: "",
            dateOfBirth: null,
            visibility: "PRIVATE",
            preferences: {},
        });
    }
    console.log("------------------------------------------------");
    console.log("Default Super Admin");
    console.log(`Email: ${exports.DEFAULT_SUPER_ADMIN.email}`);
    console.log(`Password: ${exports.DEFAULT_SUPER_ADMIN.password}`);
    console.log("------------------------------------------------");
    return { created: true, userId };
}
/**
 * Full bootstrap seed: legacy indexes + RBAC + default Super Admin.
 * Safe to call on every backend start (idempotent).
 */
async function runSeed() {
    await dropLegacyUserIndexes();
    await seedRbac();
    await seedDefaultSuperAdmin();
}
