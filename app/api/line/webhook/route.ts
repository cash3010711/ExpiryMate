import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature } from "@/lib/anti-replay/validator";
import { globalNonceStore } from "@/lib/anti-replay/nonce-store";
import { parseBindingCode } from "@/lib/household/binding-code";

interface LineWebhookEvent {
  type: string;
  mode?: string;
  timestamp: number;
  source: {
    type: "user" | "group" | "room";
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  webhookEventId?: string;
  deliveryContext?: {
    isRedelivery: boolean;
  };
  replyToken?: string;
  message?: {
    id: string;
    type: string;
    text?: string;
  };
}

interface LineWebhookPayload {
  destination?: string;
  events: LineWebhookEvent[];
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature");
    const channelSecret = process.env.LINE_CHANNEL_SECRET || (process.env.NODE_ENV === "production" ? "" : "default_test_channel_secret");
    if (!channelSecret) {
      return NextResponse.json(
        { error: "Configuration error: LINE_CHANNEL_SECRET is required" },
        { status: 500 }
      );
    }

    // 1. Signature Verification
    if (!verifyLineSignature(rawBody, signature, channelSecret)) {
      return NextResponse.json(
        { error: "Invalid signature: HMAC-SHA256 verification failed" },
        { status: 401 }
      );
    }

    let payload: LineWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    const events = payload.events || [];
    const results = [];

    for (const event of events) {
      // 2. Anti-Replay Attack Protection
      // Check timestamp drift (5 minute window)
      const eventTime = event.timestamp;
      const now = Date.now();
      const maxDrift = 5 * 60 * 1000;
      if (Math.abs(now - eventTime) > maxDrift) {
        results.push({
          eventId: event.webhookEventId,
          status: "rejected",
          reason: "Timestamp drift exceeded",
        });
        continue;
      }

      // Check unique event ID / nonce
      const deduplicationId = event.webhookEventId || event.replyToken || (event.message && event.message.id);
      if (deduplicationId) {
        const accepted = globalNonceStore.consume(`line-event-${deduplicationId}`);
        if (!accepted) {
          results.push({
            eventId: deduplicationId,
            status: "rejected",
            reason: "Duplicate / replayed event detected",
          });
          continue;
        }
      }

      // 3. Process Event (Household Binding)
      if (event.type === "message" && event.message?.type === "text" && event.message.text) {
        const text = event.message.text;
        const bindingCode = parseBindingCode(text);

        if (bindingCode) {
          const targetGroupId = event.source.groupId || event.source.roomId || event.source.userId;
          // In actual deployment, this updates Supabase line_bindings.
          results.push({
            eventId: deduplicationId,
            status: "success",
            action: "household_bound",
            bindingCode,
            targetGroupId,
            replyMessage: `【ExpiryMate】綁定成功！此群組已成功連結，系統每日 08:30 將自動發送即期物品提醒。`,
          });
          continue;
        }
      }

      results.push({
        eventId: deduplicationId,
        status: "processed",
      });
    }

    return NextResponse.json({
      success: true,
      processedEvents: results.length,
      details: results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
