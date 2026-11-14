import crypto from "crypto";

const BIND_CHARSET = "0123456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Generates a temporary binding code formatted as `#BIND-XXXX`.
 */
export function generateBindingCode(suffixLength: number = 4): string {
  const bytes = crypto.randomBytes(suffixLength);
  let suffix = "";
  for (let i = 0; i < suffixLength; i++) {
    suffix += BIND_CHARSET[bytes[i] % BIND_CHARSET.length];
  }
  return `#BIND-${suffix}`;
}

/**
 * Extracts and normalizes binding code from a message text.
 * E.g., user texts "Hello #BIND-8899" -> returns "#BIND-8899".
 */
export function parseBindingCode(message: string | null | undefined): string | null {
  if (!message || typeof message !== "string") return null;
  const match = message.toUpperCase().match(/#BIND-[0-9A-Z]{4,8}/);
  return match ? match[0] : null;
}

/**
 * Validates a binding code string.
 */
export function isValidBindingCode(code: string | null | undefined): boolean {
  if (!code || typeof code !== "string") return false;
  return /^#BIND-[0-9A-Z]{4,8}$/i.test(code.trim());
}
