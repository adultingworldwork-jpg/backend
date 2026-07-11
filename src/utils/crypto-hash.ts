import { createHash, randomBytes, timingSafeEqual } from "crypto";

/** SHA-256 hex digest — used for refresh token storage (not passwords). */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateTokenId(): string {
  return randomBytes(16).toString("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
