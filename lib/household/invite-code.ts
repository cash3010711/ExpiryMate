import crypto from "crypto";

// Exclude easily confused characters like 0/O, 1/I/L
const INVITE_CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Generates a cryptographically secure 6-character alphanumeric invite code.
 */
export function generateInviteCode(length: number = 6): string {
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += INVITE_CHARSET[bytes[i] % INVITE_CHARSET.length];
  }
  return code;
}

/**
 * Validates whether an invite code matches the 6-character alphanumeric format.
 */
export function validateInviteCode(code: string | null | undefined): boolean {
  if (!code || typeof code !== "string") return false;
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 6) return false;
  // Must only contain alphanumeric characters
  return /^[0-9A-Z]{6}$/.test(normalized);
}

/**
 * Normalizes user-input invite codes (trimmed, uppercase).
 */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}
