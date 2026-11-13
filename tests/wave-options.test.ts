import { describe, expect, it } from "vitest";
import { parseOptions, THEME_NAMES } from "@/lib/options";
import { parseCardOptions, serializeOptions, withOption } from "@/lib/embed";

describe("wave options and per-theme defaults", () => {
  it.each([undefined, "auto", " AUTO ", "invalid", "url(x)", "ffffff00"])("defaults wave_color %s to auto", (wave_color) => {
    expect(parseOptions({ wave_color }).wave_color).toBe("auto");
  });
  it.each([["fff", "#ffffff"], ["#f5e663", "#f5e663"], ["FF5F9E", "#ff5f9e"]])("normalizes wave color %s", (input, expected) => {
    expect(parseOptions({ wave_color: input }).wave_color).toBe(expected);
  });
  it("sets nameplate defaults only on wave and member, preserving explicit sources", () => {
    for (const theme of THEME_NAMES) {
      expect(parseOptions({ theme }).banner_source).toBe(["wave", "member"].includes(theme) ? "nameplate" : "auto");
      expect(parseOptions({ theme, banner_source: "profile" }).banner_source).toBe("profile");
      expect(parseOptions({ theme, banner_source: "invalid" }).banner_source).toBe(["wave", "member"].includes(theme) ? "nameplate" : "auto");
    }
  });
  it("omits wave and member defaults from embeds and changes defaults when switching themes", () => {
    for (const theme of ["wave", "member"]) {
      expect(serializeOptions(parseOptions({ theme })).toString()).toBe(`theme=${theme}`);
      expect(serializeOptions(parseOptions({ theme, banner_source: "auto" })).get("banner_source")).toBe("auto");
    }
    expect(serializeOptions(parseOptions({ theme: "wave", wave_color: "fff" })).get("wave_color")).toBe("ffffff");
    expect(withOption(parseOptions(), "theme", "wave").banner_source).toBe("nameplate");
    expect(withOption(parseOptions({ theme: "wave" }), "theme", "profile").banner_source).toBe("auto");
  });
});

describe("legacy query migration", () => {
  const owner = "animatedDecoration=true&showDisplayName=true&forceGradient=false&imgStyle=circle&showBanner=animated&theme=dark&ignoreAppId=983724520789655613";
  it("maps the exact owner's old query in both API and Studio/live parsers", () => {
    const query = new URLSearchParams(owner);
    const expected = { theme: "wave", mode: "dark", animated: true, avatar_shape: "circle", banner_source: "nameplate", force_gradient: false, ignore_app_id: "983724520789655613" };
    expect(parseOptions(query)).toMatchObject(expected);
    expect(parseCardOptions(query)).toEqual(parseOptions(query));
  });
  it.each(["dark", "light"])("maps old theme=%s to wave with matching mode", (theme) => {
    expect(parseOptions({ theme })).toMatchObject({ theme: "wave", mode: theme });
  });
  it("maps all aliases without changing a modern theme or unrelated query", () => {
    expect(parseOptions({ theme: "profile", imgStyle: "square", animatedDecoration: "false", hideDecoration: "true", hideStatus: "true", hideActivity: "true", hideSpotify: "true", hideBadges: "true", forceGradient: "true", showBanner: "false" })).toMatchObject({ theme: "profile", avatar_shape: "square", animated: false, hide_decoration: true, hide_status: true, hide_activity: true, hide_spotify: true, hide_badges: true, force_gradient: true, banner_source: "none" });
    expect(parseOptions({ theme: "profile", showBanner: "true" }).banner_source).toBe("auto");
    expect(parseOptions({ showDisplayName: "false" })).toEqual(parseOptions());
    expect(parseOptions({ theme: "unknown" }).theme).toBe("profile");
  });
  it("gives explicit modern values precedence, even invalid values", () => {
    expect(parseOptions({ theme: "light", mode: "dark", avatar_shape: "hexagon", imgStyle: "square", animated: "false", animatedDecoration: "true", banner_source: "accent", showBanner: "false", hide_status: "false", hideStatus: "true", force_gradient: "false", forceGradient: "true", ignore_app_id: "", ignoreAppId: "983724520789655613" })).toMatchObject({ theme: "wave", mode: "dark", avatar_shape: "hexagon", animated: false, banner_source: "accent", hide_status: false, force_gradient: false, ignore_app_id: "" });
    expect(parseOptions({ animated: "invalid", animatedDecoration: "false" }).animated).toBe(true);
    expect(parseOptions(new URLSearchParams("theme=light&theme=dark&imgStyle=square&imgStyle=circle"))).toMatchObject({ mode: "light", avatar_shape: "square" });
  });
  it("rejects unsupported legacy banner and shape values", () => {
    expect(parseOptions({ imgStyle: "hexagon", showBanner: "oops" })).toEqual(parseOptions());
    expect(parseOptions({ showBanner: "animated" }).animated).toBe(true);
  });
});

describe("ignored application IDs", () => {
  it("normalizes a comma list, preserves snowflake precision and removes duplicates", () => {
    expect(parseOptions({ ignore_app_id: " 983724520789655613,383226320970055681,983724520789655613 " }).ignore_app_id).toBe("983724520789655613,383226320970055681");
    expect(parseOptions({ ignore_app_id: Array.from({ length: 10 }, (_, n) => `98372452078965561${n}`).join(",") }).ignore_app_id.split(",")).toHaveLength(10);
  });
  it.each(["abc", "123", "983724520789655613,", "983724520789655613,x", "1".repeat(21), Array(11).fill("983724520789655613").join(",")])("rejects invalid list %s", (ignore_app_id) => {
    expect(parseOptions({ ignore_app_id }).ignore_app_id).toBe("");
  });
});
