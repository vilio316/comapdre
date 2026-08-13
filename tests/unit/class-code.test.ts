import { describe, it, expect } from "vitest";
import { generateClassCode } from "@/app/lib/class-code";

describe("generateClassCode", () => {
  it("returns a 6-character code by default", () => {
    const code = generateClassCode();
    expect(code).toHaveLength(6);
  });

  it("uses only unambiguous characters", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateClassCode();
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/);
    }
  });

  it("respects a custom length", () => {
    expect(generateClassCode(4)).toHaveLength(4);
    expect(generateClassCode(8)).toHaveLength(8);
  });
});