import { describe, it, expect } from "vitest";
import {
  generateInviteCode,
  validateInviteCode,
  normalizeInviteCode,
} from "@/lib/household/invite-code";
import {
  generateBindingCode,
  parseBindingCode,
  isValidBindingCode,
} from "@/lib/household/binding-code";

describe("Household Sharing & Code Utilities", () => {
  describe("6-Character Invite Code", () => {
    it("generates a 6-character alphanumeric uppercase code", () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(6);
      expect(typeof code).toBe("string");
      expect(/^[0-9A-Z]{6}$/.test(code)).toBe(true);
    });

    it("validates correct 6-character codes", () => {
      expect(validateInviteCode("8K9B2A")).toBe(true);
      expect(validateInviteCode("ABC123")).toBe(true);
      expect(validateInviteCode("abc123")).toBe(true); // normalize handles case
    });

    it("rejects invalid codes (length != 6, special characters)", () => {
      expect(validateInviteCode("12345")).toBe(false); // 5 chars
      expect(validateInviteCode("1234567")).toBe(false); // 7 chars
      expect(validateInviteCode("AB-CD9")).toBe(false); // special char
      expect(validateInviteCode("")).toBe(false);
      expect(validateInviteCode(null)).toBe(false);
      expect(validateInviteCode(undefined)).toBe(false);
    });

    it("normalizes code by trimming whitespace and capitalizing", () => {
      expect(normalizeInviteCode("  8k9b2a  ")).toBe("8K9B2A");
    });
  });

  describe("LINE Group Binding Code (#BIND-XXXX)", () => {
    it("generates a binding code starting with #BIND-", () => {
      const code = generateBindingCode(4);
      expect(code.startsWith("#BIND-")).toBe(true);
      expect(isValidBindingCode(code)).toBe(true);
    });

    it("extracts #BIND-XXXX from conversational messages", () => {
      expect(parseBindingCode("你好，這是我的綁定代碼 #BIND-8899 請幫忙綁定")).toBe("#BIND-8899");
      expect(parseBindingCode("#bind-k92a")).toBe("#BIND-K92A");
      expect(parseBindingCode("沒有包含代碼的文字")).toBe(null);
      expect(parseBindingCode(null)).toBe(null);
    });

    it("validates binding code format", () => {
      expect(isValidBindingCode("#BIND-8899")).toBe(true);
      expect(isValidBindingCode("#BIND-ABC1")).toBe(true);
      expect(isValidBindingCode("BIND-8899")).toBe(false);
      expect(isValidBindingCode("#BIND-")).toBe(false);
    });
  });
});
