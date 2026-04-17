import { describe, expect, it } from "bun:test";
import { findTheme, THEMES } from "./colors";

describe("THEMES", () => {
  it("ships the expected built-in themes", () => {
    const ids = THEMES.map((t) => t.id).sort();
    expect(ids).toEqual(["aurora", "forest", "midnight", "ocean", "sunset"]);
  });

  it("each theme has a complete color palette", () => {
    const required = [
      "bg",
      "bgElev",
      "bgElev2",
      "fg",
      "fgDim",
      "accent",
      "accentFg",
      "danger",
      "border",
      "gradientStart",
      "gradientEnd",
    ] as const;
    for (const theme of THEMES) {
      for (const key of required) {
        expect(theme.colors[key]).toBeDefined();
        expect(theme.colors[key].length).toBeGreaterThan(0);
      }
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.description.length).toBeGreaterThan(0);
    }
  });

  it("theme ids are unique", () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("findTheme", () => {
  it("returns the theme matching the given id", () => {
    expect(findTheme("sunset").id).toBe("sunset");
    expect(findTheme("forest").name).toBe("Forest");
  });

  it("falls back to the first theme for unknown ids", () => {
    expect(findTheme("does-not-exist").id).toBe(THEMES[0]!.id);
  });

  it("falls back to the first theme for empty string", () => {
    expect(findTheme("").id).toBe(THEMES[0]!.id);
  });
});
