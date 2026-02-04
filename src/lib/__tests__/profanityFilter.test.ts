import { describe, it, expect } from "vitest";
import { containsProfanity, sanitizePoolName } from "@/lib/profanityFilter";

describe("profanityFilter", () => {
  describe("containsProfanity", () => {
    it("returns false for clean text", () => {
      expect(containsProfanity("Hello world")).toBe(false);
      expect(containsProfanity("This is a test")).toBe(false);
      expect(containsProfanity("Rugby is great")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(containsProfanity("")).toBe(false);
    });

    it("returns false for normal school names", () => {
      expect(containsProfanity("Grey College")).toBe(false);
      expect(containsProfanity("Paul Roos Gymnasium")).toBe(false);
      expect(containsProfanity("Paarl Boys High")).toBe(false);
    });
  });

  describe("sanitizePoolName", () => {
    it("returns valid for clean pool names", () => {
      expect(sanitizePoolName("My Pool").isValid).toBe(true);
      expect(sanitizePoolName("Rugby Legends").isValid).toBe(true);
    });

    it("rejects too short names", () => {
      const result = sanitizePoolName("ab");
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("at least 3 characters");
    });

    it("rejects too long names", () => {
      const longName = "a".repeat(51);
      const result = sanitizePoolName(longName);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("less than 50 characters");
    });
  });
});
