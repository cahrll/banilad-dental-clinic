import "server-only";
import { randomBytes, createHash } from "node:crypto";

// 32 bytes = 256 bits of entropy. Hex-encoded => 64 chars in the cookie.
const TOKEN_BYTES = 32;

export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
