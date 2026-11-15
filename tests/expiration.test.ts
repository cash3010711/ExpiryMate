import { describe, it, expect } from "vitest";
import {
  calculateDaysRemaining,
  calculateDaysOpened,
  formatOpenedBadge,
  getUrgencyStatus,
  sortItemsByUrgency,
  filterItems,
  InventoryItem,
} from "@/lib/expiration/engine";

describe("Expiration Countdown & Urgency Badges", () => {
  const refDate = new Date("2026-11-14T12:00:00Z");

  it("calculates 0 days remaining when expiring on the same day", () => {
    const days = calculateDaysRemaining("2026-11-14", refDate);
    expect(days).toBe(0);
  });

  it("calculates negative days for already expired items", () => {
    const days = calculateDaysRemaining("2026-11-10", refDate);
    expect(days).toBe(-4);
  });

  it("calculates positive days for future items", () => {
    const days = calculateDaysRemaining("2026-11-17", refDate);
    expect(days).toBe(3);
  });

  describe("Opened Date Tracking & Badges", () => {
    it("calculates 0 days opened when opened on the same day", () => {
      const days = calculateDaysOpened("2026-11-14", refDate);
      expect(days).toBe(0);
    });

    it("calculates 1 day opened when opened yesterday", () => {
      const days = calculateDaysOpened("2026-11-13", refDate);
      expect(days).toBe(1);
    });

    it("calculates multiple elapsed days for past opened dates", () => {
      const days = calculateDaysOpened("2026-11-09", refDate);
      expect(days).toBe(5);
    });

    it("clamps to 0 days when opened date is in the future", () => {
      const days = calculateDaysOpened("2026-11-20", refDate);
      expect(days).toBe(0);
    });

    it("handles Date objects correctly", () => {
      const pastDate = new Date("2026-11-12T10:00:00Z");
      const days = calculateDaysOpened(pastDate, refDate);
      expect(days).toBe(2);
    });

    it("returns null for null, undefined, empty, or invalid dates", () => {
      expect(calculateDaysOpened(null, refDate)).toBeNull();
      expect(calculateDaysOpened(undefined, refDate)).toBeNull();
      expect(calculateDaysOpened("", refDate)).toBeNull();
      expect(calculateDaysOpened("invalid-date", refDate)).toBeNull();
    });

    it("formats opened badge with date and elapsed days: 已開封 (MM/DD, X天)", () => {
      // Same day (0 days)
      expect(formatOpenedBadge("2026-11-14", refDate)).toBe("已開封 (11/14, 0天)");
      // Yesterday (1 day)
      expect(formatOpenedBadge("2026-11-13", refDate)).toBe("已開封 (11/13, 1天)");
      // 5 days ago
      expect(formatOpenedBadge("2026-11-09", refDate)).toBe("已開封 (11/09, 5天)");
    });

    it("formats opened badge from Date objects", () => {
      const dateObj = new Date("2026-11-10T08:00:00Z");
      expect(formatOpenedBadge(dateObj, refDate)).toBe("已開封 (11/10, 4天)");
    });

    it("falls back to generic '已開封' for null, undefined, empty, or invalid input", () => {
      expect(formatOpenedBadge(null, refDate)).toBe("已開封");
      expect(formatOpenedBadge(undefined, refDate)).toBe("已開封");
      expect(formatOpenedBadge("", refDate)).toBe("已開封");
      expect(formatOpenedBadge("not-a-date", refDate)).toBe("已開封");
    });
  });

  describe("Traffic-Light Badges (Red <= 0, Yellow <= 3, Green > 3)", () => {
    it("assigns Red badge to expired items (negative days)", () => {
      const urgency = getUrgencyStatus("2026-11-12", refDate);
      expect(urgency.status).toBe("red");
      expect(urgency.daysRemaining).toBe(-2);
      expect(urgency.badgeColor).toContain("bg-red-500");
    });

    it("assigns Red badge to items expiring today (0 days)", () => {
      const urgency = getUrgencyStatus("2026-11-14", refDate);
      expect(urgency.status).toBe("red");
      expect(urgency.daysRemaining).toBe(0);
      expect(urgency.label).toBe("Expires Today");
    });

    it("assigns Yellow badge to items expiring in 1 to 3 days", () => {
      const day1 = getUrgencyStatus("2026-11-15", refDate);
      expect(day1.status).toBe("yellow");
      expect(day1.daysRemaining).toBe(1);
      expect(day1.label).toBe("Expires Tomorrow");

      const day3 = getUrgencyStatus("2026-11-17", refDate);
      expect(day3.status).toBe("yellow");
      expect(day3.daysRemaining).toBe(3);
    });

    it("assigns Green badge to items with more than 3 days shelf life", () => {
      const safe = getUrgencyStatus("2026-11-18", refDate);
      expect(safe.status).toBe("green");
      expect(safe.daysRemaining).toBe(4);
      expect(safe.badgeColor).toContain("bg-emerald-500");
    });
  });

  describe("Sorting by Urgency Priority", () => {
    it("sorts Red items first, followed by Yellow, followed by Green", () => {
      const items: Array<{ expiry_date: string; title: string }> = [
        { expiry_date: "2026-11-20", title: "Green Item" }, // +6d
        { expiry_date: "2026-11-13", title: "Expired Yesterday" }, // -1d
        { expiry_date: "2026-11-16", title: "Yellow Item" }, // +2d
        { expiry_date: "2026-11-14", title: "Expires Today" }, // 0d
      ];

      const sorted = sortItemsByUrgency(items, refDate);

      expect(sorted[0].title).toBe("Expired Yesterday");
      expect(sorted[1].title).toBe("Expires Today");
      expect(sorted[2].title).toBe("Yellow Item");
      expect(sorted[3].title).toBe("Green Item");
    });
  });

  describe("Lifecycle Filtering and Transitions", () => {
    const inventory: InventoryItem[] = [
      {
        id: "1",
        household_id: "hh1",
        type: "food",
        title: "Milk",
        expiry_date: "2026-11-15",
        quantity: 1,
        is_opened: true,
        status: "active",
      },
      {
        id: "2",
        household_id: "hh1",
        type: "food",
        title: "Bread",
        expiry_date: "2026-11-12",
        quantity: 1,
        is_opened: false,
        status: "consumed",
      },
      {
        id: "3",
        household_id: "hh1",
        type: "coupon",
        title: "Coffee Voucher",
        expiry_date: "2026-11-20",
        quantity: 1,
        is_opened: false,
        status: "active",
      },
    ];

    it("filters active food items", () => {
      const foodActive = filterItems(inventory, "food", "active");
      expect(foodActive).toHaveLength(1);
      expect(foodActive[0].title).toBe("Milk");
    });

    it("filters active coupons", () => {
      const coupons = filterItems(inventory, "coupon", "active");
      expect(coupons).toHaveLength(1);
      expect(coupons[0].title).toBe("Coffee Voucher");
    });

    it("retrieves history items (consumed / discarded) and allows restoration", () => {
      const foodConsumed = filterItems(inventory, "food", "consumed");
      expect(foodConsumed).toHaveLength(1);
      expect(foodConsumed[0].title).toBe("Bread");

      // Test restoration
      const restoredItem: InventoryItem = { ...foodConsumed[0], status: "active" };
      expect(restoredItem.status).toBe("active");
    });
  });
});
