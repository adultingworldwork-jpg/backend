/**
 * Username normalization and slug generation (anonymous-first identity).
 */

const USERNAME_MIN = 2;
const USERNAME_MAX = 30;

/** Allowed display usernames: letters, numbers, spaces, _ . - */
const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9 _.\-]{0,28}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;

export function trimUsername(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Case-insensitive unique key for lookups.
 * Lowercase + collapsed whitespace.
 */
export function normalizeUsername(raw: string): string {
  return trimUsername(raw).toLowerCase();
}

/**
 * URL-safe slug derived from username (for future public profiles).
 * e.g. "Moon Flower" → "moon-flower"
 */
export function slugifyUsername(raw: string): string {
  const base = normalizeUsername(raw)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return base.slice(0, 48) || "user";
}

export function assertValidUsername(raw: string): string {
  const username = trimUsername(raw);

  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    throw new Error(
      `Username must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters`,
    );
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      "Username may only contain letters, numbers, spaces, underscores, dots, and hyphens",
    );
  }

  return username;
}

/** Recovery passphrase normalization before hashing (case-insensitive). */
export function normalizeRecoveryPassphrase(raw: string): string {
  return raw.trim().toLowerCase();
}

export const UsernameRules = {
  min: USERNAME_MIN,
  max: USERNAME_MAX,
  pattern: USERNAME_PATTERN,
};
