import { getUrgencyStatus, InventoryItem } from "../expiration/engine";

export interface ExpirationDigestResult {
  hasAlerts: boolean;
  expiredCount: number;
  expiringSoonCount: number;
  messageText: string;
}

/**
 * Builds a formatted LINE reminder message for items expiring or expired.
 * Prevents alert fatigue: returns hasAlerts: false when no urgent items exist.
 */
export function buildDailyExpirationDigest(
  householdName: string,
  items: InventoryItem[],
  referenceDate: Date = new Date()
): ExpirationDigestResult {
  const activeItems = items.filter((i) => i.status === "active");

  const expiredList: Array<{ item: InventoryItem; days: number }> = [];
  const expiringSoonList: Array<{ item: InventoryItem; days: number }> = [];

  for (const item of activeItems) {
    const urgency = getUrgencyStatus(item.expiry_date, referenceDate);
    if (urgency.status === "red") {
      expiredList.push({ item, days: urgency.daysRemaining });
    } else if (urgency.status === "yellow") {
      expiringSoonList.push({ item, days: urgency.daysRemaining });
    }
  }

  const expiredCount = expiredList.length;
  const expiringSoonCount = expiringSoonList.length;

  if (expiredCount === 0 && expiringSoonCount === 0) {
    return {
      hasAlerts: false,
      expiredCount: 0,
      expiringSoonCount: 0,
      messageText: "",
    };
  }

  const lines: string[] = [
    `📢 【${householdName}】ExpiryMate 晨間即期提醒`,
    `早安！今日有 ${expiredCount + expiringSoonCount} 項物品需要注意：`,
    "",
  ];

  if (expiredCount > 0) {
    lines.push(`🚨 【已過期 (${expiredCount} 項)】`);
    for (const { item, days } of expiredList) {
      const typeLabel = item.type === "food" ? "🍱" : "🎫";
      const extra = item.category_or_location ? ` (${item.category_or_location})` : "";
      const diffText = days === 0 ? "今天到期" : `逾期 ${Math.abs(days)} 天`;
      lines.push(`• ${typeLabel} ${item.title}${extra} - ${diffText}`);
    }
    lines.push("");
  }

  if (expiringSoonCount > 0) {
    lines.push(`⚠️ 【3天內即將到期 (${expiringSoonCount} 項)】`);
    for (const { item, days } of expiringSoonList) {
      const typeLabel = item.type === "food" ? "🍱" : "🎫";
      const extra = item.category_or_location ? ` (${item.category_or_location})` : "";
      const dayText = days === 1 ? "明天到期" : `剩餘 ${days} 天`;
      lines.push(`• ${typeLabel} ${item.title}${extra} - ${dayText}`);
    }
    lines.push("");
  }

  lines.push("💡 請記得盡早食用或兌換，避免浪費！");
  lines.push("🔗 前往 ExpiryMate 查看詳情並標記已使用。");

  return {
    hasAlerts: true,
    expiredCount,
    expiringSoonCount,
    messageText: lines.join("\n").trim(),
  };
}
