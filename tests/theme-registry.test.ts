import { describe, expect, it } from "vitest";
import { getTheme, themes } from "@/card/theme-registry";
import { OPTION_NAMES } from "@/lib/options";

describe("theme registry contract", () => {
  it("registers the named themes with valid, unique supported controls", () => {
    expect(Object.keys(themes)).toEqual(["profile", "nitro", "member", "compact", "activity", "glass", "badge", "chat", "banner", "terminal", "neon", "retro", "polaroid", "mobile", "voice", "wave"]);
    expect(Object.keys(themes).filter((name) => themes[name]!.supportedParams.includes("wave_color"))).toEqual(["wave"]);
    expect(Object.values(themes).every((theme) => theme.supportedParams.includes("ignore_app_id"))).toBe(true);
    for (const [key, theme] of Object.entries(themes)) {
      expect(theme.name).toBe(key);
      expect(theme.label.length).toBeGreaterThan(0);
      expect(typeof theme.Component).toBe("function");
      expect(typeof theme.measure).toBe("function");
      expect(theme.supportedParams).toContain("theme");
      expect(theme.supportedParams).toContain("mode");
      expect(new Set(theme.supportedParams).size).toBe(theme.supportedParams.length);
      expect(theme.supportedParams.every((name) => OPTION_NAMES.includes(name))).toBe(true);
      expect(getTheme(key)).toBe(theme);
    }
    expect(themes.badge!.supportedParams).not.toContain("width");
    expect(themes.compact!.supportedParams).not.toContain("hide_decoration");
    expect(themes.activity!.supportedParams).not.toContain("max_activities");
  });
  it.each(["missing", "toString", "__proto__", "constructor"])("falls back safely for %s", (name) => {
    expect(getTheme(name)).toBe(themes.profile);
  });
});
