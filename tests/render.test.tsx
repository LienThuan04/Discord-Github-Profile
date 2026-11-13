import { describe, expect, it } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { normalize } from "@/lib/lanyard/normalize";
import { parseOptions } from "@/lib/options";
import { getTheme } from "@/card/theme-registry";
import { renderSvg } from "@/lib/svg/render";
import { PLACEHOLDER } from "@/lib/svg/assets";
import { demoUserPresence, FIXED_NOW, gamePresence, gradientNamePresence, plainUserPresence, spotifyPresence } from "./fixtures";

describe("profile measurement and SVG rendering", () => {
  it("measures visible sections deterministically, including hides and error state", () => {
    const theme = getTheme("profile");
    const data = normalize(gamePresence, { now: FIXED_NOW });
    const options = parseOptions();
    const full = theme.measure(data, options);
    expect(full.width).toBe(420);
    expect(full.height).toBeGreaterThan(400);
    expect(theme.measure(data, { ...options, hide_activity: true }).height).toBeLessThan(full.height);
    expect(theme.measure(data, { ...options, hide_kv: true }).height).toBeLessThan(full.height);
    expect(theme.measure(data, options)).toEqual(full);
  });
  it.each(["dark", "light"] as const)("renders escaped self-contained %s SVG with exact dimensions", (mode) => {
    const data = normalize({ ...demoUserPresence, discord_user: { ...demoUserPresence.discord_user, global_name: "LiênThuận <script>&" } }, { now: FIXED_NOW });
    const options = parseOptions({ mode });
    const result = renderSvg(data, options, () => PLACEHOLDER);
    const size = getTheme("profile").measure(data, options);
    expect(result).toContain(`width="${size.width}" height="${size.height}"`);
    expect(result).toContain('xmlns="http://www.w3.org/1999/xhtml"');
    expect(result).toContain("LiênThuận &lt;script&gt;&amp;");
    expect(result).not.toMatch(/(?:src|href)="https?:/);
    expect(result).not.toContain("<script>");
    expect(result.length).toBeLessThan(150_000);
    const issues: string[] = [];
    const xml = new DOMParser({ onError: (level, message) => { issues.push(`${level}: ${message}`); } }).parseFromString(result, "image/svg+xml");
    expect(issues).toEqual([]);
    expect(xml.documentElement?.localName).toBe("svg");
  });
  it("renders Spotify reels and progress from one snapshot and respects animated=false", () => {
    const data = normalize(spotifyPresence, { now: FIXED_NOW });
    const running = renderSvg(data, parseOptions(), () => PLACEHOLDER);
    expect(running).toContain("1:23");
    expect(running).toContain("3:30");
    expect(running).toContain("steps(");
    expect(running).toContain("-83.4s");
    const still = renderSvg(data, parseOptions({ animated: "false" }), () => PLACEHOLDER);
    expect(still).not.toContain('class="clock-reel"');
    expect(still).toContain("1:23");
  });
  it("uses every image through the resolver and hide toggles remove sections", () => {
    const urls = new Set<string>();
    const data = normalize(gradientNamePresence, { now: FIXED_NOW });
    const svg = renderSvg(data, parseOptions({ hide_custom_status: "true", hide_tag: "true", hide_nameplate: "true", hide_decoration: "true" }), (url) => { urls.add(url); return PLACEHOLDER; });
    expect([...urls]).toHaveLength(1);
    expect(svg).not.toContain("Gradient energy");
    const plain = renderSvg(normalize(plainUserPresence, { now: FIXED_NOW }), parseOptions(), () => PLACEHOLDER);
    expect(plain).toContain("Enjoying a quiet moment");
  });
  it("hides all status indicators when hide_status is enabled", () => {
    const data = normalize(plainUserPresence, { now: FIXED_NOW });
    const svg = renderSvg(data, parseOptions({ hide_status: "true" }), () => PLACEHOLDER);
    expect(svg).not.toContain('class="status-dot');
    expect(svg).not.toContain('class="mini-dot');
    expect(svg).toContain("Discord presence · Powered by Lanyard");
  });
  it("gives nested platform icons the SVG namespace inside XHTML", () => {
    const svg = renderSvg(normalize(plainUserPresence, { now: FIXED_NOW }), parseOptions(), () => PLACEHOLDER);
    const xml = new DOMParser().parseFromString(svg, "image/svg+xml");
    const icons = Array.from(xml.getElementsByTagName("svg"));
    expect(icons.length).toBeGreaterThan(1);
    expect(icons.every((icon) => icon.namespaceURI === "http://www.w3.org/2000/svg")).toBe(true);
  });
});
