import { describe, expect, it } from "vitest";
import { themes } from "@/card/theme-registry";
import { parseOptions, THEME_NAMES } from "@/lib/options";

describe("card options", () => {
  it("supplies complete safe defaults", () => {
    const options = parseOptions(new URLSearchParams());
    expect(options).toMatchObject({ theme: "profile", mode: "dark", accent: "#5865f2", bg: null, radius: 16, width: 420, animated: true, max_activities: 2, force_gradient: false, show_banner: true });
    expect(options.hide_kv).toBe(false);
  });
  it("clamps dimensions and counts while accepting every section-7 toggle", () => {
    const options = parseOptions({ width: "9999", radius: "-3", max_activities: "99", mode: "light", animated: "false", bg: "transparent", accent: "abc", name_gradient: "5865f2-ec48bd", force_gradient: "true", show_banner: "false", hide_decoration: "true", hide_nameplate: "true", hide_tag: "true", hide_badges: "true", hide_status: "true", hide_platforms: "true", hide_custom_status: "true", hide_activity: "true", hide_spotify: "true", hide_timestamps: "true", hide_kv: "true", hide_effect: "true", hide_frame: "true" });
    expect(options).toMatchObject({ width: 600, radius: 0, max_activities: 4, mode: "light", animated: false, bg: "transparent", accent: "#aabbcc", name_gradient: ["#5865f2", "#ec48bd"], force_gradient: true, show_banner: false });
    expect(Object.entries(options).filter(([key]) => key.startsWith("hide_")).every(([, value]) => value === true)).toBe(true);
  });
  it("falls back independently for malformed or repeated values without throwing", () => {
    expect(parseOptions({ theme: "neon-unknown", mode: "wat", accent: "red;display:none", bg: "url(x)", width: "Infinity", radius: "", max_activities: "no", animated: "yes", name_gradient: "fff-evil" })).toMatchObject({ theme: "profile", mode: "dark", accent: "#5865f2", bg: null, width: 420, radius: 16, max_activities: 2, animated: true, name_gradient: [] });
    expect(parseOptions({ width: ["320", "600"], hide_kv: "false", idle_text: "x".repeat(300) })).toMatchObject({ width: 320, hide_kv: false });
    expect(parseOptions({ idle_text: "x".repeat(300) }).idle_text.length).toBeLessThanOrEqual(120);
  });
  it("accepts every registered theme and stays in sync with the registry", () => {
    expect([...THEME_NAMES].sort()).toEqual(Object.keys(themes).sort());
    for (const name of THEME_NAMES) expect(parseOptions({ theme: name }).theme).toBe(name);
  });
});
