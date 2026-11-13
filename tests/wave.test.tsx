import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { DOMParser } from "@xmldom/xmldom";
import { waveLayout, waveTheme } from "@/card/themes/wave";
import { contrastRatio, resolveWaveColor, waveTextColor } from "@/card/parts/wave-color";
import { parseOptions, type CardOptions, type QueryInput } from "@/lib/options";
import { normalize } from "@/lib/lanyard/normalize";
import { PLACEHOLDER } from "@/lib/svg/assets";
import type { CardData } from "@/lib/lanyard/card-data";
import type { AssetResolver } from "@/card/types";
import { exampleCardFixtures } from "../scripts/example-data";
import { FIXED_NOW, gamePresence, offlinePresence, spotifyPresence } from "./fixtures";

const options = (extra: QueryInput = {}): CardOptions => ({ ...parseOptions({ theme: "wave", ...extra }), wave_color: "auto", ignore_app_id: "", ...Object.fromEntries(Object.entries(extra).map(([key, value]) => [key, key.startsWith("hide_") ? value === "true" : value])) }) as CardOptions;
const game = () => normalize(gamePresence, { now: FIXED_NOW });
const spotify = () => normalize(spotifyPresence, { now: FIXED_NOW });
const idle = () => normalize(offlinePresence, { now: FIXED_NOW });
const render = (data: CardData, opts = options(), assets: AssetResolver = () => PLACEHOLDER) => renderToStaticMarkup(<waveTheme.Component data={data} options={opts} assets={assets} target="svg" />);

