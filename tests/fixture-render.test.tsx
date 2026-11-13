import { describe, expect, it } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { writeFile } from "node:fs/promises";
import { normalize } from "@/lib/lanyard/normalize";
import { parseOptions } from "@/lib/options";
import { renderSvg, renderInlinedSvg } from "@/lib/svg/render";
import { PLACEHOLDER } from "@/lib/svg/assets";
import { getTheme } from "@/card/theme-registry";
import { demoUserPresence, FIXED_NOW, gamePresence, gradientNamePresence, offlinePresence, plainUserPresence, spotifyPresence, streamingPresence, watchingPresence } from "./fixtures";

const fixtures = { demo: demoUserPresence, game: gamePresence, spotify: spotifyPresence, streaming: streamingPresence, watching: watchingPresence, plain: plainUserPresence, gradient: gradientNamePresence, offline: offlinePresence };
describe.each(["dark", "light"] as const)("%s fixture render matrix", (mode) => {
  it.each(Object.entries(fixtures))("renders %s at the narrowest supported width without XML errors", async (name, presence) => {
    const data = normalize(presence, { now: FIXED_NOW });
    const options = parseOptions({ mode, width: "300" });
    const svg = renderSvg(data, options, () => PLACEHOLDER);
    const errors: string[] = [];
    const xml = new DOMParser({ onError: (_level, message) => { errors.push(message); } }).parseFromString(svg, "image/svg+xml");
    expect(errors).toEqual([]);
    expect(xml.documentElement?.getAttribute("width")).toBe("300");
    expect(Number(xml.documentElement?.getAttribute("height"))).toBe(getTheme("profile").measure(data, options).height);
    expect(svg).not.toMatch(/(?:src|href)="https?:/);
    // Opt-in visual artifacts; ordinary CI tests are deterministic and never use the network.
    if (process.env.PHASE1_RENDER_DIR) {
      const real = await renderInlinedSvg(data, options);
      await writeFile(`${process.env.PHASE1_RENDER_DIR}/${name}-${mode}.svg`, real);
    }
  }, 15_000);
});
