import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CardStudio } from "@/components/studio/CardStudio";
import { DEMO_ID, parseCardOptions } from "@/lib/embed";
import { demoUserPresence, FIXED_NOW } from "./fixtures";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("app icon", () => {
  it("ships one original, self-contained icon as the favicon and the brand asset", () => {
    const icon = read("public/brand/icon.svg");
    expect(read("src/app/icon.svg")).toBe(icon);
    expect(icon).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 512 512">/);
    expect(icon).not.toMatch(/<image|xlink:href|https?:\/\/(?!www\.w3\.org)/);
  });

  it("uses the icon as every Card Studio brand mark", () => {
    const html = renderToStaticMarkup(<CardStudio initialId={DEMO_ID} initialOptions={parseCardOptions({})} initial={demoUserPresence} initialError={null} initialNow={FIXED_NOW} configuredSiteUrl="" />);
    // Header, hero art window and footer.
    expect(html.match(/src="\/brand\/icon\.svg"/g)?.length).toBe(3);
  });
});
