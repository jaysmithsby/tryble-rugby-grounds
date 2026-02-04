import { describe, it, expect } from "vitest";
import { CACHE_TIMES, GC_TIMES, DEFAULT_QUERY_OPTIONS } from "@/lib/queryConfig";

describe("queryConfig", () => {
  describe("CACHE_TIMES", () => {
    it("has correct static cache time (10 minutes)", () => {
      expect(CACHE_TIMES.STATIC).toBe(10 * 60 * 1000);
    });

    it("has correct reference cache time (5 minutes)", () => {
      expect(CACHE_TIMES.REFERENCE).toBe(5 * 60 * 1000);
    });

    it("has correct user profile cache time (5 minutes)", () => {
      expect(CACHE_TIMES.USER_PROFILE).toBe(5 * 60 * 1000);
    });

    it("has correct dynamic cache time (2 minutes)", () => {
      expect(CACHE_TIMES.DYNAMIC).toBe(2 * 60 * 1000);
    });

    it("has correct volatile cache time (1 minute)", () => {
      expect(CACHE_TIMES.VOLATILE).toBe(60 * 1000);
    });

    it("has correct realtime cache time (30 seconds)", () => {
      expect(CACHE_TIMES.REALTIME).toBe(30 * 1000);
    });

    it("has correct form cache time (10 seconds)", () => {
      expect(CACHE_TIMES.FORM).toBe(10 * 1000);
    });

    it("cache times are ordered correctly (longer to shorter)", () => {
      expect(CACHE_TIMES.STATIC).toBeGreaterThan(CACHE_TIMES.REFERENCE);
      expect(CACHE_TIMES.DYNAMIC).toBeGreaterThan(CACHE_TIMES.VOLATILE);
      expect(CACHE_TIMES.VOLATILE).toBeGreaterThan(CACHE_TIMES.REALTIME);
      expect(CACHE_TIMES.REALTIME).toBeGreaterThan(CACHE_TIMES.FORM);
    });
  });

  describe("GC_TIMES", () => {
    it("has correct long GC time (30 minutes)", () => {
      expect(GC_TIMES.LONG).toBe(30 * 60 * 1000);
    });

    it("has correct standard GC time (10 minutes)", () => {
      expect(GC_TIMES.STANDARD).toBe(10 * 60 * 1000);
    });

    it("has correct short GC time (5 minutes)", () => {
      expect(GC_TIMES.SHORT).toBe(5 * 60 * 1000);
    });
  });

  describe("DEFAULT_QUERY_OPTIONS", () => {
    it("static options use correct cache times", () => {
      expect(DEFAULT_QUERY_OPTIONS.static.staleTime).toBe(CACHE_TIMES.STATIC);
      expect(DEFAULT_QUERY_OPTIONS.static.gcTime).toBe(GC_TIMES.LONG);
    });

    it("userProfile options use correct cache times", () => {
      expect(DEFAULT_QUERY_OPTIONS.userProfile.staleTime).toBe(CACHE_TIMES.USER_PROFILE);
      expect(DEFAULT_QUERY_OPTIONS.userProfile.gcTime).toBe(GC_TIMES.STANDARD);
    });

    it("dynamic options use correct cache times", () => {
      expect(DEFAULT_QUERY_OPTIONS.dynamic.staleTime).toBe(CACHE_TIMES.DYNAMIC);
      expect(DEFAULT_QUERY_OPTIONS.dynamic.gcTime).toBe(GC_TIMES.STANDARD);
    });

    it("volatile options use correct cache times", () => {
      expect(DEFAULT_QUERY_OPTIONS.volatile.staleTime).toBe(CACHE_TIMES.VOLATILE);
      expect(DEFAULT_QUERY_OPTIONS.volatile.gcTime).toBe(GC_TIMES.SHORT);
    });
  });
});
