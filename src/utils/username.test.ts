/**
 * Lightweight self-check for username helpers (no jest config required).
 * Run: npx ts-node -r tsconfig-paths/register src/utils/username.test.ts
 */
import {
  normalizeUsername,
  slugifyUsername,
  assertValidUsername,
  normalizeRecoveryPassphrase,
  trimUsername,
} from "./username";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(normalizeUsername("  Moon Flower ") === "moon flower", "normalize");
assert(slugifyUsername("Moon Flower") === "moon-flower", "slug");
assert(trimUsername("  a  b  ") === "a b", "trim");
assert(assertValidUsername("Wanderer") === "Wanderer", "valid");
assert(normalizeRecoveryPassphrase(" Ocean ") === "ocean", "recovery");

try {
  assertValidUsername("!!");
  throw new Error("should have failed");
} catch (e) {
  assert(e instanceof Error && !String(e.message).includes("should have failed"), "invalid rejected");
}

console.log("✅ username utils tests passed");
