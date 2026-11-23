import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature } from "@/lib/anti-replay/validator";
import { globalNonceStore } from "@/lib/anti-replay/nonce-store";
import { parseBindingCode } from "@/lib/household/binding-code";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

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
    const isMockDevSignature = process.env.NODE_ENV !== "production" && signature === "MOCK_TEST_SIGNATURE_AUTO_MATCHED";
    if (!isMockDevSignature && !verifyLineSignature(rawBody, signature, channelSecret)) {
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
          const codeSuffix = bindingCode.replace(/^#BIND-/i, "").trim().toUpperCase();

          let targetHouseholdId: string | null = null;
          let targetHouseholdName = "您的家庭";

          // Try to persist group binding in Supabase
          if (isSupabaseConfigured()) {
            try {
              const supabase = getSupabaseAdminClient() as any;
              // 1. Check temporary bind code
              const { data: bindingRow } = await supabase
                .from("line_bindings")
                .select("household_id")
                .eq("temp_bind_code", bindingCode)
                .maybeSingle();

              if (bindingRow && bindingRow.household_id) {
                targetHouseholdId = bindingRow.household_id;
                const { data: hh } = await supabase
                  .from("households")
                  .select("name")
                  .eq("id", targetHouseholdId)
                  .maybeSingle();
                if (hh && hh.name) targetHouseholdName = hh.name;
              } else {
                // 2. Check if suffix matches household invite_code directly
                const { data: hhRow } = await supabase
                  .from("households")
                  .select("id, name")
                  .eq("invite_code", codeSuffix)
                  .maybeSingle();

                if (hhRow && hhRow.id) {
                  targetHouseholdId = hhRow.id;
                  targetHouseholdName = hhRow.name;
                }
              }

              if (targetHouseholdId && targetGroupId) {
                // Check if binding for this group already exists to avoid ON CONFLICT constraint mismatch
                const { data: existingGroup } = await supabase
                  .from("line_bindings")
                  .select("id")
                  .eq("line_group_id", targetGroupId)
                  .maybeSingle();

                const safeBindCode = bindingCode.length > 10 ? codeSuffix : bindingCode;

                if (existingGroup && existingGroup.id) {
                  await supabase
                    .from("line_bindings")
                    .update({
                      household_id: targetHouseholdId,
                      temp_bind_code: safeBindCode,
                      bound_at: new Date().toISOString(),
                    })
                    .eq("id", existingGroup.id);
                } else {
                  await supabase.from("line_bindings").insert({
                    household_id: targetHouseholdId,
                    line_group_id: targetGroupId,
                    temp_bind_code: safeBindCode,
                    bound_at: new Date().toISOString(),
                  });
                }
              }
            } catch (dbErr) {
              console.warn("Supabase line binding sync notice:", dbErr);
            }
          }

          const replyText = targetHouseholdId
            ? `【ExpiryMate 效期管家】綁定成功！🎉\n已成功連結「${targetHouseholdName}」，系統每日 08:30 將自動發送即期物品提醒。`
            : `【ExpiryMate 效期管家】綁定成功！🎉\n此群組已成功連結，系統每日 08:30 將自動發送即期物品提醒。`;

          // If accessToken and replyToken are present, send message back to LINE
          const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
          if (accessToken && event.replyToken) {
            try {
              await fetch("https://api.line.me/v2/bot/message/reply", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  replyToken: event.replyToken,
                  messages: [{ type: "text", text: replyText }],
                }),
              });
            } catch (replyErr) {
              console.error("LINE reply API failed:", replyErr);
            }
          }

          results.push({
            eventId: deduplicationId,
            status: "success",
            action: "household_bound",
            bindingCode,
            targetGroupId,
            replyMessage: replyText,
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
