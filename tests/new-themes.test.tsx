import { describe, expect, it, vi } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { getTheme, themes } from "@/card/theme-registry";
import { bannerLayout } from "@/card/themes/banner";
import { voiceSpeaking } from "@/card/themes/voice";
import { ago, snapshotClock } from "@/card/themes/presence-kit";
import { normalize } from "@/lib/lanyard/normalize";
import { OPTION_NAMES, parseOptions, type CardOptions, type OptionName, type QueryInput } from "@/lib/options";
import { STYLE_PARAMS, STYLE_VALUES, type StyleParam } from "@/lib/style-options";
import { renderInlinedSvg, renderSvg } from "@/lib/svg/render";
import { PLACEHOLDER, type InlineOptions } from "@/lib/svg/assets";
import { exampleFixtures, exampleModes } from "../scripts/example-data";
import { FIXED_NOW, gamePresence, gradientNamePresence, offlinePresence, plainUserPresence, spotifyPresence, watchingPresence } from "./fixtures";

const NEW_THEMES = ["chat", "banner", "terminal", "neon", "retro", "polaroid", "mobile", "voice"] as const;
/** Options parsed with the theme, so theme-aware clamps (banner width) apply exactly as in the API route. */
const opts = (theme: string, mode: "dark" | "light" = "dark", extra: QueryInput = {}): CardOptions => ({ ...parseOptions({ ...extra, theme }), mode }) as CardOptions;
const error = { title: "User not monitored", message: "Join discord.gg/lanyard so the Lanyard bot can share this presence." };
const inlineOptions: InlineOptions = {
  lookup: async () => [{ address: "8.8.8.8", family: 4 }],
  download: async () => ({ mime: "image/png", bytes: Buffer.from(PLACEHOLDER.split(",")[1]!, "base64") }),
};
const data = (presence = gamePresence) => normalize(presence, { now: FIXED_NOW });

