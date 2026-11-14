import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import {
  validateTimestamp,
  validateAntiReplay,
  verifyLineSignature,
  validateCronRequest,
  DEFAULT_MAX_DRIFT_MS,
} from "@/lib/anti-replay/validator";
import { NonceStore } from "@/lib/anti-replay/nonce-store";

describe("Anti-Replay Attack Protection", () => {
  let store: NonceStore;

  beforeEach(() => {
    store = new NonceStore();
  });

  describe("Timestamp Drift Validation", () => {
    it("accepts a timestamp that matches the current time", () => {
      const now = Date.now();
      const res = validateTimestamp(now, DEFAULT_MAX_DRIFT_MS, now);
      expect(res.valid).toBe(true);
      expect(res.timestampMs).toBe(now);
    });

    it("accepts a timestamp within 5 minutes drift in the past", () => {
      const now = Date.now();
      const pastTime = now - 4 * 60 * 1000; // 4 minutes ago
      const res = validateTimestamp(pastTime, DEFAULT_MAX_DRIFT_MS, now);
      expect(res.valid).toBe(true);
    });

    it("accepts a timestamp within 5 minutes drift in the future", () => {
      const now = Date.now();
      const futureTime = now + 2 * 60 * 1000; // 2 minutes in future
      const res = validateTimestamp(futureTime, DEFAULT_MAX_DRIFT_MS, now);
      expect(res.valid).toBe(true);
    });

    it("rejects timestamps older than 5 minutes", () => {
      const now = Date.now();
      const staleTime = now - (5 * 60 * 1000 + 1000); // 5 min 1 sec ago
      const res = validateTimestamp(staleTime, DEFAULT_MAX_DRIFT_MS, now);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("drift too large");
    });

    it("rejects timestamps skewed too far into the future (> 5 minutes)", () => {
      const now = Date.now();
      const futureSkew = now + (6 * 60 * 1000);
      const res = validateTimestamp(futureSkew, DEFAULT_MAX_DRIFT_MS, now);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("future");
    });

    it("rejects missing, null, or empty timestamp", () => {
      expect(validateTimestamp(null).valid).toBe(false);
      expect(validateTimestamp(undefined).valid).toBe(false);
      expect(validateTimestamp("").valid).toBe(false);
    });

    it("parses ISO date strings and Unix timestamps in seconds", () => {
      const now = Date.now();
      const isoStr = new Date(now).toISOString();
      expect(validateTimestamp(isoStr, DEFAULT_MAX_DRIFT_MS, now).valid).toBe(true);

      const secTimestamp = Math.floor(now / 1000);
      expect(validateTimestamp(secTimestamp, DEFAULT_MAX_DRIFT_MS, now).valid).toBe(true);
    });
  });

  describe("Nonce Deduplication Cache", () => {
    it("allows a nonce once, then rejects duplicate delivery (replay)", () => {
      const nonce = "unique-nonce-12345";
      const now = Date.now();

      // First presentation should succeed
      expect(store.consume(nonce, 60000, now)).toBe(true);

      // Replayed presentation must fail
      expect(store.consume(nonce, 60000, now)).toBe(false);
      expect(store.has(nonce, now)).toBe(true);
    });

    it("purges expired nonces after TTL passes", () => {
      const nonce = "temporary-nonce";
      const start = 1000000;
      const ttl = 5000;

      expect(store.consume(nonce, ttl, start)).toBe(true);
      expect(store.has(nonce, start + 1000)).toBe(true);

      // After TTL expires
      expect(store.has(nonce, start + 6000)).toBe(false);
      // Can be consumed again after expiration
      expect(store.consume(nonce, ttl, start + 6000)).toBe(true);
    });

    it("rejects empty or blank nonces", () => {
      expect(store.consume("")).toBe(false);
      expect(store.consume("   ")).toBe(false);
    });
  });

  describe("Full validateAntiReplay", () => {
    it("succeeds with fresh timestamp and new nonce", () => {
      const now = Date.now();
      const result = validateAntiReplay({
        timestamp: now,
        nonce: "test-event-uuid-001",
        store,
        nowMs: now,
      });
      expect(result.valid).toBe(true);
    });

    it("rejects replay when same nonce is submitted within time window", () => {
      const now = Date.now();
      const nonce = "replay-target-uuid";

      const first = validateAntiReplay({
        timestamp: now,
        nonce,
        store,
        nowMs: now,
      });
      expect(first.valid).toBe(true);

      const replay = validateAntiReplay({
        timestamp: now + 1000, // slightly later timestamp
        nonce,
        store,
        nowMs: now + 1000,
      });
      expect(replay.valid).toBe(false);
      expect(replay.error).toContain("Replay attack detected");
    });
  });

  describe("LINE HMAC-SHA256 Signature Verification", () => {
    const channelSecret = "test_secret_key_123456789";
    const body = JSON.stringify({ events: [{ type: "message", text: "hello" }] });

    it("validates authentic LINE signature", () => {
      const validSignature = crypto
        .createHmac("sha256", channelSecret)
        .update(body)
        .digest("base64");

      const isValid = verifyLineSignature(body, validSignature, channelSecret);
      expect(isValid).toBe(true);
    });

    it("rejects tampered body or invalid signature", () => {
      const validSignature = crypto
        .createHmac("sha256", channelSecret)
        .update(body)
        .digest("base64");

      const tamperedBody = JSON.stringify({ events: [{ type: "message", text: "hacked" }] });
      expect(verifyLineSignature(tamperedBody, validSignature, channelSecret)).toBe(false);
      expect(verifyLineSignature(body, "invalid_sig", channelSecret)).toBe(false);
      expect(verifyLineSignature(body, null, channelSecret)).toBe(false);
    });
  });

  describe("Cron Trigger Authorization & Replay Defense", () => {
    const secret = "secret_cron_token_xyz";

    it("accepts valid cron request with Bearer secret, timestamp and nonce", () => {
      const now = Date.now();
      const headers = {
        authorization: `Bearer ${secret}`,
        "x-cron-timestamp": String(now),
        "x-cron-nonce": "cron-nonce-001",
      };

      const res = validateCronRequest(headers, secret, store, now);
      expect(res.valid).toBe(true);
    });

    it("rejects invalid CRON_SECRET", () => {
      const now = Date.now();
      const headers = {
        authorization: "Bearer wrong_secret",
        "x-cron-timestamp": String(now),
        "x-cron-nonce": "cron-nonce-002",
      };

      const res = validateCronRequest(headers, secret, store, now);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Unauthorized");
    });

    it("rejects cron request replaying previous nonce", () => {
      const now = Date.now();
      const nonce = "cron-nonce-duplicate";
      const headers = {
        authorization: `Bearer ${secret}`,
        "x-cron-timestamp": String(now),
        "x-cron-nonce": nonce,
      };

      const res1 = validateCronRequest(headers, secret, store, now);
      expect(res1.valid).toBe(true);

      const res2 = validateCronRequest(headers, secret, store, now);
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain("Replay attack detected");
    });
  });
});
