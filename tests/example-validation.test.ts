import { describe, expect, it } from "vitest";
import { validateExampleSvg } from "../scripts/validate-example";

const dimensions = { width: 420, height: 100 };
const wrap = (body = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="100" viewBox="0 0 420 100">${body}</svg>`;

describe("example publication validation", () => {
  it("rejects a remote CSS image hidden behind XML attribute escaping", () => {
    expect(() => validateExampleSvg(wrap('<g style="background-image:url(&quot;https://example.com/art.png&quot;)"/>'), dimensions, "remote.svg")).toThrow(/Remote/);
  });
  it.each([
    '<image href="//example.com/art.png"/>',
    '<image href=" https://example.com/art.png "/>',
    '<image href="art.png"/>',
    '<style>svg{background:url(https://example.com/art.png)}</style>',
    '<style>@import "https://example.com/style.css";</style>',
  ])("rejects an SVG sub-resource that cannot stand alone: %s", (body) => {
    expect(() => validateExampleSvg(wrap(body), dimensions, "remote.svg")).toThrow(/Remote/);
  });
  it("rejects malformed XML and mismatched canvas dimensions", () => {
    expect(() => validateExampleSvg(wrap("<g>"), dimensions, "broken.svg")).toThrow();
    expect(() => validateExampleSvg(wrap(), { width: 421, height: 100 }, "wrong.svg")).toThrow(/dimensions/);
  });
  it("accepts inline artwork and local SVG fragments, and rejects a 1 MB image", () => {
    const svg = wrap('<image href="data:image/png;base64,YQ=="/><use href="#art"/>');
    expect(validateExampleSvg(svg, dimensions, "inline.svg")).toBe(Buffer.byteLength(svg));
    expect(() => validateExampleSvg(wrap(" ".repeat(1_000_000)), dimensions, "large.svg")).toThrow(/1 MB/);
  });
});
