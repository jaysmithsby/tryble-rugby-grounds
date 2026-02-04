import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility", () => {
  it("merges class names correctly", () => {
    const result = cn("base-class", "additional-class");
    expect(result).toBe("base-class additional-class");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  it("removes falsy values", () => {
    const isFalse = false;
    const result = cn("base", isFalse && "hidden", null, undefined, "visible");
    expect(result).toBe("base visible");
  });

  it("handles tailwind conflicts by keeping the last one", () => {
    const result = cn("p-4", "p-8");
    expect(result).toBe("p-8");
  });

  it("merges tailwind classes properly", () => {
    const result = cn("bg-red-500", "text-white", "bg-blue-500");
    expect(result).toBe("text-white bg-blue-500");
  });
});
