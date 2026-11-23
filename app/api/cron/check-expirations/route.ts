import { NextRequest, NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/anti-replay/validator";
import { buildDailyExpirationDigest } from "@/lib/line/digest";
import { InventoryItem } from "@/lib/expiration/engine";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { pushLineMessage } from "@/lib/line/push";

export async function POST(req: NextRequest) {
  return handleCron(req);
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

interface HouseholdDigestOutput {
  householdId: string;
  householdName: string;
  lineGroupId?: string;
  status: "sent" | "suppressed_no_alerts" | "dry_run" | "error";
  expiredCount: number;
  expiringSoonCount: number;
  error?: string;
  messagePreview?: string;
}

async function handleCron(req: NextRequest) {
  try {
    // 1. Anti-Replay and CRON_SECRET validation
    const authResult = validateCronRequest(req.headers);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized Cron execution" },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const isDryRun = searchParams.get("dryRun") === "true";

    const supabase = getSupabaseAdminClient();
    const results: HouseholdDigestOutput[] = [];

    // 2. Query bound LINE groups from Supabase if configured
    let bindings: Array<{ id: string; household_id: string; line_group_id: string | null }> = [];
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient() as any;
        const { data, error } = await supabase
          .from("line_bindings")
          .select("id, household_id, line_group_id")
          .not("line_group_id", "is", null);

        if (!error && data) {
          bindings = data;
        }
      } catch (dbErr) {
        console.warn("Notice: could not query line_bindings:", dbErr);
      }
    }

    // 3. Process each bound household
    for (const binding of bindings) {
      if (!binding.household_id || !binding.line_group_id) continue;

      try {
        // Fetch household name
        const { data: hh } = (await (supabase as any)
          .from("households")
          .select("name")
          .eq("id", binding.household_id)
          .maybeSingle()) as any;

        const householdName = hh?.name || "家庭";

        // Fetch active items
        const { data: itemsData, error: itemsErr } = await supabase
          .from("items")
          .select("*")
          .eq("household_id", binding.household_id)
          .eq("status", "active");

        if (itemsErr) {
          results.push({
            householdId: binding.household_id,
            householdName,
            lineGroupId: binding.line_group_id,
            status: "error",
            expiredCount: 0,
            expiringSoonCount: 0,
            error: itemsErr.message,
          });
          continue;
        }

        const activeItems: InventoryItem[] = (itemsData || []).map((row: any) => ({
          id: row.id,
          household_id: row.household_id,
          type: row.type,
          title: row.title,
          category_or_location: row.category_or_location || "",
          expiry_date: row.expiry_date,
          quantity: row.quantity,
          is_opened: row.is_opened,
          opened_date: row.opened_date || null,
          status: row.status,
        }));

        const digest = buildDailyExpirationDigest(householdName, activeItems);

        // Anti-Fatigue check: only send if there are expiring or expired items
        if (!digest.hasAlerts) {
          results.push({
            householdId: binding.household_id,
            householdName,
            lineGroupId: binding.line_group_id,
            status: "suppressed_no_alerts",
            expiredCount: digest.expiredCount,
            expiringSoonCount: digest.expiringSoonCount,
          });
          continue;
        }

        if (isDryRun) {
          results.push({
            householdId: binding.household_id,
            householdName,
            lineGroupId: binding.line_group_id,
            status: "dry_run",
            expiredCount: digest.expiredCount,
            expiringSoonCount: digest.expiringSoonCount,
            messagePreview: digest.messageText,
          });
          continue;
        }

        // Send push notification to LINE group
        const pushResult = await pushLineMessage(binding.line_group_id, digest.messageText);

        results.push({
          householdId: binding.household_id,
          householdName,
          lineGroupId: binding.line_group_id,
          status: pushResult.success ? "sent" : "error",
          expiredCount: digest.expiredCount,
          expiringSoonCount: digest.expiringSoonCount,
          error: pushResult.error,
          messagePreview: digest.messageText,
        });
      } catch (procErr: any) {
        results.push({
          householdId: binding.household_id,
          householdName: "家庭",
          lineGroupId: binding.line_group_id,
          status: "error",
          expiredCount: 0,
          expiringSoonCount: 0,
          error: procErr?.message || "Unknown error",
        });
      }
    }

    // 4. Sample fallback if no bindings exist (e.g. testing or newly deployed app)
    const sampleItems: InventoryItem[] = [
      {
        id: "item-1",
        household_id: "hh-1",
        type: "food",
        title: "鮮牛奶",
        category_or_location: "冷藏室",
        expiry_date: new Date().toISOString().split("T")[0],
        quantity: 1,
        is_opened: true,
        status: "active",
      },
      {
        id: "item-2",
        household_id: "hh-1",
        type: "coupon",
        title: "全家咖啡優惠券",
        category_or_location: "全家便利商店",
        expiry_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        quantity: 2,
        is_opened: false,
        status: "active",
      },
    ];

    const sampleDigest = buildDailyExpirationDigest("溫馨一家", sampleItems);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dryRun: isDryRun,
      bindingsFound: bindings.length,
      processed: results.length,
      results,
      digestResult: {
        hasAlerts: sampleDigest.hasAlerts,
        expiredCount: sampleDigest.expiredCount,
        expiringSoonCount: sampleDigest.expiringSoonCount,
        messagePreview: sampleDigest.messageText,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Cron Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
