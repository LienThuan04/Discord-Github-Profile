import { describe, expect, it } from "vitest";
import { getTheme, themes } from "@/card/theme-registry";
import { buildCardUrl, buildEmbed, DEFAULT_OPTIONS, DEMO_ID, isDiscordId, parseCardOptions, serializeOptions } from "@/lib/embed";
import { emptyCardData } from "@/lib/lanyard/normalize";
import { parseOptions } from "@/lib/options";

const origin = "https://cards.example";
const size = { width: 420, height: 448 };
describe("embed builders", () => {
  it("omits every default and produces canonical, clean URLs", () => {
    expect(serializeOptions(DEFAULT_OPTIONS).toString()).toBe("");
    expect(buildCardUrl(`${origin}/`, DEMO_ID, DEFAULT_OPTIONS)).toBe(`${origin}/api/${DEMO_ID}`);
    expect(buildCardUrl(origin, DEMO_ID, DEFAULT_OPTIONS, "live")).toBe(`${origin}/live/${DEMO_ID}`);
  });
  it("serializes booleans, colors, transparent backgrounds, and gradients without losing false", () => {
    const options = parseCardOptions({ animated: "false", show_banner: "false", hide_activity: "true", accent: "ec48bd", bg: "transparent", name_gradient: "5865f2-ec48bd", force_gradient: "true" });
    const query = serializeOptions(options);
    expect(Object.fromEntries(query)).toMatchObject({ animated: "false", show_banner: "false", hide_activity: "true", accent: "ec48bd", bg: "transparent", name_gradient: "5865f2-ec48bd", force_gradient: "true" });
    expect(parseCardOptions(query)).toEqual(options);
  });
  it("round-trips unicode and URL punctuation safely", () => {
    const options = parseOptions({ idle_text: 'Liên Thuận & friends ) [ ✦ "<test>"' });
    const url = new URL(buildCardUrl(origin, DEMO_ID, options));
    expect(url.searchParams.get("idle_text")).toBe(options.idle_text);
    expect(url.href).not.toContain(")");
  });
  it("uses the first repeated query value and ignores unknown keys", () => {
    const options = parseCardOptions(new URLSearchParams("width=350&width=500&unknown=test"));
    expect(options.width).toBe(350); expect(serializeOptions(options).has("unknown")).toBe(false);
  });
  it("falls back and clamps using the existing shared parser", () => {
    const options = parseCardOptions({ theme: "missing", width: "900", radius: "-5", accent: "bad-color" });
    expect(options).toMatchObject({ theme: "profile", width: 600, radius: 0, accent: "#5865f2" });
  });
  it.each(Object.values(themes).map((theme) => [theme.name]))("reads theme %s from the registry", (name) => {
    const options = parseCardOptions({ theme: name });
    expect(options.theme).toBe(name);
    expect(new URL(buildCardUrl(origin, DEMO_ID, options)).searchParams.get("theme")).toBe(name === "profile" ? null : name);
    const allowed = new Set(["theme", ...getTheme(name).supportedParams]);
    const changed = parseCardOptions({ theme: name, hide_badges: "true", hide_kv: "true", radius: "24", max_activities: "4" });
    for (const key of serializeOptions(changed).keys()) expect(allowed.has(key as never)).toBe(true);
  });
  it("links Markdown to the Discord user, independent of deployment origin", () => {
    expect(buildEmbed(origin, DEMO_ID, DEFAULT_OPTIONS, size).markdown).toBe(`[![Discord presence](${origin}/api/${DEMO_ID})](https://discord.com/users/${DEMO_ID})`);
  });
  it("escapes HTML attributes and measures the image", () => {
    const embed = buildEmbed(origin, DEMO_ID, parseOptions({ radius: "20", mode: "light" }), size);
    expect(embed.html).toContain("&amp;"); expect(embed.html).toContain('width="420" height="448"');
    expect(embed.html).not.toMatch(/src="[^"]*&radius/);
  });
  it("builds both dark and light picture sources with a fallback image", () => {
    const { picture } = buildEmbed(origin, DEMO_ID, parseOptions({ mode: "light" }), size);
    expect(picture).toContain('(prefers-color-scheme: dark)'); expect(picture).toContain('(prefers-color-scheme: light)');
    expect(picture).toContain(`srcset="${origin}/api/${DEMO_ID}"`);
    expect(picture).toContain(`srcset="${origin}/api/${DEMO_ID}?mode=light"`);
    expect(picture).toContain("<img");
  });
  it("uses the registry's measured height and a source- and origin-checked resize script", () => {
    const options = parseCardOptions({ theme: "compact" });
    const measured = getTheme(options.theme).measure(emptyCardData(DEMO_ID, 0), options);
    const { iframe } = buildEmbed(origin, DEMO_ID, options, measured);
    expect(iframe).toContain(`height="${measured.height}"`); expect(iframe).toContain(`/live/${DEMO_ID}`);
    expect(iframe).toContain('event.origin !== new URL(frame.src).origin'); expect(iframe).toContain("event.source !== frame.contentWindow");
    expect(iframe).toContain('type === "dgp:height"'); expect(iframe).toContain("Number.isFinite(height)");
  });
  it("uses local HTTP origins and deployment path prefixes", () => {
    expect(buildCardUrl("http://localhost:3101", DEMO_ID, DEFAULT_OPTIONS)).toBe(`http://localhost:3101/api/${DEMO_ID}`);
    expect(buildCardUrl(`${origin}/cards`, DEMO_ID, DEFAULT_OPTIONS)).toBe(`${origin}/cards/api/${DEMO_ID}`);
  });
  it.each(["bad", "1", "1234567890123456", "123456789012345678901", "12345678901234567/../../x"])("rejects invalid IDs: %s", (id) => {
    expect(isDiscordId(id)).toBe(false); expect(() => buildCardUrl(origin, id, DEFAULT_OPTIONS)).toThrow();
  });
  it("rejects a non-HTTP site URL", () => {
    expect(() => buildCardUrl("javascript:alert(1)", DEMO_ID, DEFAULT_OPTIONS)).toThrow();
  });
});
