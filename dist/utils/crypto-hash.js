"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.generateTokenId = generateTokenId;
exports.safeEqualHex = safeEqualHex;
const crypto_1 = require("crypto");
/** SHA-256 hex digest — used for refresh token storage (not passwords). */
function sha256(value) {
    return (0, crypto_1.createHash)("sha256").update(value).digest("hex");
}
function generateTokenId() {
    return (0, crypto_1.randomBytes)(16).toString("hex");
}
function safeEqualHex(a, b) {
    try {
        const ba = Buffer.from(a, "hex");
        const bb = Buffer.from(b, "hex");
        if (ba.length !== bb.length)
            return false;
        return (0, crypto_1.timingSafeEqual)(ba, bb);
    }
    catch {
        return false;
    }
}
