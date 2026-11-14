/**
 * Expiration Date Text Extractor and Parser
 * Parses recognized OCR text or raw image strings into normalized YYYY-MM-DD format.
 */

export interface ParsedDateResult {
  success: boolean;
  rawMatch?: string;
  formattedDate?: string; // YYYY-MM-DD
  confidence?: number;
  error?: string;
}

/**
 * Normalizes numbers, removes noise, and resolves ROC (Minguo) calendar years.
 */
export function extractExpirationDate(text: string | null | undefined): ParsedDateResult {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return { success: false, error: "Empty or invalid text input" };
  }

  // Pre-clean text: normalize full-width digits and separators
  const cleaned = text
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[／＼]/g, "/")
    .replace(/[．。]/g, ".")
    .replace(/[－—–]/g, "-")
    .replace(/[\r\n]+/g, " ");

  // 1. Standard YYYY[-/.]MM[-/.]DD (e.g., 2024/12/31, 2025.01.15, 2026-08-01)
  const ymdMatch = cleaned.match(/\b(20[2-9]\d)[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
  if (ymdMatch) {
    const [raw, y, m, d] = ymdMatch;
    return {
      success: true,
      rawMatch: raw,
      formattedDate: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
      confidence: 0.95,
    };
  }

  // 2. YYYYMMDD without separators (e.g., 20251120) preceded or followed by expiry keywords
  const ymdDenseMatch = cleaned.match(/(?:EXP|EXPIRY|有效日期|到期日|BEST BEFORE)?\s*[:：]?\s*\b(20[2-9]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/i);
  if (ymdDenseMatch) {
    const [, y, m, d] = ymdDenseMatch;
    return {
      success: true,
      rawMatch: ymdDenseMatch[0],
      formattedDate: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
      confidence: 0.85,
    };
  }

  // 3. ROC / Minguo Calendar format: e.g. 113.10.25 or 114/05/30 (ROC 113 = 2024, ROC 114 = 2025)
  const rocMatch = cleaned.match(/\b(1[1-9]\d)[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
  if (rocMatch) {
    const [raw, rocYear, m, d] = rocMatch;
    const gregorianYear = 1911 + parseInt(rocYear, 10);
    return {
      success: true,
      rawMatch: raw,
      formattedDate: `${gregorianYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
      confidence: 0.9,
    };
  }

  // 4. DD[-/.]MM[-/.]YYYY format (e.g. 31/12/2025)
  const dmyMatch = cleaned.match(/\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20[2-9]\d)\b/);
  if (dmyMatch) {
    const [raw, d, m, y] = dmyMatch;
    return {
      success: true,
      rawMatch: raw,
      formattedDate: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
      confidence: 0.88,
    };
  }

  // 5. Short year format YY.MM.DD (e.g. 25.12.31 -> 2025-12-31) when adjacent to expiry keywords
  const shortMatch = cleaned.match(/(?:EXP|有效|到期|賞味期限)\s*[:：]?\s*\b([2-9]\d)[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/i);
  if (shortMatch) {
    const [, yy, m, d] = shortMatch;
    const y = `20${yy}`;
    return {
      success: true,
      rawMatch: shortMatch[0],
      formattedDate: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
      confidence: 0.8,
    };
  }

  return {
    success: false,
    error: "No recognizable expiration date pattern detected in text",
  };
}
