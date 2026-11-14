import crypto from "crypto";
import { NonceStore, globalNonceStore } from "./nonce-store";

export const DEFAULT_MAX_DRIFT_MS = 5 * 60 * 1000; // 5 minutes

export interface TimestampValidationResult {
  valid: boolean;
  timestampMs?: number;
  error?: string;
}

export interface ReplayValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates timestamp drift against current server time within maxDriftMs window.
 * Rejects timestamps older than maxDriftMs (past) or in the future by more than maxDriftMs.
 */
export function validateTimestamp(
  rawTimestamp: string | number | Date | null | undefined,
  maxDriftMs: number = DEFAULT_MAX_DRIFT_MS,
  nowMs: number = Date.now()
): TimestampValidationResult {
  if (rawTimestamp === null || rawTimestamp === undefined || rawTimestamp === "") {
    return { valid: false, error: "Missing timestamp header or parameter" };
  }

  let tsMs: number;
  if (typeof rawTimestamp === "number") {
    // If Unix timestamp in seconds (less than year 2100 in sec: ~4.1e9)
    tsMs = rawTimestamp < 1e11 ? rawTimestamp * 1000 : rawTimestamp;
  } else if (rawTimestamp instanceof Date) {
    tsMs = rawTimestamp.getTime();
  } else if (typeof rawTimestamp === "string") {
    const num = Number(rawTimestamp);
    if (!isNaN(num) && rawTimestamp.trim() !== "") {
      tsMs = num < 1e11 ? num * 1000 : num;
    } else {
      const parsed = Date.parse(rawTimestamp);
      if (isNaN(parsed)) {
        return { valid: false, error: "Invalid timestamp format" };
      }
      tsMs = parsed;
    }
  } else {
    return { valid: false, error: "Invalid timestamp type" };
  }

  if (isNaN(tsMs)) {
    return { valid: false, error: "Invalid parsed timestamp" };
  }

  const diff = Math.abs(nowMs - tsMs);
  if (diff > maxDriftMs) {
    const isPast = nowMs > tsMs;
    return {
      valid: false,
      timestampMs: tsMs,
      error: `Timestamp drift too large (${diff}ms vs max allowed ${maxDriftMs}ms: request is too far in the ${isPast ? "past" : "future"})`,
    };
  }

  return { valid: true, timestampMs: tsMs };
}

/**
 * Validates anti-replay combination: timestamp freshness + unique nonce.
 */
export function validateAntiReplay(params: {
  timestamp?: string | number | Date | null;
  nonce?: string | null;
  maxDriftMs?: number;
  store?: NonceStore;
  nowMs?: number;
}): ReplayValidationResult {
  const {
    timestamp,
    nonce,
    maxDriftMs = DEFAULT_MAX_DRIFT_MS,
    store = globalNonceStore,
    nowMs = Date.now(),
  } = params;

  // 1. Timestamp validation
  const tsResult = validateTimestamp(timestamp, maxDriftMs, nowMs);
  if (!tsResult.valid) {
    return { valid: false, error: tsResult.error };
  }

  // 2. Nonce presence & deduplication
  if (!nonce || typeof nonce !== "string" || nonce.trim().length === 0) {
    return { valid: false, error: "Missing or invalid nonce" };
  }

  const consumed = store.consume(nonce.trim(), maxDriftMs * 2, nowMs);
  if (!consumed) {
    return { valid: false, error: "Replay attack detected: nonce has already been used" };
  }

  return { valid: true };
}

/**
 * Verifies LINE Messaging API HMAC-SHA256 signature using timingSafeEqual.
 */
export function verifyLineSignature(
  body: string | Buffer,
  signature: string | null | undefined,
  channelSecret: string | null | undefined
): boolean {
  if (!signature || !channelSecret) {
    return false;
  }

  try {
    const stringBody = typeof body === "string" ? body : body.toString("utf8");
    const hash = crypto
      .createHmac("sha256", channelSecret)
      .update(stringBody)
      .digest("base64");

    const expectedBuffer = Buffer.from(hash, "utf8");
    const actualBuffer = Buffer.from(signature, "utf8");

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

/**
 * Validates Cron trigger requests:
 * 1. Authorization Bearer CRON_SECRET or x-cron-secret header.
 * 2. Timestamp drift validation (x-cron-timestamp).
 * 3. Nonce deduplication (x-cron-nonce).
 */
export function validateCronRequest(
  headers: Headers | Record<string, string | string[] | undefined>,
  expectedSecret?: string,
  store: NonceStore = globalNonceStore,
  nowMs: number = Date.now()
): ReplayValidationResult {
  const getHeader = (name: string): string | undefined => {
    if (typeof (headers as Headers).get === "function") {
      return (headers as Headers).get(name) || undefined;
    }
    const val = (headers as Record<string, string | string[] | undefined>)[name.toLowerCase()] ??
                (headers as Record<string, string | string[] | undefined>)[name];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const configuredSecret = expectedSecret || process.env.CRON_SECRET || (process.env.NODE_ENV === "production" ? "" : "default_test_cron_secret");
  if (!configuredSecret) {
    return { valid: false, error: "Unauthorized: CRON_SECRET is not configured on server" };
  }

  // Check auth header
  const authHeader = getHeader("authorization");
  const cronSecretHeader = getHeader("x-cron-secret");

  let providedSecret = "";
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    providedSecret = authHeader.substring(7).trim();
  } else if (cronSecretHeader) {
    providedSecret = cronSecretHeader.trim();
  }

  if (!providedSecret) {
    return { valid: false, error: "Unauthorized: Invalid or missing CRON_SECRET" };
  }

  const providedBuf = Buffer.from(providedSecret, "utf8");
  const expectedBuf = Buffer.from(configuredSecret, "utf8");
  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return { valid: false, error: "Unauthorized: Invalid or missing CRON_SECRET" };
  }

  // Check timestamp & nonce
  const rawTimestamp = getHeader("x-cron-timestamp") || getHeader("x-timestamp");
  const nonce = getHeader("x-cron-nonce") || getHeader("x-nonce");

  return validateAntiReplay({
    timestamp: rawTimestamp,
    nonce,
    maxDriftMs: DEFAULT_MAX_DRIFT_MS,
    store,
    nowMs,
  });
}
