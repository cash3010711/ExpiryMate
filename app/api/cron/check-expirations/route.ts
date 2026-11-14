import { NextRequest, NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/anti-replay/validator";
import { buildDailyExpirationDigest } from "@/lib/line/digest";
import { InventoryItem } from "@/lib/expiration/engine";

export async function POST(req: NextRequest) {
  return handleCron(req);
}

export async function GET(req: NextRequest) {
  return handleCron(req);
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

    // Optional query or mock data injection for verification
    const searchParams = req.nextUrl.searchParams;
    const isDryRun = searchParams.get("dryRun") === "true";

    // In local / test mode, we might process provided or stored items
    // Real implementation queries database:
    // const { data: expiringItems } = await getSupabaseAdminClient().from("items")...
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

    const digest = buildDailyExpirationDigest("溫馨一家", sampleItems);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dryRun: isDryRun,
      digestResult: {
        hasAlerts: digest.hasAlerts,
        expiredCount: digest.expiredCount,
        expiringSoonCount: digest.expiringSoonCount,
        messagePreview: digest.messageText,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Cron Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
