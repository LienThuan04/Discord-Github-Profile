import { describe, expect, it } from "vitest";
import { exampleCardFixtures, exampleDefinitions, exampleFixtures, exampleModes, exampleOptions, escapeHtml, showcases } from "../scripts/example-data";
import { getTheme, themes } from "@/card/theme-registry";
import { normalize } from "@/lib/lanyard/normalize";
import { FIXED_NOW } from "./fixtures";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOMParser } from "@xmldom/xmldom";

const directory = join(process.cwd(), "public", "examples");
const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8")) as {
  now: number;
  examples: { file: string; width: number; height: number; bytes: number }[];
};
const definitions = new Map(exampleDefinitions().map((definition) => [definition.file, definition]));
const cardFixtures = exampleCardFixtures();

describe("examples generation inputs", () => {
  it("uses all eight fixtures, both modes and distinct registered themes in showcases", () => {
    expect(Object.keys(exampleFixtures)).toHaveLength(8);
    expect(exampleModes).toEqual(["dark", "light"]);
    expect(showcases).toContainEqual(["activity", "spotify"]);
    expect(showcases).toContainEqual(["activity", "streaming"]);
    expect(showcases).toContainEqual(["nitro", "game"]);
    for (const [theme, fixture] of showcases) {
      const data = normalize(exampleFixtures[fixture], { now: FIXED_NOW });
      expect(data.now).toBe(FIXED_NOW);
      expect(getTheme(theme).name).toBe(theme);
      expect(exampleOptions(theme, "light").theme).toBe(theme);
    }
  });
  it("escapes HTML captions and accepts independent display controls", () => {
    expect(escapeHtml('<img src="x"> & \'')).toBe("&lt;img src=&quot;x&quot;&gt; &amp; &#39;");
    expect(exampleOptions("nitro", "light", { width: "300", animated: "false" })).toMatchObject({ theme: "nitro", mode: "light", width: 300, animated: false });
  });
  it("publishes all default pairs and frozen showcase metadata", () => {
    expect(manifest.now).toBe(FIXED_NOW);
    expect(manifest.examples).toHaveLength(136);
    for (const theme of Object.keys(themes)) for (const mode of exampleModes) {
      expect(manifest.examples.some(({ file }) => file === `${theme}-${mode}.svg`)).toBe(true);
      expect(manifest.examples.some(({ file }) => file === `${theme}-extras-${mode}.svg`)).toBe(true);
    }
  });
  it.each(manifest.examples)("validates the real generated $file artifact", (entry) => {
    const svg = readFileSync(join(directory, entry.file), "utf8");
    const { theme, mode, fixture, query } = definitions.get(entry.file)!;
    expect(getTheme(theme).measure(cardFixtures[fixture]!, exampleOptions(theme, mode, query))).toEqual({ width: entry.width, height: entry.height });
    expect(Buffer.byteLength(svg)).toBe(entry.bytes);
    expect(entry.bytes).toBeLessThan(1_000_000);
    expect(svg).not.toMatch(/(?:src|href)="https?:|url\(["']?https?:/);
    const issues: string[] = [];
    const xml = new DOMParser({ onError: (_level, message) => { issues.push(message); } }).parseFromString(svg, "image/svg+xml");
    expect(issues).toEqual([]);
    expect(xml.documentElement?.getAttribute("width")).toBe(String(entry.width));
    expect(xml.documentElement?.getAttribute("height")).toBe(String(entry.height));
  });
});
