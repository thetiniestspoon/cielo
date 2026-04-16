import { describe, it, expect } from "vitest";
import { hashId, seededOffset, isMotionReduced, DEFAULTS, type SkySettings } from "./settings";

describe("settings helpers", () => {
  it("hashId is deterministic", () => {
    expect(hashId("foo")).toBe(hashId("foo"));
    expect(hashId("foo")).not.toBe(hashId("bar"));
  });

  it("seededOffset is stable and in [-1, 1]", () => {
    const a = seededOffset("node-1", "x");
    const b = seededOffset("node-1", "x");
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(-1);
    expect(a).toBeLessThanOrEqual(1);
  });

  it("seededOffset differs when salt differs", () => {
    expect(seededOffset("n", "x")).not.toBe(seededOffset("n", "y"));
  });

  it("isMotionReduced honors explicit override", () => {
    const s: SkySettings = { ...DEFAULTS, reduceMotion: true };
    expect(isMotionReduced(s)).toBe(true);
    const t: SkySettings = { ...DEFAULTS, reduceMotion: false };
    expect(isMotionReduced(t)).toBe(false);
  });
});
