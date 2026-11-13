import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";

function hashes(directory: string, prefix = ""): Record<string, string> {
  return Object.fromEntries(readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = `${prefix}${entry.name}`;
    return entry.isDirectory()
      ? Object.entries(hashes(join(directory, entry.name), `${name}/`))
      : [[name, createHash("sha256").update(readFileSync(join(directory, entry.name))).digest("hex")]];
  }));
}

describe("offline examples command", () => {
  it("regenerates identical, complete, self-contained examples with every network entry point denied", () => {
    const temporary = mkdtempSync(join(tmpdir(), "dgp-examples-"));
    try {
      const generate = (output: string, matrix?: string) => execFileSync(process.execPath, [
        "--import", pathToFileURL(join(process.cwd(), "tests/helpers/deny-network.mjs")).href, "--import", "tsx",
        "scripts/generate-examples.ts", "--out-dir", output, ...(matrix ? ["--matrix-dir", matrix] : []),
      ], { cwd: process.cwd(), encoding: "utf8", timeout: 30_000, windowsHide: true });
      const first = join(temporary, "first");
      const second = join(temporary, "second");
      const matrix = join(temporary, "matrix");
      expect(generate(first)).toContain("Generated 136 examples");
      expect(generate(second, matrix)).toContain("Generated 136 examples and 300 matrix SVGs");
      expect(hashes(first)).toEqual(hashes(second));
      expect(Object.keys(hashes(matrix)).filter((file) => file.endsWith(".svg"))).toHaveLength(300);

      const manifest = JSON.parse(readFileSync(join(first, "manifest.json"), "utf8")) as {
        assets: { loaded: number; requested: number; source: string };
        examples: { file: string; width: number; height: number; bytes: number }[];
      };
      expect(manifest.assets.source).toBe("bundled fixtures");
      expect(manifest.assets.loaded).toBe(manifest.assets.requested);
      expect(manifest.examples).toHaveLength(136);
      const files = manifest.examples.map(({ file }) => file);
      for (const theme of ["profile", "nitro", "member", "compact", "activity", "glass", "badge", "chat", "banner", "terminal", "neon", "retro", "polaroid", "mobile", "voice"]) {
        for (const mode of ["dark", "light"]) {
          expect(files).toContain(`${theme}-${mode}.svg`);
          expect(files).toContain(`${theme}-extras-${mode}.svg`);
        }
      }
      for (const [axis, values] of Object.entries({
        avatar_shape: ["circle", "squircle", "square", "hexagon", "octagon"],
        ring: ["status", "none", "accent", "gradient", "rainbow", "glow", "pulse", "dashed", "double"],
        pattern: ["none", "dots", "grid", "diagonal", "waves", "stars", "circuit", "confetti", "bubbles", "aurora", "noise", "hex"],
        effect: ["none", "float", "shimmer", "glow", "scanline", "sparkle"],
        status_style: ["dot", "pill", "text", "ring"],
        eq_style: ["bars", "wave", "pulse", "dots", "line", "blocks", "mirror", "circle", "spectrum", "none"],
        font: ["default", "rounded", "mono", "serif", "condensed", "display"],
        border: ["subtle", "none", "accent", "gradient", "glow"],
        banner_source: ["auto", "profile", "nameplate", "accent", "none"],
        hide_effect: ["false", "true"], hide_frame: ["false", "true"],
      })) for (const value of values) expect(files).toContain(`styles/${axis}-${value}.svg`);
      for (const entry of manifest.examples) {
        const svg = readFileSync(join(first, entry.file), "utf8");
        expect(Buffer.byteLength(svg), entry.file).toBe(entry.bytes);
        expect(entry.bytes, entry.file).toBeLessThan(1_000_000);
        expect(svg, entry.file).not.toMatch(/(?:src|href)=["'](?:https?:|\/\/)|url\(["']?(?:https?:|\/\/)/i);
        const issues: string[] = [];
        const xml = new DOMParser({ onError: (_level, message) => { issues.push(message); } }).parseFromString(svg, "image/svg+xml");
        expect(issues, entry.file).toEqual([]);
        expect(xml.documentElement?.getAttribute("width"), entry.file).toBe(String(entry.width));
        expect(xml.documentElement?.getAttribute("height"), entry.file).toBe(String(entry.height));
        expect(xml.documentElement?.getAttribute("viewBox"), entry.file).toBe(`0 0 ${entry.width} ${entry.height}`);
      }
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  }, 60_000);
});
