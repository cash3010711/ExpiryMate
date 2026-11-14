import { describe, it, expect } from "vitest";
import { extractExpirationDate } from "@/lib/ocr/date-parser";

describe("Client-side OCR Date Parsing Engine", () => {
  it("extracts standard YYYY/MM/DD dates", () => {
    const res = extractExpirationDate("有效期限: 2025/11/20 保存期限");
    expect(res.success).toBe(true);
    expect(res.formattedDate).toBe("2025-11-20");
  });

  it("extracts standard YYYY.MM.DD dates", () => {
    const res = extractExpirationDate("EXP: 2026.04.15");
    expect(res.success).toBe(true);
    expect(res.formattedDate).toBe("2026-04-15");
  });

  it("extracts standard YYYY-MM-DD dates", () => {
    const res = extractExpirationDate("BEST BEFORE 2025-09-30 LOT123");
    expect(res.success).toBe(true);
    expect(res.formattedDate).toBe("2025-09-30");
  });

  it("converts Taiwan ROC (Minguo) calendar dates to Gregorian YYYY-MM-DD", () => {
    // 113年 = 2024年, 114年 = 2025年
    const res1 = extractExpirationDate("有效日期: 民國113.12.31");
    expect(res1.success).toBe(true);
    expect(res1.formattedDate).toBe("2024-12-31");

    const res2 = extractExpirationDate("到期日 114/06/18");
    expect(res2.success).toBe(true);
    expect(res2.formattedDate).toBe("2025-06-18");
  });

  it("extracts DD/MM/YYYY format", () => {
    const res = extractExpirationDate("Expiry: 25/12/2025");
    expect(res.success).toBe(true);
    expect(res.formattedDate).toBe("2025-12-25");
  });

  it("extracts dense YYYYMMDD preceded by keyword", () => {
    const res = extractExpirationDate("EXP 20251130 A1");
    expect(res.success).toBe(true);
    expect(res.formattedDate).toBe("2025-11-30");
  });

  it("returns error on noise or text without date stamps", () => {
    const res = extractExpirationDate("純鮮奶成分：100%生乳，容量936毫升");
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("handles empty or null string gracefully", () => {
    expect(extractExpirationDate("").success).toBe(false);
    expect(extractExpirationDate(null).success).toBe(false);
    expect(extractExpirationDate(undefined).success).toBe(false);
  });
});
