import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { DOMParser } from "@xmldom/xmldom";
import { getTheme } from "@/card/theme-registry";
import { directAssets } from "@/card/types";
import { parseOptions } from "@/lib/options";
import { frameCardData } from "./fixtures/profile-extras";

const render = (theme: string) => {
  const definition = getTheme(theme), options = parseOptions({ theme });
  const markup = renderToStaticMarkup(<definition.Component data={frameCardData()} options={options} assets={directAssets} target="svg" />);
  return new DOMParser().parseFromString(`<html><head></head><body>${markup}</body></html>`, "text/html");
};
const elements = (theme: string) => Array.from(render(theme).getElementsByTagName("*"));

it.each(["chat", "banner", "badge", "compact", "member"])("keeps full-strength %s profile art behind the text", (theme) => {
  const effect = elements(theme).find((node) => node.getAttribute("class")?.split(" ").includes("pf-effect"))!;
  expect(effect.getAttribute("class")?.split(" ")).toContain("pf-underlay");
  expect(effect.getAttribute("style") ?? "").not.toMatch(/opacity|mask/);
});

it.each(["profile", "nitro", "glass", "neon", "voice", "polaroid", "terminal", "retro"])("preserves Discord's overlay on %s", (theme) => {
  const effect = elements(theme).find((node) => node.getAttribute("class")?.split(" ").includes("pf-effect"))!;
  expect(effect.getAttribute("class")?.split(" ")).not.toContain("pf-underlay");
});

it("keeps the badge crown behind the pill while preserving frame geometry", () => {
  const front = elements("badge").find((node) => node.tagName === "img" && node.getAttribute("aria-label")?.includes("purple"))!;
  expect(front.getAttribute("style")).toContain("z-index:0");
  const profileFront = elements("profile").find((node) => node.tagName === "img" && node.getAttribute("aria-label")?.includes("purple"))!;
  expect(profileFront.getAttribute("style")).toContain("z-index:2");
  const data = frameCardData(), options = parseOptions({ theme: "badge" });
  const size = getTheme("badge").measure(data, options);
  const canvas = elements("badge").find((node) => node.getAttribute("class") === "pf-frame-canvas")!;
  expect(canvas.getAttribute("style")).toContain(`width:${size.width}px;height:${size.height}px`);
});
