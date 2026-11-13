import { describe, expect, it } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { getTheme } from "@/card/theme-registry";
import { allStyleParams, cardStyle, Equalizer, resolveAvatarLook, styleCss, surfaceStyleParams } from "@/card/styles";
import { normalize } from "@/lib/lanyard/normalize";
import { OPTION_NAMES } from "@/lib/options";
import { STYLE_DEFAULTS, STYLE_PARAMS, STYLE_VALUES, type StyleOptions, type StyleParam } from "@/lib/style-options";
import { renderInlinedSvg, renderSvg } from "@/lib/svg/render";
import { PLACEHOLDER, type InlineOptions } from "@/lib/svg/assets";
import { exampleFixtures, exampleModes, exampleOptions } from "../scripts/example-data";
import { demoUserPresence, FIXED_NOW, gamePresence, plainUserPresence, spotifyPresence } from "./fixtures";

/** The seven Phase 2 themes this suite owns; newer themes carry their own style tests. */
const EXISTING = ["profile", "nitro", "member", "compact", "activity", "glass", "badge"] as const;
const EXTERNAL = /(?:src|href)="https?:|url\(["']?https?:/;
const inlineOptions: InlineOptions = {
  lookup: async () => [{ address: "8.8.8.8", family: 4 }],
  download: async () => ({ mime: "image/png", bytes: Buffer.from(PLACEHOLDER.split(",")[1]!, "base64") }),
};
const demo = normalize(demoUserPresence, { now: FIXED_NOW });
const spotify = normalize(spotifyPresence, { now: FIXED_NOW });
const game = normalize(gamePresence, { now: FIXED_NOW });
const plain = normalize(plainUserPresence, { now: FIXED_NOW });
const allValues = STYLE_PARAMS.flatMap((param) => STYLE_VALUES[param].map((value) => [param, value] as [StyleParam, string]));
/** Avatar axes render without the demo decoration so the ring is visible; the equalizer needs music. */
const styleQuery = (param: StyleParam, value: string) => ({ [param]: value, ...(param === "ring" || param === "status_style" || param === "avatar_shape" ? { hide_decoration: "true" } : {}) });
const dataFor = (param: StyleParam) => (param === "eq_style" ? spotify : demo);

function parseXml(svg: string) {
  const issues: string[] = [];
  const xml = new DOMParser({ onError: (level, message) => { issues.push(`${level}: ${message}`); } }).parseFromString(svg, "image/svg+xml");
  return { xml, issues };
}

