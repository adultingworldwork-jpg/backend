/** Failed login attempts before lockout */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;

/** Lock duration after max failed attempts */
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/** bcrypt cost factor */
export const BCRYPT_ROUNDS = 10;