describe("wave panel color", () => {
  it("prioritizes custom fill, Spotify, exact app brand, then activity art", () => {
    expect(resolveWaveColor(spotify(), options()).color).toBe("#1db954");
    expect(resolveWaveColor(spotify(), options({ wave_color: "#ffffff" })).color).toBe("#ffffff");
    const d = { ...game(), spotify: null };
    d.activities[0] = { ...d.activities[0]!, name: "Discord" };
    expect(resolveWaveColor(d, options()).color).toBe("#5865f2");
    d.activities[0] = { ...d.activities[0]!, name: "Discord impostor" };
    expect(resolveWaveColor(d, options()).kind).toBe("art");
    expect(resolveWaveColor(d, options()).image).toBe(d.activities[0]!.largeImage?.url);
  });

  it("does not expose hidden activity colors or art", () => {
    const d = { ...spotify(), activities: game().activities, profile: { ...exampleCardFixtures().profile!.profile!, bannerColor: "#8b6dd8" } };
    expect(resolveWaveColor(d, options({ hide_spotify: "true", hide_activity: "true" }))).toMatchObject({ color: "#8b6dd8", image: null });
    expect(resolveWaveColor(d, options({ hide_spotify: "true" })).kind).toBe("brand");
  });

  it("falls back from idle profile banner to KV accent and explicit accent", () => {
    expect(resolveWaveColor({ ...idle(), profile: { ...exampleCardFixtures().profile!.profile!, bannerColor: "#8b6dd8" } }, options()).color).toBe("#8b6dd8");
    expect(resolveWaveColor({ ...idle(), kv: { ...idle().kv, accent: "#ff8800" } }, options()).color).toBe("#ff8800");
    expect(resolveWaveColor(idle(), options({ accent: "#123456" })).color).toBe("#123456");
  });

  it.each(["#ffffff", "#f5e663", "#000000"])("uses AA text on the light or dark fill %s", (fill) => {
    expect(contrastRatio(fill, waveTextColor(fill))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["#1db954", "#5865f2", "#888888", "#8b6dd8", "#ff5f9e"])("keeps the original card's white text on the mid-tone fill %s", (fill) => {
    expect(waveTextColor(fill)).toBe("#ffffff");
    expect(contrastRatio(fill, "#ffffff")).toBeGreaterThanOrEqual(2.4);
  });

  it("uses dark text on white and yellow", () => {
    expect(waveTextColor("#ffffff")).toBe("#000000");
    expect(waveTextColor("#f5e663")).toBe("#000000");
  });

  it.each([["YouTube", "#ff0000"], ["YouTube Music", "#ff0000"], ["Twitch", "#9146ff"], ["Visual Studio Code", "#007acc"], ["Visual Studio", "#5c2d91"], ["Crunchyroll", "#f47521"], ["Netflix", "#e50914"], ["Apple Music", "#fa243c"], ["SoundCloud", "#ff5500"]])("maps the well-known app %s to its brand color", (name, color) => {
    const d = { ...game(), spotify: null };
    d.activities[0] = { ...d.activities[0]!, name };
    expect(resolveWaveColor(d, options())).toMatchObject({ kind: "brand", color, image: null });
    expect(contrastRatio(color, waveTextColor(color))).toBeGreaterThanOrEqual(2.4);
  });

  it("falls back to the accent when an idle profile has no banner color", () => {
    expect(resolveWaveColor({ ...idle(), profile: null }, options()).color).toBe("#5865f2");
  });
});

describe("wave live color transition", () => {
  it("fades panel color only on live cards, regardless of the decorative drift, inside reduced-motion guards", () => {
    const live = (animated: boolean) => renderToStaticMarkup(<waveTheme.Component data={spotify()} options={{ ...options(), animated }} assets={() => PLACEHOLDER} target="live" />);
    for (const markup of [live(true), live(false)]) expect(markup).toMatch(/@media \(prefers-reduced-motion: no-preference\)\{[^}]*\.wave-live \.wave-panel-surface\{transition:background-color/);
    expect(live(false)).not.toContain("@keyframes dgp-wave-drift");
    expect(render(spotify())).not.toContain("transition:background-color");
  });
});

describe("wave theme composition", () => {
  it("shares exact border-box dimensions with every fixture, mode and width", () => {
    for (const data of Object.values(exampleCardFixtures())) for (const mode of ["dark", "light"]) for (const width of [300, 420, 600]) {
      const opts = { ...options(), mode, width } as CardOptions;
      const size = waveTheme.measure(data, opts);
      const markup = render(data, opts);
      expect(markup).toContain(`width:${size.width}px;height:${size.height}px`);
      expect(waveLayout(data, opts).height).toBe(size.height);
      const issues: string[] = [];
      new DOMParser({ onError: (level, message) => { issues.push(`${level}: ${message}`); } }).parseFromString(`<div xmlns="http://www.w3.org/1999/xhtml">${markup}</div>`, "application/xml");
      expect(issues).toEqual([]);
      expect(markup).not.toMatch(/(?:src|href)="https?:|url\(["']?https?:/);
      expect(Buffer.byteLength(markup)).toBeLessThan(1_000_000);
    }
  });

  it("makes Spotify primary, followed by the capped non-Spotify rows", () => {
    const d = { ...spotify(), activities: Array.from({ length: 4 }, (_, n) => ({ ...game().activities[0]!, key: `row-${n}`, name: `Other ${n}` })) };
    expect(waveLayout(d, options()).rows).toHaveLength(2);
    const markup = render(d);
    expect(markup.indexOf("Listening to Spotify")).toBeLessThan(markup.indexOf("Other 0"));
    expect(markup).toContain("Other 1");
    expect(markup).not.toContain("Other 2");
    expect(waveLayout(d, options({ hide_spotify: "true" })).rows).toHaveLength(1);
  });

  it("honors hides, idle text, exact error dimensions and animated wave motion gates", () => {
    const opts = options({ hide_spotify: "true", hide_activity: "true", hide_timestamps: "true", hide_custom_status: "true", hide_badges: "true", hide_tag: "true", hide_kv: "true", hide_platforms: "true", idle_text: "A calm pond" });
    const markup = render(spotify(), opts);
    expect(markup).toContain("A calm pond");
    expect(markup).not.toContain("Listening to Spotify");
    expect(markup).not.toContain("class=\"presence-timer\"");
    const error = { title: "Unavailable", message: "Try again later." };
    const size = waveTheme.measure(idle(), options(), error);
    expect(renderToStaticMarkup(<waveTheme.Component data={idle()} options={options()} assets={() => PLACEHOLDER} error={error} />)).toContain(`height:${size.height}px`);
    expect(render(spotify())).toContain("prefers-reduced-motion: no-preference");
    expect(render(spotify())).toContain("@keyframes dgp-wave-drift");
    expect(render(spotify(), { ...options(), animated: false })).not.toContain("@keyframes dgp-wave-drift");
  });

  it("resolves all visible artwork including small activity art and blurred panel art", () => {
    const d = { ...game(), spotify: null };
    d.activities[0] = { ...d.activities[0]!, name: "Unknown game" };
    const seen: string[] = [];
    const markup = render(d, options(), (url) => { seen.push(url); return "data:image/png;base64,AAAA"; });
    expect(seen).toContain(d.user.avatar.static);
    expect(seen).toContain(d.activities[0]!.largeImage!.url);
    expect(seen).toContain(d.activities[0]!.smallImage!.url);
    expect(markup).toContain("wave-art-backdrop");
    expect(markup).toContain("rgba(6,9,17,.8)");
  });
});