describe("style axes on the profile theme (inlined SVG)", () => {
  const baseline = Buffer.byteLength(renderSvg(spotify, exampleOptions("profile", "dark"), () => PLACEHOLDER));
  it.each(allValues)("%s=%s is well formed, measured, local and within budget", async (param, value) => {
    for (const mode of exampleModes) {
      const data = dataFor(param);
      const options = exampleOptions("profile", mode, styleQuery(param, value));
      expect(options[param]).toBe(value);
      const svg = await renderInlinedSvg(data, options, undefined, inlineOptions);
      const { xml, issues } = parseXml(svg);
      expect(issues).toEqual([]);
      const size = getTheme("profile").measure(data, options);
      expect(xml.documentElement?.getAttribute("width")).toBe(String(size.width));
      expect(xml.documentElement?.getAttribute("height")).toBe(String(size.height));
      expect(svg).not.toMatch(EXTERNAL);
      expect(Buffer.byteLength(svg)).toBeLessThan(1_000_000);
      for (const img of Array.from(xml.getElementsByTagName("img"))) expect(img.getAttribute("src")).toMatch(/^data:image\//);
    }
    // Only the active value's rules are emitted: one axis adds at most ~6 KB to a card.
    const styled = Buffer.byteLength(renderSvg(spotify, exampleOptions("profile", "dark", styleQuery(param, value)), () => PLACEHOLDER));
    expect(styled - baseline).toBeLessThan(6_000);
  });
});

describe.each(EXISTING.map((name) => [name]))("style axes on %s", (name) => {
  const theme = getTheme(name);
  const supported = STYLE_PARAMS.filter((param) => theme.supportedParams.includes(param));
  it("declares valid style metadata", () => {
    expect(supported.length).toBeGreaterThan(0);
    for (const param of supported) expect(OPTION_NAMES).toContain(param);
  });
  it("renders every supported value as local, well-formed XML without changing measure()", () => {
    for (const param of supported) for (const value of STYLE_VALUES[param]) for (const mode of exampleModes) {
      const data = dataFor(param);
      const options = exampleOptions(name, mode, styleQuery(param, value));
      const svg = renderSvg(data, options, () => PLACEHOLDER);
      const { xml, issues } = parseXml(svg);
      expect(issues, `${name} ${param}=${value} ${mode}`).toEqual([]);
      const size = theme.measure(data, options);
      expect(size).toEqual(theme.measure(data, exampleOptions(name, mode, param === "ring" || param === "status_style" || param === "avatar_shape" ? { hide_decoration: "true" } : {})));
      expect(xml.documentElement?.getAttribute("width")).toBe(String(size.width));
      expect(xml.documentElement?.getAttribute("height")).toBe(String(size.height));
      expect(svg).not.toMatch(EXTERNAL);
      expect(svg).not.toContain("<script");
    }
  });
  it("keeps measure() independent of every style axis across fixtures", () => {
    const everything: Record<string, string> = { avatar_shape: "hexagon", ring: "double", pattern: "circuit", effect: "sparkle", status_style: "pill", eq_style: "spectrum", font: "condensed", border: "gradient" };
    for (const presence of Object.values(exampleFixtures)) {
      const data = normalize(presence, { now: FIXED_NOW });
      for (const width of ["300", "600"]) expect(theme.measure(data, exampleOptions(name, "light", { ...everything, width }))).toEqual(theme.measure(data, exampleOptions(name, "light", { width })));
    }
  });
  it("ignores style axes the theme does not declare", () => {
    const unsupported = STYLE_PARAMS.filter((param) => !supported.includes(param));
    const query = Object.fromEntries(unsupported.map((param) => [param, STYLE_VALUES[param].at(-1)!]));
    const svg = renderSvg(demo, exampleOptions(name, "dark", query), () => PLACEHOLDER);
    expect(svg).toBe(renderSvg(demo, exampleOptions(name, "dark"), () => PLACEHOLDER));
  });
});

describe("theme style metadata", () => {
  it("lets the full-size themes adopt every axis and the badge only surface axes", () => {
    for (const name of ["profile", "nitro", "member", "compact", "activity", "glass"]) expect(STYLE_PARAMS.filter((param) => getTheme(name).supportedParams.includes(param))).toEqual(STYLE_PARAMS);
    expect(STYLE_PARAMS.filter((param) => getTheme("badge").supportedParams.includes(param))).toEqual([...surfaceStyleParams]);
    expect([...allStyleParams]).toEqual(STYLE_PARAMS);
  });
});

describe("decoration-aware avatar rule", () => {
  const look = (options: Partial<StyleOptions> & { hide_status?: boolean }, decorated: boolean) => resolveAvatarLook({ ...STYLE_DEFAULTS, hide_status: false, ...options }, decorated);
  it("suppresses line rings and softens halo rings under a visible decoration", () => {
    for (const ring of ["status", "accent", "gradient", "rainbow", "dashed", "double"] as const) {
      expect(look({ ring }, true)).toMatchObject({ ring: "none", tone: "full" });
      expect(look({ ring }, false)).toMatchObject({ ring, tone: "full" });
    }
    for (const ring of ["glow", "pulse"] as const) expect(look({ ring }, true)).toMatchObject({ ring, tone: "soft" });
  });
  it("puts the presence ring in the ring slot and falls back to the dot under a decoration", () => {
    expect(look({ status_style: "ring", ring: "rainbow" }, false)).toMatchObject({ status: "ring", ring: "none" });
    expect(look({ status_style: "ring" }, true)).toMatchObject({ status: "dot", ring: "none" });
  });
  it("never reveals a hidden status through the status ring", () => {
    expect(look({ ring: "status", hide_status: true }, false)).toMatchObject({ status: "hidden", ring: "none" });
    expect(look({ ring: "accent", hide_status: true }, false)).toMatchObject({ status: "hidden", ring: "accent" });
  });
  it("applies the rule in rendered cards and treats a failed decoration as absent", () => {
    const decorated = renderSvg(demo, exampleOptions("profile", "dark", { ring: "gradient" }), (url) => url.includes("avatar-decoration") ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEElEQVR4nGNgYGD4z4AEAAUAAf9X5rYAAAAASUVORK5CYII=" : PLACEHOLDER);
    expect(decorated).toContain('class="decoration"');
    expect(decorated).not.toContain("sx-ring-gradient");
    const requested: string[] = [];
    const failed = renderSvg(demo, exampleOptions("profile", "dark", { ring: "gradient" }), (url) => { requested.push(url); return PLACEHOLDER; });
    expect(requested.some((url) => url.includes("avatar-decoration"))).toBe(true);
    expect(failed).not.toContain('class="decoration"');
    expect(failed).toContain("sx-ring-gradient");
    expect(renderSvg(demo, exampleOptions("profile", "dark", { ring: "glow" }), () => "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEElEQVR4nGNgYGD4z4AEAAUAAf9X5rYAAAAASUVORK5CYII=")).toContain("sx-ring-soft");
  });
  it("renders each status style and keeps hide_status authoritative", () => {
    const options = (query: Record<string, string>) => exampleOptions("profile", "dark", { hide_decoration: "true", ...query });
    expect(renderSvg(game, options({ status_style: "pill" }), () => PLACEHOLDER)).toContain(">DND</span>");
    expect(renderSvg(game, options({ status_style: "text" }), () => PLACEHOLDER)).toContain(">Do not disturb</span>");
    const ring = renderSvg(game, options({ status_style: "ring" }), () => PLACEHOLDER);
    expect(ring).toContain("sx-ring-presence sx-is-dnd");
    expect(ring).not.toMatch(/class="status-dot/);
    for (const status_style of STYLE_VALUES.status_style) {
      const hidden = renderSvg(game, options({ status_style, hide_status: "true" }), () => PLACEHOLDER);
      expect(hidden).not.toMatch(/class="(?:status-dot|sx-status-|sx-ring sx-ring-presence)|class="sx-ring[^"]*sx-is-/);
    }
  });
});

describe("equalizer, motion and scoping", () => {
  it("shows the equalizer only next to Spotify and listening activities", () => {
    expect(renderSvg(spotify, exampleOptions("profile", "dark"), () => PLACEHOLDER)).toContain("sx-eq sx-eq-bars");
    expect(renderSvg(game, exampleOptions("profile", "dark"), () => PLACEHOLDER)).not.toContain("sx-eq");
    expect(renderSvg(spotify, exampleOptions("profile", "dark", { eq_style: "none" }), () => PLACEHOLDER)).not.toContain("sx-eq");
    expect(renderSvg(spotify, exampleOptions("profile", "dark", { hide_spotify: "true" }), () => PLACEHOLDER)).not.toContain("sx-eq");
    const listening = { ...game, spotify: null, activities: [{ ...game.activities[0]!, type: 2, verb: "Listening to", title: "Listening to Apple Music" }] };
    for (const theme of ["profile", "compact", "activity"]) expect(renderSvg(listening, exampleOptions(theme, "dark", { eq_style: "wave" }), () => PLACEHOLDER)).toContain("sx-eq-wave");
    for (const value of STYLE_VALUES.eq_style) {
      const markup = renderToStaticMarkup(<Equalizer options={{ eq_style: value }} />);
      if (value === "none") expect(markup).toBe("");
      else expect(markup).toContain(`class="sx-eq sx-eq-${value}" aria-hidden="true"`);
    }
  });
  it("keeps every animation behind prefers-reduced-motion and drops motion when animated=false", () => {
    for (const [param, value] of allValues) {
      const style = { ...STYLE_DEFAULTS, [param]: value } as StyleOptions;
      const moving = styleCss({ style, motion: true, equalizer: true });
      const [still, media = ""] = moving.split("@media (prefers-reduced-motion:no-preference)");
      expect(still, `${param}=${value}`).not.toMatch(/animation\s*:/);
      if (media) expect(media).toMatch(/animation:/);
      expect(styleCss({ style, motion: false, equalizer: true })).not.toMatch(/animation|@keyframes/);
    }
    const svg = renderSvg(spotify, exampleOptions("profile", "dark", { animated: "false", effect: "sparkle", ring: "rainbow", pattern: "aurora", hide_decoration: "true" }), () => PLACEHOLDER);
    const styleSheet = svg.slice(svg.indexOf(".sx-root{isolation:isolate}"), svg.indexOf("</style>"));
    expect(styleSheet.length).toBeGreaterThan(100);
    expect(styleSheet).not.toMatch(/animation|@keyframes|prefers-reduced-motion/);
  });
  it("scopes every rule under .sx-root and keeps the default stylesheet tiny", () => {
    const css = styleCss({ style: { ...STYLE_DEFAULTS, ring: "rainbow", pattern: "hex", effect: "scanline", font: "mono", border: "glow", status_style: "pill", avatar_shape: "octagon" }, motion: true, equalizer: true });
    for (const rule of css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "").replace(/@media[^{]+\{/g, "").split("}").map((part) => part.split("{")[0]!.trim()).filter(Boolean)) {
      for (const selector of rule.split(",")) expect(selector.trim()).toMatch(/^\.sx-root/);
    }
    // ~1.2 KB of axis defaults plus the shared Discord status-glyph rules (status-glyph.tsx).
    expect(styleCss({ style: STYLE_DEFAULTS, motion: true, equalizer: false }).length).toBeLessThan(1_400);
    expect(css).not.toMatch(/url\((?!#)/);
  });
  it("adds root classes only for non-default font, border and effect values and keeps SVG ids user-scoped", () => {
    const options = exampleOptions("profile", "light", { font: "serif", border: "accent", effect: "glow", pattern: "hex" });
    const { className } = cardStyle({ data: plain, options, assets: () => PLACEHOLDER }, getTheme("profile").supportedParams);
    expect(className.split(" ").sort()).toEqual(["sx-border-accent", "sx-font", "sx-font-serif", "sx-fx-glow", "sx-light", "sx-root"]);
    expect(cardStyle({ data: plain, options: exampleOptions("profile", "dark"), assets: () => PLACEHOLDER }, OPTION_NAMES).className).toBe("sx-root");
    const svg = renderSvg(plain, options, () => PLACEHOLDER);
    expect(svg).toContain(`id="sx-pt-hex-${plain.user.id}"`);
  });
});
