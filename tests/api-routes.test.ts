import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";
import { POST as lineWebhookHandler } from "@/app/api/line/webhook/route";
import { POST as cronHandler } from "@/app/api/cron/check-expirations/route";
import { globalNonceStore } from "@/lib/anti-replay/nonce-store";

describe("API Route Security & Handlers", () => {
  beforeEach(() => {
    globalNonceStore.clear();
  });

  describe("LINE Webhook Route (/api/line/webhook)", () => {
    const channelSecret = process.env.LINE_CHANNEL_SECRET || "default_test_channel_secret";

    it("rejects requests with missing or invalid signature (401)", async () => {
      const req = new NextRequest("http://localhost:3000/api/line/webhook", {
        method: "POST",
        headers: {
          "x-line-signature": "bogus_signature",
        },
        body: JSON.stringify({ events: [] }),
      });

      const res = await lineWebhookHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("verification failed");
    });

    it("accepts authentic signature and processes #BIND-XXXX command", async () => {
      const now = Date.now();
      const payload = {
        events: [
          {
            type: "message",
            timestamp: now,
            webhookEventId: `evt-${now}-001`,
            source: {
              type: "group",
              groupId: "line-family-group-999",
            },
            message: {
              id: "msg-001",
              type: "text",
              text: "請綁定 #BIND-8899",
            },
          },
        ],
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac("sha256", channelSecret)
        .update(rawBody)
        .digest("base64");

      const req = new NextRequest("http://localhost:3000/api/line/webhook", {
        method: "POST",
        headers: {
          "x-line-signature": signature,
          "content-type": "application/json",
        },
        body: rawBody,
      });

      const res = await lineWebhookHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.details[0].status).toBe("success");
      expect(json.details[0].bindingCode).toBe("#BIND-8899");
      expect(json.details[0].targetGroupId).toBe("line-family-group-999");
    });

    it("rejects replayed webhook event ID", async () => {
      const now = Date.now();
      const eventId = `replay-evt-${now}`;
      const payload = {
        events: [
          {
            type: "message",
            timestamp: now,
            webhookEventId: eventId,
            source: { type: "user", userId: "u1" },
            message: { id: "m1", type: "text", text: "hello" },
          },
        ],
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac("sha256", channelSecret)
        .update(rawBody)
        .digest("base64");

      // First call
      const req1 = new NextRequest("http://localhost:3000/api/line/webhook", {
        method: "POST",
        headers: { "x-line-signature": signature },
        body: rawBody,
      });
      const res1 = await lineWebhookHandler(req1);
      const json1 = await res1.json();
      expect(json1.details[0].status).toBe("processed");

      // Replayed call
      const req2 = new NextRequest("http://localhost:3000/api/line/webhook", {
        method: "POST",
        headers: { "x-line-signature": signature },
        body: rawBody,
      });
      const res2 = await lineWebhookHandler(req2);
      const json2 = await res2.json();
      expect(json2.details[0].status).toBe("rejected");
      expect(json2.details[0].reason).toContain("Duplicate / replayed");
    });
  });

  describe("Scheduled Expiration Cron Route (/api/cron/check-expirations)", () => {
    const cronSecret = process.env.CRON_SECRET || "default_test_cron_secret";

    it("rejects unauthorized trigger without CRON_SECRET (401)", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/check-expirations", {
        method: "POST",
        headers: {
          "x-cron-timestamp": String(Date.now()),
          "x-cron-nonce": "nonce-cron-1",
        },
      });

      const res = await cronHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("CRON_SECRET");
    });

    it("executes successfully when authorized with valid timestamp and nonce", async () => {
      const now = Date.now();
      const req = new NextRequest("http://localhost:3000/api/cron/check-expirations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${cronSecret}`,
          "x-cron-timestamp": String(now),
          "x-cron-nonce": `cron-valid-${now}`,
        },
      });

      const res = await cronHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.digestResult).toBeDefined();
    });

    it("rejects replayed cron trigger with duplicate nonce", async () => {
      const now = Date.now();
      const duplicateNonce = `cron-replay-${now}`;

      const req1 = new NextRequest("http://localhost:3000/api/cron/check-expirations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${cronSecret}`,
          "x-cron-timestamp": String(now),
          "x-cron-nonce": duplicateNonce,
        },
      });
      const res1 = await cronHandler(req1);
      expect(res1.status).toBe(200);

      const req2 = new NextRequest("http://localhost:3000/api/cron/check-expirations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${cronSecret}`,
          "x-cron-timestamp": String(now),
          "x-cron-nonce": duplicateNonce,
        },
      });
      const res2 = await cronHandler(req2);
      expect(res2.status).toBe(401);
      const json2 = await res2.json();
      expect(json2.error).toContain("Replay attack detected");
    });
  });
});
