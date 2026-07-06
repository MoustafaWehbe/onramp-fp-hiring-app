import { describe, it, expect } from "vitest";
import { cn } from "../../lib/utils";

describe("cn utility", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("deduplicates conflicting Tailwind classes", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("handles conditional classes", () => {
    const isHidden = false;

    expect(cn("base", isHidden && "hidden", "extra")).toBe("base extra");
  });
});
