import bcrypt from "bcrypt";
import { Permission, Role, User } from "@/models/rbac.model";
import { Profile } from "@/modules/profile/profile.model";
import { BCRYPT_ROUNDS } from "@/modules/auth/auth.constants";
import {
  normalizeRecoveryPassphrase,
  normalizeUsername,
  slugifyUsername,
} from "@/utils/username";

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
export const DEFAULT_SUPER_ADMIN = {
  /** Login username (shown as Email in console for convenience). */
  email: "admin@test.com",
  password: "Admin@123",
  name: "System Administrator",
  /** Recovery passphrase required by User schema (not printed). */
  recoveryPassphrase: "default-dev-recovery-passphrase",
} as const;

const PERMISSION_NAMES = [
  "user.read",
  "user.create",
  "user.update",
  "user.delete",
  "admin.access",
] as const;

/**
 * Drop legacy email-based unique indexes from pre–Phase-1 schema.
 */
export async function dropLegacyUserIndexes(): Promise<void> {
  try {
    const col = User.collection;
    for (const name of ["email_1"]) {
      try {
        await col.dropIndex(name);
        console.log(`Dropped legacy index: ${name}`);
      } catch {
        /* index may not exist */
      }
    }
  } catch {
    /* collection may not exist yet */
  }
}

/**
 * Idempotent RBAC seed — permissions + admin/user roles.
 */
export async function seedRbac(): Promise<void> {
  const permissionIds = [];
  for (const name of PERMISSION_NAMES) {
    const doc = await Permission.findOneAndUpdate(
      { name },
      { name },
      { upsert: true, new: true },
    );
    permissionIds.push(doc._id);
  }

  await Role.findOneAndUpdate(
    { name: "admin" },
    { name: "admin", permissions: permissionIds },
    { upsert: true, new: true },
  );

  await Role.findOneAndUpdate(
    { name: "user" },
    { name: "user", permissions: [] },
    { upsert: true, new: true },
  );

  await Role.findOneAndUpdate(
    { name: "therapist" },
    { name: "therapist", permissions: [] },
    { upsert: true, new: true },
  );

  console.log("✅ Seeded roles: admin, user, therapist");
}

export type SeedDefaultAdminResult =
  | { created: true; userId: string }
  | { created: false; reason: "already_exists" };

/**
 * Idempotent default Super Admin seed.
 *
 * - Does nothing if the default Super Admin (username) already exists.
 * - Never creates a second copy of this account (unique usernameNormalized).
 * - Hashes password with the same bcrypt rounds as Auth module.
 * - Status ACTIVE; role = platform `admin` (SUPER_ADMIN equivalent).
 * - Prints credentials only when the account is newly created.
 */
export async function seedDefaultSuperAdmin(): Promise<SeedDefaultAdminResult> {
  const username = DEFAULT_SUPER_ADMIN.email;
  const usernameNormalized = normalizeUsername(username);
  const usernameSlug = slugifyUsername(username);

  // Idempotent: this specific default admin must not be duplicated
  const existingByUsername = await User.findOne({ usernameNormalized }).lean();
  if (existingByUsername) {
    return { created: false, reason: "already_exists" };
  }

  const adminRole = await Role.findOne({ name: "admin" }).lean();
  if (!adminRole) {
    throw new Error(
      'Role "admin" is missing. Run RBAC seed before seeding Super Admin.',
    );
  }

  const passwordHash = await bcrypt.hash(
    DEFAULT_SUPER_ADMIN.password,
    BCRYPT_ROUNDS,
  );
  const recoveryPassphraseHash = await bcrypt.hash(
    normalizeRecoveryPassphrase(DEFAULT_SUPER_ADMIN.recoveryPassphrase),
    BCRYPT_ROUNDS,
  );

  const user = await User.create({
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
  const existingProfile = await Profile.findOne({ userId }).lean();
  if (!existingProfile) {
    await Profile.create({
      userId,
      displayName: DEFAULT_SUPER_ADMIN.name,
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
  console.log(`Email: ${DEFAULT_SUPER_ADMIN.email}`);
  console.log(`Password: ${DEFAULT_SUPER_ADMIN.password}`);
  console.log("------------------------------------------------");

  return { created: true, userId };
}

/**
 * Full bootstrap seed: legacy indexes + RBAC + default Super Admin.
 * Safe to call on every backend start (idempotent).
 */
export async function runSeed(): Promise<void> {
  await dropLegacyUserIndexes();
  await seedRbac();
  await seedDefaultSuperAdmin();
}
