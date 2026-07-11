"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Lightweight self-check for username helpers (no jest config required).
 * Run: npx ts-node -r tsconfig-paths/register src/utils/username.test.ts
 */
const username_1 = require("./username");
function assert(cond, msg) {
    if (!cond)
        throw new Error(msg);
}
assert((0, username_1.normalizeUsername)("  Moon Flower ") === "moon flower", "normalize");
assert((0, username_1.slugifyUsername)("Moon Flower") === "moon-flower", "slug");
assert((0, username_1.trimUsername)("  a  b  ") === "a b", "trim");
assert((0, username_1.assertValidUsername)("Wanderer") === "Wanderer", "valid");
assert((0, username_1.normalizeRecoveryPassphrase)(" Ocean ") === "ocean", "recovery");
try {
    (0, username_1.assertValidUsername)("!!");
    throw new Error("should have failed");
}
catch (e) {
    assert(e instanceof Error && !String(e.message).includes("should have failed"), "invalid rejected");
}
console.log("✅ username utils tests passed");
