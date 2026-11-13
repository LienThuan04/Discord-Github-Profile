import { describe, expect, it, vi } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { getTheme, themes } from "@/card/theme-registry";
import { badgeColumns, badgeLayout } from "@/card/themes/badge";
import { normalize } from "@/lib/lanyard/normalize";
import { renderSvg, renderInlinedSvg } from "@/lib/svg/render";
import { PLACEHOLDER, type InlineOptions } from "@/lib/svg/assets";
import { exampleFixtures, exampleModes, exampleOptions } from "../scripts/example-data";
import { FIXED_NOW, gamePresence, plainUserPresence, spotifyPresence, streamingPresence } from "./fixtures";

const inlineOptions: InlineOptions = {
  lookup: async () => [{ address: "8.8.8.8", family: 4 }],
  download: async () => ({ mime: "image/png", bytes: Buffer.from(PLACEHOLDER.split(",")[1]!, "base64") }),
};
const error = { title: "User not monitored", message: "Join the Lanyard Discord server to share your presence." };

describe.each(Object.keys(themes))("%s theme", (name) => {
  const theme = getTheme(name);
  it.each(exampleModes)("renders a self-contained %s error card with measured dimensions", async (mode) => {
    const data = normalize(gamePresence, { now: FIXED_NOW });
    const options = exampleOptions(name, mode);
    const svg = await renderInlinedSvg(data, options, error, inlineOptions);
    const size = theme.measure(data, options, error);
    expect(svg).toContain(`width="${size.width}" height="${size.height}"`);
    expect(svg).toContain(error.title);
    expect(svg).not.toMatch(/(?:src|href)="https?:|url\(["']?https?:/);
  });
  it("measures deterministically across widths, modes, hides, long text, offline and errors", () => {
    for (const presence of Object.values(exampleFixtures)) for (const width of ["300", "420", "600"]) for (const mode of exampleModes) {
      const data = normalize(presence, { now: FIXED_NOW });
      const options = exampleOptions(name, mode, { width });
      const before = JSON.stringify({ data, options });
      for (const e of [undefined, error]) {
        const size = theme.measure(data, options, e);
        expect(theme.measure(data, options, e)).toEqual(size);
        expect(Number.isInteger(size.width) && Number.isInteger(size.height)).toBe(true);
        expect(size.width).toBeGreaterThan(24);
        expect(size.height).toBeGreaterThanOrEqual(28);
        const hidden = { ...options, hide_activity: true, hide_spotify: true, hide_custom_status: true, hide_kv: true, hide_platforms: true };
        expect(theme.measure(data, hidden, e)).toEqual(theme.measure(data, hidden, e));
      }
      expect(JSON.stringify({ data, options })).toBe(before);
    }
    const longData = normalize({ ...gamePresence, discord_user: { ...gamePresence.discord_user, global_name: "Very long LiênThuận <&> ".repeat(20) } }, { now: FIXED_NOW });
    const svg = renderSvg(longData, exampleOptions(name, "light", { width: "300", idle_text: "A long quiet moment ".repeat(20) }), () => PLACEHOLDER);
    expect(svg).not.toContain("<script");
    expect(Buffer.byteLength(svg)).toBeLessThan(1_000_000);
  });
  it("respects animated=false for images, decoration, emoji and clocks", () => {
    const data = normalize(spotifyPresence, { now: FIXED_NOW });
    const urls: string[] = [];
    const svg = renderSvg(data, exampleOptions(name, "dark", { animated: "false" }), (url) => { urls.push(url); return PLACEHOLDER; });
    expect(urls.join(" ")).not.toMatch(/animated=true|\.gif(?:\?|$)|\.webm/);
    expect(svg).not.toContain('class="clock-reel"');
    expect(svg).not.toContain('class="display-name name-effect"');
    expect(svg).not.toContain("dgp-nitro dark motion");
  });
  it("removes status, custom status, activity and Spotify content through their hide controls", () => {
    const opts = exampleOptions(name, "dark", { hide_status: "true", hide_custom_status: "true", hide_activity: "true", hide_spotify: "true" });
    const svg = renderSvg(normalize(spotifyPresence, { now: FIXED_NOW }), opts, () => PLACEHOLDER);
    expect(svg).not.toMatch(/class="(?:status-dot|mini-dot|badge-dot) /);
    expect(svg).not.toContain("Never Gonna Give You Up");
    const game = renderSvg(normalize(gamePresence, { now: FIXED_NOW }), opts, () => PLACEHOLDER);
    expect(game).not.toContain("Editing normalize.ts");
    expect(game).not.toContain("Shipping Phase 1");
  });
  it("renders the same pure component for the live target", () => {
    const data = normalize(gamePresence, { now: FIXED_NOW });
    const Card = theme.Component;
    const markup = renderToStaticMarkup(<Card data={data} options={exampleOptions(name, "light", { animated: "false" })} target="live" assets={() => PLACEHOLDER} />);
    expect(markup).toContain(`dgp-${name}`);
    expect(markup).not.toContain("https://cdn.discordapp.com");
  });
});

describe.each(Object.keys(themes))("%s complete fixture smoke matrix", (theme) => {
  describe.each(exampleModes)("%s", (mode) => {
    it.each(Object.entries(exampleFixtures))("inlines %s and matches measure exactly", async (_fixture, presence) => {
      const data = normalize(presence, { now: FIXED_NOW });
      const options = exampleOptions(theme, mode);
      const svg = await renderInlinedSvg(data, options, undefined, inlineOptions);
      const issues: string[] = [];
      const xml = new DOMParser({ onError: (level, message) => { issues.push(`${level}: ${message}`); } }).parseFromString(svg, "image/svg+xml");
      expect(issues).toEqual([]);
      const size = getTheme(theme).measure(data, options);
      expect(xml.documentElement?.getAttribute("width")).toBe(String(size.width));
      expect(xml.documentElement?.getAttribute("height")).toBe(String(size.height));
      expect(svg).not.toMatch(/(?:src|href)="https?:|url\(["']?https?:/);
      expect(Buffer.byteLength(svg)).toBeLessThan(1_000_000);
      for (const img of Array.from(xml.getElementsByTagName("img"))) expect(img.getAttribute("src")).toMatch(/^data:image\//);
    });
  });
});

describe("theme size and selection decisions", () => {
  const plain = normalize(plainUserPresence, { now: FIXED_NOW });
  it("enforces the member, compact and badge footprints", () => {
    expect(getTheme("member").measure(plain, exampleOptions("member", "dark", { width: "300" }))).toEqual({ width: 360, height: 96 });
    expect(getTheme("member").measure(plain, exampleOptions("member", "dark", { width: "600" }))).toEqual({ width: 420, height: 96 });
    expect(getTheme("compact").measure(plain, exampleOptions("compact", "dark"))).toEqual({ width: 420, height: 68 });
    expect(getTheme("badge").measure(plain, exampleOptions("badge", "dark"))).toEqual({ width: 86, height: 32 });
    expect(badgeColumns("LiênThuận")).toBe(9);
    expect(badgeColumns("e\u0301")).toBe(1);
    expect(badgeColumns("🔥")).toBe(2);
  });
  it.each(["badge", "compact", "member"])("uses static, small assets in %s even with animated=true", (theme) => {
    const data = normalize(gamePresence, { now: FIXED_NOW });
    const urls: string[] = [];
    renderSvg(data, exampleOptions(theme, "dark"), (url) => { urls.push(url); return PLACEHOLDER; });
    expect(urls.join(" ")).not.toMatch(/animated=true|\.gif(?:\?|$)|\.webm/);
    expect(urls.some((url) => url.includes("avatar-decoration") && url.includes("size=96"))).toBe(theme === "member");
  });
  it("fits badge text deterministically, truncates long statuses, and uses avatars only when custom", () => {
    const options = exampleOptions("badge", "dark");
    const data = { ...plain, customStatus: { text: "x".repeat(120), emoji: null } };
    expect(badgeLayout(data, options).text).toHaveLength(48);
    expect(badgeLayout(data, options).avatar).toBe(false);
    expect(badgeLayout(data, options).width).toBe(388);
  });
  it("collapses the profile artwork column and vertical space when no image is available", () => {
    const data = normalize(streamingPresence, { now: FIXED_NOW });
    const noArt = { ...data, activities: data.activities.map((a) => ({ ...a, largeImage: null, smallImage: null, appIcon: null })) };
    const options = exampleOptions("profile", "dark");
    const svg = renderSvg(noArt, options, () => PLACEHOLDER);
    expect(svg).not.toContain('class="activity-art"');
    expect(getTheme("profile").measure(noArt, options).height).toBeLessThan(getTheme("profile").measure(data, options).height);
  });
  it("renders snapshot progress clocks in the larger activity compositions", () => {
    const data = normalize(spotifyPresence, { now: FIXED_NOW });
    for (const theme of ["nitro", "glass", "activity"]) {
      const svg = renderSvg(data, exampleOptions(theme, "dark"), () => PLACEHOLDER);
      expect(svg).toContain("1:23");
      expect(svg).toContain("3:30");
      expect(svg).toContain('class="clock-reel"');
    }
  });
  it("collects secondary artwork even when the prefetch pass supplies transparent placeholders", () => {
    const data = normalize(gamePresence, { now: FIXED_NOW });
    const urls: string[] = [];
    renderSvg(data, exampleOptions("profile", "dark"), (url) => { urls.push(url); return PLACEHOLDER; });
    expect(urls).toContain(data.activities[0]!.smallImage!.url);
  });
  it("collapses failed artwork columns and gives the activity showcase a deliberate fallback", () => {
    const data = normalize(streamingPresence, { now: FIXED_NOW });
    const profile = renderSvg(data, exampleOptions("profile", "dark"), () => PLACEHOLDER);
    expect(profile).not.toContain('class="activity-art"');
    const activity = renderSvg(data, exampleOptions("activity", "dark"), () => PLACEHOLDER);
    expect(activity).toContain('class="stage-fallback"');
    expect(activity).not.toContain("&amp;nbsp;");
    const game = normalize(gamePresence, { now: FIXED_NOW });
    const gameSvg = renderSvg(game, exampleOptions("profile", "dark"), (url) =>
      url.includes("1359298108856729682") ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEElEQVR4nGNgYGD4z4AEAAUAAf9X5rYAAAAASUVORK5CYII=" : PLACEHOLDER,
    );
    expect(gameSvg).not.toContain('class="small-art"');
    const spotify = renderSvg(normalize(spotifyPresence, { now: FIXED_NOW }), exampleOptions("profile", "dark"), () => PLACEHOLDER);
    expect(spotify).toContain('class="art-placeholder"');
  });
  it("shows legacy discriminator tags across identity themes when discriminator is non-zero", () => {
    const legacy = normalize({ ...plainUserPresence, discord_user: { ...plainUserPresence.discord_user, username: "legacy", discriminator: "1337" } }, { now: FIXED_NOW });
    for (const theme of ["profile", "nitro", "activity", "glass"]) {
      const svg = renderSvg(legacy, exampleOptions(theme, "dark"), () => PLACEHOLDER);
      expect(svg).toContain("legacy#1337");
    }
  });
  it("measures from the supplied snapshot without consulting wall time", () => {
    const data = normalize(gamePresence, { now: FIXED_NOW });
    const now = vi.spyOn(Date, "now").mockImplementation(() => { throw new Error("Implicit clock"); });
    try { for (const [name, theme] of Object.entries(themes)) expect(theme.measure(data, exampleOptions(name, "dark")).height).toBeGreaterThan(0); }
    finally { now.mockRestore(); }
  });
});
