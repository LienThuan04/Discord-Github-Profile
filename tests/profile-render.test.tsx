import { describe, expect, it } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { themes } from "@/card/theme-registry";
import { parseOptions } from "@/lib/options";
import { normalize } from "@/lib/lanyard/normalize";
import { renderInlinedSvg } from "@/lib/svg/render";
import { readFileSync } from "node:fs";
const pixel = readFileSync(new URL("./fixtures/profile-pixel.png", import.meta.url));
import { CardStudio } from "@/components/studio/CardStudio";
import { exampleFixtures } from "../scripts/example-data";
import { FIXED_NOW, demoUserPresence } from "./fixtures";
import { profileCardData, frameCardData } from "./fixtures/profile-extras";

const data = { ...Object.fromEntries(Object.entries(exampleFixtures).map(([name, p]) => [name, normalize(p, { now: FIXED_NOW })])), profile: profileCardData(), frame: frameCardData() };
describe.each(Object.values(themes))("$name profile matrix", (theme) => {
  it.each(Object.entries(data).flatMap(([fixture, card]) => (["dark", "light"] as const).map((mode) => ({ fixture, card, mode }))))("renders $fixture / $mode with inlined assets and exact dimensions", async ({ card, mode }) => {
    const options = parseOptions({ theme: theme.name, mode });
    const svg = await renderInlinedSvg(card, options, undefined, {
      lookup: async () => [{ address: "8.8.8.8", family: 4 }],
      download: async () => ({ mime: "image/png", bytes: pixel }),
    });
    const issues: string[] = [];
    const xml = new DOMParser({ onError: (_level, message) => issues.push(message) }).parseFromString(svg, "image/svg+xml");
    expect(issues).toEqual([]);
    const size = theme.measure(card, options);
    expect(xml.documentElement?.getAttribute("width")).toBe(String(size.width));
    expect(xml.documentElement?.getAttribute("height")).toBe(String(size.height));
    expect(svg).not.toMatch(/(?:src|href)="https?:|url\(["']?https?:/);
    expect(Buffer.byteLength(svg)).toBeLessThan(1_000_000);
    if (card.profile && theme.supportedParams.includes("hide_effect")) expect(svg).toContain('aria-label="Profile effect: Sample petals"');
  });
});
describe("Studio profile controls", () => {
  const render = (theme: string) => renderToStaticMarkup(<CardStudio initialId="983724520789655613" initialOptions={parseOptions({ theme, banner_source: "profile", hide_effect: "true", tz: "Asia/Ho_Chi_Minh" })} initial={demoUserPresence} initialError={null} initialNow={FIXED_NOW} configuredSiteUrl="https://cards.example" />);
  it("shows source/effect controls only when supported", () => {
    expect(render("profile")).toContain('id="option-banner_source"');
    expect(render("profile")).toContain("Profile effect");
    expect(render("badge")).toContain('id="option-banner_source"');
    expect(render("badge")).toContain("Profile effect");
    expect(render("profile")).not.toContain('id="option-tz"');
    expect(render("chat")).toContain('id="option-tz"');
  });
  it("uses the banner width range and reflects URL state", () => {
    expect(render("banner")).toMatch(/id="option-width"[^>]*min="600"[^>]*max="1000"[^>]*value="800"/);
    expect(render("profile")).toContain('<option value="profile" selected="">');
  });
});
