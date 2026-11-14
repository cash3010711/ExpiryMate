import { describe, it, expect } from "vitest";
import { buildDailyExpirationDigest } from "@/lib/line/digest";
import { InventoryItem } from "@/lib/expiration/engine";

describe("LINE Daily Morning Expiration Digest", () => {
  const refDate = new Date("2026-11-14T12:00:00Z");

  it("assembles alert message when items are expired or expiring within 3 days", () => {
    const items: InventoryItem[] = [
      {
        id: "1",
        household_id: "hh-1",
        type: "food",
        title: "鮮乳",
        category_or_location: "冷藏室",
        expiry_date: "2026-11-14", // Today (Red)
        quantity: 1,
        is_opened: true,
        status: "active",
      },
      {
        id: "2",
        household_id: "hh-1",
        type: "coupon",
        title: "星巴克好友分享券",
        category_or_location: "星巴克",
        expiry_date: "2026-11-16", // 2 days (Yellow)
        quantity: 1,
        is_opened: false,
        status: "active",
      },
      {
        id: "3",
        household_id: "hh-1",
        type: "food",
        title: "冷凍牛肉",
        category_or_location: "冷凍庫",
        expiry_date: "2026-12-01", // Green (>3 days)
        quantity: 1,
        is_opened: false,
        status: "active",
      },
    ];

    const digest = buildDailyExpirationDigest("溫馨一家", items, refDate);

    expect(digest.hasAlerts).toBe(true);
    expect(digest.expiredCount).toBe(1);
    expect(digest.expiringSoonCount).toBe(1);
    expect(digest.messageText).toContain("【溫馨一家】ExpiryMate 晨間即期提醒");
    expect(digest.messageText).toContain("🚨 【已過期 (1 項)】");
    expect(digest.messageText).toContain("鮮乳 (冷藏室) - 今天到期");
    expect(digest.messageText).toContain("⚠️ 【3天內即將到期 (1 項)】");
    expect(digest.messageText).toContain("星巴克好友分享券 (星巴克) - 剩餘 2 天");
    // Safe items should not be included in the alert list
    expect(digest.messageText).not.toContain("冷凍牛肉");
  });

  it("skips alert broadcast (hasAlerts: false) when no items are expiring to prevent notification fatigue", () => {
    const items: InventoryItem[] = [
      {
        id: "safe-1",
        household_id: "hh-1",
        type: "food",
        title: "白米",
        category_or_location: "常溫",
        expiry_date: "2026-12-31", // Far in future (Green)
        quantity: 1,
        is_opened: false,
        status: "active",
      },
    ];

    const digest = buildDailyExpirationDigest("安靜家庭", items, refDate);

    expect(digest.hasAlerts).toBe(false);
    expect(digest.expiredCount).toBe(0);
    expect(digest.expiringSoonCount).toBe(0);
    expect(digest.messageText).toBe("");
  });

  it("ignores items that are already marked as consumed or discarded", () => {
    const items: InventoryItem[] = [
      {
        id: "consumed-1",
        household_id: "hh-1",
        type: "food",
        title: "已吃完的麵包",
        expiry_date: "2026-11-13",
        quantity: 1,
        is_opened: false,
        status: "consumed",
      },
    ];

    const digest = buildDailyExpirationDigest("家庭", items, refDate);
    expect(digest.hasAlerts).toBe(false);
  });
});