function expectValidSvg(svg: string, width: number, height: number) {
  const issues: string[] = [];
  const xml = new DOMParser({ onError: (level, message) => { issues.push(`${level}: ${message}`); } }).parseFromString(svg, "image/svg+xml");
  expect(issues).toEqual([]);
  expect(xml.documentElement?.getAttribute("width")).toBe(String(width));
  expect(xml.documentElement?.getAttribute("height")).toBe(String(height));
  expect(svg).not.toMatch(/(?:src|href)="https?:|url\(["']?https?:/);
  expect(Buffer.byteLength(svg)).toBeLessThan(1_000_000);
  for (const img of Array.from(xml.getElementsByTagName("img"))) expect(img.getAttribute("src")).toMatch(/^data:image\//);
}

const STYLE_AXES: Record<(typeof NEW_THEMES)[number], readonly StyleParam[]> = {
  chat: STYLE_PARAMS, banner: STYLE_PARAMS, neon: STYLE_PARAMS,
  terminal: ["pattern", "effect", "eq_style", "border"],
  retro: ["pattern", "eq_style"],
  polaroid: [],
  mobile: ["pattern", "effect", "eq_style", "font", "border"],
  voice: ["avatar_shape", "pattern", "effect", "eq_style", "font", "border"],
};

/** A non-default value for every option, used to prove that undeclared controls change nothing. */
const ALTERNATES: Partial<Record<OptionName, string>> = {
  accent: "ff3366", bg: "101020", radius: "4", width: "360", animated: "false", max_activities: "1", idle_text: "Custom idle line",
  name_gradient: "ff0000-00ff00", force_gradient: "true", show_banner: "false",
  ...Object.fromEntries(STYLE_PARAMS.map((name) => [name, STYLE_VALUES[name].at(-1)!])),
};

describe.each(NEW_THEMES)("%s theme", (name) => {
  const theme = getTheme(name);

  it("is registered with valid, accurate metadata", () => {
    expect(themes[name]).toBe(theme);
    expect(theme.name).toBe(name);
    expect(theme.label).toMatch(/^[A-Z][a-z]+$/);
    expect(theme.supportedParams).toEqual(expect.arrayContaining(["theme", "mode", "accent", "bg", "idle_text"]));
    expect(new Set(theme.supportedParams).size).toBe(theme.supportedParams.length);
    expect(theme.supportedParams.every((param) => OPTION_NAMES.includes(param))).toBe(true);
    expect(STYLE_PARAMS.filter((param) => theme.supportedParams.includes(param))).toEqual([...STYLE_AXES[name]]);
  });

  it("ignores every control it does not declare", () => {
    const undeclared = OPTION_NAMES.filter((param) => param !== "theme" && param !== "mode" && !theme.supportedParams.includes(param));
    for (const presence of [gamePresence, spotifyPresence, gradientNamePresence]) {
      const d = data(presence);
      const urls: string[] = [];
      const base = renderSvg(d, opts(name), (url) => { urls.push(url); return PLACEHOLDER; });
      for (const param of undeclared) {
        const changed: string[] = [];
        const value = ALTERNATES[param] ?? "true";
        const svg = renderSvg(d, opts(name, "dark", { [param]: value }), (url) => { changed.push(url); return PLACEHOLDER; });
        expect(svg, `${name} must ignore ${param}`).toBe(base);
        expect(changed).toEqual(urls);
      }
    }
  });

  it("measures deterministically across fixtures, widths, modes, hides and errors without a clock", () => {
    const now = vi.spyOn(Date, "now").mockImplementation(() => { throw new Error("Implicit clock"); });
    try {
      for (const presence of Object.values(exampleFixtures)) for (const width of ["300", "420", "600", "800", "1000"]) for (const mode of exampleModes) {
        const d = data(presence);
        const options = opts(name, mode, { width });
        const before = JSON.stringify({ d, options });
        for (const e of [undefined, error]) {
          const size = theme.measure(d, options, e);
          expect(theme.measure(d, options, e)).toEqual(size);
          expect(Number.isInteger(size.width) && Number.isInteger(size.height)).toBe(true);
          expect(size.width).toBeGreaterThanOrEqual(300);
          expect(size.height).toBeGreaterThanOrEqual(116);
          const hidden = { ...options, hide_activity: true, hide_spotify: true, hide_custom_status: true, hide_kv: true, hide_platforms: true, hide_status: true };
          expect(theme.measure(d, hidden, e)).toEqual(theme.measure(d, hidden, e));
        }
        expect(JSON.stringify({ d, options })).toBe(before);
      }
    } finally { now.mockRestore(); }
  });

  describe.each(exampleModes)("%s mode", (mode) => {
    it.each(Object.entries(exampleFixtures))("renders %s self-contained at exactly the measured size", async (_fixture, presence) => {
      const d = data(presence);
      const options = opts(name, mode);
      const svg = await renderInlinedSvg(d, options, undefined, inlineOptions);
      const size = theme.measure(d, options);
      expectValidSvg(svg, size.width, size.height);
      expect(svg).toContain(`dgp-${name} ${mode}`);
    });
    it("renders a themed error card", async () => {
      const d = data();
      const svg = await renderInlinedSvg(d, opts(name, mode), error, inlineOptions);
      const size = theme.measure(d, opts(name, mode), error);
      expectValidSvg(svg, size.width, size.height);
      expect(svg).toContain(error.title);
    });
  });

  it.each(STYLE_AXES[name].flatMap((param) => STYLE_VALUES[param].map((value) => [param, value] as const)))("renders %s=%s without changing the measured size", (param, value) => {
    for (const presence of [spotifyPresence, plainUserPresence]) {
      const d = data(presence);
      const options = opts(name, "light", { [param]: value });
      expect(options[param]).toBe(value);
      const svg = renderSvg(d, options, () => PLACEHOLDER);
      expect(theme.measure(d, options)).toEqual(theme.measure(d, opts(name, "light")));
      const size = theme.measure(d, options);
      expectValidSvg(svg, size.width, size.height);
    }
  });

  it("keeps long Vietnamese names and statuses inside the measured box", () => {
    const long = normalize({ ...gamePresence, discord_user: { ...gamePresence.discord_user, global_name: "LiênThuận ".repeat(12) } }, { now: FIXED_NOW });
    const options = opts(name, "dark", { idle_text: "Một khoảnh khắc yên tĩnh ".repeat(8) });
    const svg = renderSvg(long, options, () => PLACEHOLDER);
    const size = theme.measure(long, options);
    expectValidSvg(svg, size.width, size.height);
    expect(size).toEqual(theme.measure(data(), options));
  });
});

describe("new theme decisions", () => {
  it("gives banner a theme-aware 600–1000px width (default 800) without changing other themes", () => {
    expect(parseOptions({ theme: "banner" }).width).toBe(800);
    expect(parseOptions({ theme: "banner", width: "1000" }).width).toBe(1000);
    expect(parseOptions({ theme: "banner", width: "4000" }).width).toBe(1000);
    expect(parseOptions({ theme: "banner", width: "300" }).width).toBe(600);
    expect(parseOptions({ theme: "banner", width: "junk" }).width).toBe(800);
    expect(parseOptions(new URLSearchParams("theme=banner&width=720")).width).toBe(720);
    expect(parseOptions({ theme: "profile", width: "1000" }).width).toBe(600);
    expect(parseOptions({ width: "1000" }).width).toBe(600);
    // Options parsed without the theme (shared 300–600 clamp) select the banner default.
    expect(bannerLayout({ width: 420 }).width).toBe(800);
    expect(bannerLayout({ width: 600 })).toMatchObject({ width: 600, avatar: 96, panel: 204 });
    expect(getTheme("banner").measure(data(), opts("banner"))).toEqual({ width: 800, height: 200 });
  });

  it("fixes the footprint of the photo, phone and voice tile compositions", () => {
    const d = data();
    expect(getTheme("polaroid").measure(d, opts("polaroid"))).toEqual({ width: 436, height: 532 });
    expect(getTheme("polaroid").measure(d, opts("polaroid", "dark", { width: "300" }))).toEqual({ width: 336, height: 432 });
    expect(getTheme("mobile").measure(d, opts("mobile")).width).toBe(400);
    expect(getTheme("mobile").measure(d, opts("mobile", "dark", { width: "300" })).width).toBe(320);
    expect(getTheme("voice").measure(d, opts("voice"))).toEqual({ width: 420, height: 252 });
  });

  it.each(["chat", "terminal", "retro", "polaroid", "mobile"])("uses static identity art in %s even with animated=true", (name) => {
    const urls: string[] = [];
    renderSvg(data(gradientNamePresence), opts(name), (url) => { urls.push(url); return PLACEHOLDER; });
    expect(urls.join(" ")).not.toMatch(/animated=true|\.gif(?:\?|$)|\.webm/);
  });

  it("requests larger still assets for the polaroid photo", () => {
    const urls: string[] = [];
    renderSvg(data(), opts("polaroid"), (url) => { urls.push(url); return PLACEHOLDER; });
    expect(urls.some((url) => url.includes("/avatars/") && url.includes("size=512"))).toBe(true);
    expect(urls.some((url) => url.includes("avatar-decoration") && url.includes("size=320") && url.includes("passthrough=false"))).toBe(true);
  });

  it("lets an explicit ring replace the neon tube and keeps the voice speaking ring", () => {
    const d = data(plainUserPresence);
    expect(renderSvg(d, opts("neon"), () => PLACEHOLDER)).toContain('class="neon-ring"');
    const dashed = renderSvg(d, opts("neon", "dark", { ring: "dashed" }), () => PLACEHOLDER);
    expect(dashed).not.toContain('class="neon-ring"');
    expect(dashed).toContain("sx-ring-dashed");
    const voice = renderSvg(d, opts("voice", "dark", { ring: "gradient", avatar_shape: "hexagon" }), () => PLACEHOLDER);
    expect(voice).toContain('class="voice-ring"');
    expect(voice).not.toContain("sx-ring-gradient");
    expect(voice).toContain("M50 0L93.3 25V75L50 100L6.7 75V25Z");
  });

  it("shows the equalizer beside Spotify where the theme declares eq_style", () => {
    const d = data(spotifyPresence);
    for (const name of NEW_THEMES) {
      const svg = renderSvg(d, opts(name, "dark", { eq_style: "wave" }), () => PLACEHOLDER);
      expect(svg.includes("sx-eq-wave"), name).toBe(name !== "polaroid");
    }
  });

  it("derives voice speaking, snapshot clocks and relative times from the snapshot only", () => {
    expect(voiceSpeaking(data(plainUserPresence), opts("voice"))).toBe(true);
    expect(voiceSpeaking(data(offlinePresence), opts("voice"))).toBe(false);
    expect(voiceSpeaking(data(watchingPresence), opts("voice"))).toBe(true);
    expect(voiceSpeaking(data(watchingPresence), opts("voice", "dark", { hide_activity: "true" }))).toBe(false);
    expect(snapshotClock(FIXED_NOW)).toEqual({ time: "14:00", date: "Thursday, November 12", stamp: "'26 11 12", zone: "UTC" });
    expect(ago(FIXED_NOW, undefined)).toBe("now");
    expect(ago(FIXED_NOW, FIXED_NOW - 125_000)).toBe("2m ago");
    expect(ago(FIXED_NOW, FIXED_NOW - 3_720_000)).toBe("1h ago");
    expect(ago(FIXED_NOW, FIXED_NOW - 3 * 86_400_000)).toBe("3d ago");
  });

  it("renders the snapshot clock as UTC in chat and mobile", () => {
    expect(renderSvg(data(), opts("chat"), () => PLACEHOLDER)).toContain("Today at 14:00 UTC");
    expect(renderSvg(data(), opts("mobile"), () => PLACEHOLDER)).toContain("Thursday, November 12");
  });
});
