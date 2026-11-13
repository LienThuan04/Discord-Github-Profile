import { DOMParser } from "@xmldom/xmldom";
import type { CardSize } from "../src/card/types";

/** Fail generation before publishing broken, network-dependent or oversized Camo images. */
export function validateExampleSvg(svg: string, expected: CardSize, file: string): number {
  const bytes = Buffer.byteLength(svg);
  if (bytes >= 1_000_000) throw new Error(`SVG exceeds 1 MB: ${file} (${bytes} bytes)`);
  const issues: string[] = [];
  const xml = new DOMParser({ onError: (_level, message) => { issues.push(message); } }).parseFromString(svg, "image/svg+xml");
  if (issues.length) throw new Error(`Invalid example XML: ${file}: ${issues.join("; ")}`);
  const root = xml.documentElement;
  if (root?.nodeName !== "svg" || root.getAttribute("width") !== String(expected.width) || root.getAttribute("height") !== String(expected.height) || root.getAttribute("viewBox") !== `0 0 ${expected.width} ${expected.height}`) {
    throw new Error(`Example dimensions disagree with measure(): ${file}`);
  }
  // Parse CSS after XML entity decoding: style attributes may contain &quot; around a URL.
  const checkCss = (css: string) => {
    if (/@import\b/i.test(css)) throw new Error(`Remote example CSS: ${file}`);
    for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)) {
      if (!/^(?:data:image\/|#)/i.test((match[1] ?? match[2] ?? match[3] ?? "").trim())) throw new Error(`Remote example CSS: ${file}`);
    }
  };
  // Namespace identifiers are not fetches. Every actual image URL must stand alone.
  for (const element of Array.from(xml.getElementsByTagName("*"))) {
    for (const attribute of Array.from(element.attributes)) {
      if (/^(?:src|href|xlink:href|poster|srcset)$/i.test(attribute.name) && !/^(?:data:image\/|#)/i.test(attribute.value.trim())) throw new Error(`Remote example resource: ${file}`);
      if (attribute.name === "style") checkCss(attribute.value);
    }
    if (element.nodeName === "style") checkCss(element.textContent ?? "");
  }
  return bytes;
}
