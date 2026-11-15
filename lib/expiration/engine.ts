export type UrgencyStatus = "red" | "yellow" | "green";

export interface ItemUrgency {
  daysRemaining: number;
  status: UrgencyStatus;
  label: string; // e.g. "Expired", "Expiring Soon", "Safe"
  badgeColor: string; // Tailwind color class or hex
}

export type ItemType = "food" | "coupon";
export type ItemStatus = "active" | "consumed" | "discarded";

export interface InventoryItem {
  id: string;
  household_id: string;
  created_by?: string | null;
  type: ItemType;
  title: string;
  category_or_location?: string | null; // e.g. Freezer / Refrigerator / Pantry or Store Name
  expiry_date: string; // YYYY-MM-DD
  quantity: number;
  is_opened: boolean;
  opened_date?: string | null;
  barcode_image_url?: string | null;
  notes?: string | null;
  status: ItemStatus;
  created_at?: string;
  updated_at?: string;
}

/**
 * Calculates calendar days elapsed since the item was opened.
 * Strips time of day to ensure pure calendar day comparison (UTC).
 * If openedDateStr is null/undefined/empty, returns null.
 * When openedDate matches referenceDate, returns 0.
 * If opened in the future, returns 0.
 */
export function calculateDaysOpened(
  openedDateStr: string | Date | null | undefined,
  referenceDate: Date = new Date()
): number | null {
  if (!openedDateStr) return null;

  let opUtc: number;
  if (typeof openedDateStr === "string") {
    const trimmed = openedDateStr.trim();
    if (!trimmed) return null;
    const parts = trimmed.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      opUtc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
    } else {
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) return null;
      opUtc = Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  } else if (openedDateStr instanceof Date) {
    if (isNaN(openedDateStr.getTime())) return null;
    opUtc = Date.UTC(
      openedDateStr.getFullYear(),
      openedDateStr.getMonth(),
      openedDateStr.getDate()
    );
  } else {
    return null;
  }

  const refUtc = Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((refUtc - opUtc) / msPerDay);
  return Math.max(0, diffDays);
}

/**
 * Formats opened badge text.
 * If openedDate is valid, returns: "已開封 (MM/DD, X天)"
 * If openedDate is null or invalid, returns fallback: "已開封"
 */
export function formatOpenedBadge(
  openedDateStr: string | Date | null | undefined,
  referenceDate: Date = new Date()
): string {
  if (!openedDateStr) {
    return "已開封";
  }

  const days = calculateDaysOpened(openedDateStr, referenceDate);
  if (days === null) {
    return "已開封";
  }

  let monthStr = "";
  let dayStr = "";

  if (typeof openedDateStr === "string") {
    const parts = openedDateStr.trim().split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      monthStr = String(parts[1]).padStart(2, "0");
      dayStr = String(parts[2]).padStart(2, "0");
    } else {
      const parsed = new Date(openedDateStr);
      if (isNaN(parsed.getTime())) return "已開封";
      monthStr = String(parsed.getMonth() + 1).padStart(2, "0");
      dayStr = String(parsed.getDate()).padStart(2, "0");
    }
  } else if (openedDateStr instanceof Date) {
    if (isNaN(openedDateStr.getTime())) return "已開封";
    monthStr = String(openedDateStr.getMonth() + 1).padStart(2, "0");
    dayStr = String(openedDateStr.getDate()).padStart(2, "0");
  }

  return `已開封 (${monthStr}/${dayStr}, ${days}天)`;
}

/**
 * Calculates days remaining from reference date to expiry date.
 * Strips time of day to ensure pure calendar day comparison.
 */
export function calculateDaysRemaining(
  expiryDateStr: string | Date,
  referenceDate: Date = new Date()
): number {
  let expUtc: number;
  if (typeof expiryDateStr === "string") {
    const parts = expiryDateStr.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      expUtc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
    } else {
      const parsed = new Date(expiryDateStr);
      expUtc = Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  } else {
    expUtc = Date.UTC(expiryDateStr.getFullYear(), expiryDateStr.getMonth(), expiryDateStr.getDate());
  }

  const refUtc = Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((expUtc - refUtc) / msPerDay);
}

/**
 * Determines Urgency status:
 * - Red: <= 0 days (Expired / Expires Today)
 * - Yellow: 1 to 3 days (Expiring Soon)
 * - Green: > 3 days (Safe)
 */
export function getUrgencyStatus(
  expiryDateStr: string | Date,
  referenceDate: Date = new Date()
): ItemUrgency {
  const days = calculateDaysRemaining(expiryDateStr, referenceDate);

  if (days <= 0) {
    return {
      daysRemaining: days,
      status: "red",
      label: days === 0 ? "Expires Today" : `Expired (${Math.abs(days)}d ago)`,
      badgeColor: "bg-red-500 text-white",
    };
  }

  if (days <= 3) {
    return {
      daysRemaining: days,
      status: "yellow",
      label: days === 1 ? "Expires Tomorrow" : `Expires in ${days} days`,
      badgeColor: "bg-amber-400 text-amber-950",
    };
  }

  return {
    daysRemaining: days,
    status: "green",
    label: `${days} days left`,
    badgeColor: "bg-emerald-500 text-white",
  };
}

/**
 * Sorts inventory items by urgency priority:
 * 1. Urgency status: red (highest) -> yellow -> green
 * 2. Days remaining ascending (soonest to expire first)
 * 3. Title alphabetical
 */
export function sortItemsByUrgency<T extends { expiry_date: string; title: string }>(
  items: T[],
  referenceDate: Date = new Date()
): T[] {
  const statusRank: Record<UrgencyStatus, number> = {
    red: 0,
    yellow: 1,
    green: 2,
  };

  return [...items].sort((a, b) => {
    const urgencyA = getUrgencyStatus(a.expiry_date, referenceDate);
    const urgencyB = getUrgencyStatus(b.expiry_date, referenceDate);

    const rankDiff = statusRank[urgencyA.status] - statusRank[urgencyB.status];
    if (rankDiff !== 0) return rankDiff;

    if (urgencyA.daysRemaining !== urgencyB.daysRemaining) {
      return urgencyA.daysRemaining - urgencyB.daysRemaining;
    }

    return a.title.localeCompare(b.title);
  });
}

/**
 * Filter items by tab type and lifecycle status.
 */
export function filterItems(
  items: InventoryItem[],
  type: ItemType,
  status: ItemStatus = "active"
): InventoryItem[] {
  return items.filter((item) => item.type === type && item.status === status);
}
