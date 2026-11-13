import { expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { DOMParser } from "@xmldom/xmldom";
import { normalize } from "@/lib/lanyard/normalize";
import { parseOptions } from "@/lib/options";
import { renderSvg } from "@/lib/svg/render";
import { PLACEHOLDER } from "@/lib/svg/assets";
import { FIXED_NOW, plainUserPresence } from "./fixtures";

it("removes XML-forbidden controls and lone surrogates from all rendered text", () => {
  const data = normalize({ ...plainUserPresence, discord_user: { ...plainUserPresence.discord_user, global_name: "Liên\u0000Thuận\uffff\ud800" } }, { now: FIXED_NOW });
  const svg = renderSvg(data, parseOptions({ idle_text: "hello\u0000world" }), () => PLACEHOLDER);
  expect(svg).not.toMatch(/[\u0000\uffff\ud800]/);
  expect(svg).toContain("helloworld");
  const issues: string[] = [];
  new DOMParser({ onError: (_level, message) => { issues.push(message); } }).parseFromString(svg, "image/svg+xml");
  expect(issues).toEqual([]);
});
it("uses a valid transparent PNG as the local failure placeholder", () => {
  const png = Buffer.from(PLACEHOLDER.split(",")[1]!, "base64");
  const chunks: Buffer[] = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    if (png.subarray(at + 4, at + 8).toString() === "IDAT") chunks.push(png.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  // RGBA PNG, one filter byte followed by a transparent pixel.
  expect(inflateSync(Buffer.concat(chunks))).toEqual(Buffer.from([0, 0, 0, 0, 0]));
});
