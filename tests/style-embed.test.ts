import { describe, expect, it } from "vitest";
import { getTheme } from "@/card/theme-registry";
import { buildCardUrl, buildEmbed, DEFAULT_OPTIONS, DEMO_ID, parseCardOptions, serializeOptions, studioSearch, supportedStyleParams, withOption } from "@/lib/embed";
import { STYLE_DEFAULTS, STYLE_PARAMS, STYLE_VALUES, type StyleParam } from "@/lib/style-options";

const origin = "https://cards.example";
const OTHER_ID = "268798547439255572";
const allValues = STYLE_PARAMS.flatMap((param) => STYLE_VALUES[param].map((value) => [param, value] as [StyleParam, string]));

describe("embed builder and style axes", () => {
  it("omits every style default", () => {
    expect(serializeOptions(DEFAULT_OPTIONS).toString()).toBe("");
    for (const param of STYLE_PARAMS) {
      expect(DEFAULT_OPTIONS[param]).toBe(STYLE_DEFAULTS[param]);
      expect(serializeOptions(parseCardOptions({ [param]: STYLE_DEFAULTS[param] })).has(param)).toBe(false);
    }
    expect(buildCardUrl(origin, DEMO_ID, parseCardOptions({ ring: "status", pattern: "none", eq_style: "bars" }))).toBe(`${origin}/api/${DEMO_ID}`);
  });
  it.each(allValues)("serializes %s=%s only when it differs from the default", (param, value) => {
    const options = parseCardOptions({ [param]: value });
    const query = serializeOptions(options);
    expect(query.get(param)).toBe(value === STYLE_DEFAULTS[param] ? null : value);
    expect(parseCardOptions(query)).toEqual(options);
  });
  it("puts style axes into every embed format and both picture sources", () => {
    const options = parseCardOptions({ ring: "rainbow", pattern: "stars", font: "mono", mode: "light" });
    const embed = buildEmbed(origin, DEMO_ID, options, { width: 420, height: 480 });
    for (const format of ["markdown", "html", "picture", "iframe", "url"] as const) expect(embed[format]).toContain("ring=rainbow");
    expect(embed.picture).toContain("pattern=stars&amp;font=mono\" />");
    expect(new URL(embed.liveUrl).searchParams.get("font")).toBe("mono");
  });
  it("drops style axes the selected theme does not support", () => {
    const options = parseCardOptions({ theme: "badge", ring: "rainbow", font: "mono", eq_style: "wave", pattern: "dots", border: "glow" });
    expect(Object.fromEntries(serializeOptions(options))).toEqual({ theme: "badge", pattern: "dots", border: "glow" });
  });
  it("lists supported style axes per theme in canonical order", () => {
    expect(supportedStyleParams("profile")).toEqual(STYLE_PARAMS);
    expect(supportedStyleParams("badge")).toEqual(["pattern", "effect", "border"]);
    expect(supportedStyleParams("missing")).toEqual(STYLE_PARAMS);
    for (const name of ["nitro", "member", "compact", "activity", "glass"]) expect(supportedStyleParams(name)).toEqual(STYLE_PARAMS.filter((param) => getTheme(name).supportedParams.includes(param)));
  });
});

describe("Studio URL state for style axes", () => {
  it.each(allValues)("round-trips %s=%s through a control change, the address bar and a reload", (param, value) => {
    const changed = withOption(DEFAULT_OPTIONS, param, value);
    expect(changed[param]).toBe(value);
    for (const id of [DEMO_ID, OTHER_ID]) {
      const search = studioSearch(changed, id);
      const reloaded = new URLSearchParams(search);
      expect(reloaded.get("id")).toBe(id === DEMO_ID ? null : id);
      expect(reloaded.get(param)).toBe(value === STYLE_DEFAULTS[param] ? null : value);
      expect(parseCardOptions(reloaded)).toEqual(changed);
    }
  });
  it("returns to a clean address when a style axis is reset to its default", () => {
    const styled = withOption(withOption(DEFAULT_OPTIONS, "pattern", "hex"), "effect", "sparkle");
    expect(studioSearch(styled, DEMO_ID)).toBe("pattern=hex&effect=sparkle");
    expect(studioSearch(withOption(withOption(styled, "pattern", "none"), "effect", "none"), DEMO_ID)).toBe("");
  });
  it("keeps invalid control values on the default and preserves other axes", () => {
    const styled = withOption(DEFAULT_OPTIONS, "ring", "gradient");
    const next = withOption(styled, "pattern", "not-a-pattern");
    expect(next).toMatchObject({ ring: "gradient", pattern: "none" });
    expect(studioSearch(next, DEMO_ID)).toBe("ring=gradient");
  });
  it("drops axes a newly selected theme does not support and keeps the shared ones", () => {
    const styled = withOption(withOption(withOption(DEFAULT_OPTIONS, "ring", "rainbow"), "pattern", "waves"), "font", "serif");
    const badge = withOption(styled, "theme", "badge");
    expect(badge).toMatchObject({ theme: "badge", pattern: "waves" });
    const search = studioSearch(badge, OTHER_ID);
    expect(search).toBe(`theme=badge&pattern=waves&id=${OTHER_ID}`);
    expect(parseCardOptions(new URLSearchParams(search))).toMatchObject({ theme: "badge", pattern: "waves", ring: "status", font: "default" });
  });
});
