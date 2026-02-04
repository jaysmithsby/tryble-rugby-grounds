import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, sanitizePII } from "@/lib/logger";

describe("logger", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("sanitizePII", () => {
    it("redacts email addresses", () => {
      const input = "User email is test@example.com";
      const result = sanitizePII(input);
      expect(result).toBe("User email is [EMAIL_REDACTED]");
    });

    it("redacts bearer tokens", () => {
      const input = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
      const result = sanitizePII(input);
      expect(result).toContain("[TOKEN_REDACTED]");
    });

    it("returns original string if no PII found", () => {
      const input = "No sensitive data here";
      const result = sanitizePII(input);
      expect(result).toBe("No sensitive data here");
    });
  });

  describe("logger.info", () => {
    it("logs info level messages", () => {
      logger.info("Test message", { key: "value" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
