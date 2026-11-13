import { getTheme } from "@/card/theme-registry";
import type { CardSize } from "@/card/types";
import { OPTION_NAMES, parseOptions, type CardOptions, type OptionName, type QueryInput } from "./options";
import { STYLE_PARAMS, type StyleParam } from "./style-options";

export const DEMO_ID = "983724520789655613";
export const DEFAULT_OPTIONS = parseOptions();
export const isDiscordId = (id: string) => /^\d{17,20}$/.test(id);

/** Reuse the shared validator and resolve names through the runtime registry, so independently
 * registered themes appear in Studio and /live as soon as they land. */
export function parseCardOptions(input: QueryInput = {}): CardOptions {
  const options = parseOptions(input);
  return { ...options, theme: getTheme(options.theme).name } as CardOptions;
}

/** Stable, shareable query strings, limited to the selected theme's supported controls. */
export function serializeOptions(options: CardOptions): URLSearchParams {
  const params = new URLSearchParams();
  const theme = getTheme(options.theme);
  const allowed = new Set(["theme", ...theme.supportedParams]);
  const defaults = parseOptions({ theme: theme.name });
  for (const key of OPTION_NAMES) {
    if (!allowed.has(key)) continue;
    const value = key === "theme" ? theme.name : options[key];
    const fallback = key === "theme" ? DEFAULT_OPTIONS.theme : defaults[key];
    if (value === null || JSON.stringify(value) === JSON.stringify(fallback)) continue;
    const serialized = Array.isArray(value) ? value.map((color) => color.replace(/^#/, "")).join("-") : String(value);
    params.set(key, key === "accent" || key === "bg" || key === "wave_color" ? serialized.replace(/^#/, "") : serialized);
  }
  return params;
}

/** Studio control change: round-trips through the URL serializer, so state always equals what a URL can express. */
export function withOption(options: CardOptions, name: OptionName, value: string): CardOptions {
  const query = serializeOptions(options);
  query.set(name, value);
  return parseCardOptions(query);
}

/** Studio address-bar query: the serialized options plus `id` when it is not the demo user. */
export function studioSearch(options: CardOptions, id: string): string {
  const query = serializeOptions(options);
  if (id !== DEMO_ID) query.set("id", id);
  return query.toString();
}

/** Style axes the theme declares, in canonical order (drives Studio's Style group). */
export function supportedStyleParams(themeName: string): StyleParam[] {
  const supported = new Set<string>(getTheme(themeName).supportedParams);
  return STYLE_PARAMS.filter((name) => supported.has(name));
}

export function buildCardUrl(baseUrl: string, id: string, options: CardOptions, target: "svg" | "live" = "svg"): string {
  if (!isDiscordId(id)) throw new Error("A 17–20 digit Discord user ID is required.");
  const base = new URL(baseUrl);
  if (!["http:", "https:"].includes(base.protocol)) throw new Error("The site URL must use HTTP or HTTPS.");
  base.search = "";
  base.hash = "";
  const url = new URL(`${base.href.replace(/\/+$/, "")}/${target === "svg" ? "api" : "live"}/${id}`);
  url.search = serializeOptions(options).toString();
  url.hash = "";
  return url.href;
}

const attribute = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildEmbed(baseUrl: string, id: string, options: CardOptions, size: CardSize) {
  const svgUrl = buildCardUrl(baseUrl, id, options);
  const liveUrl = buildCardUrl(baseUrl, id, options, "live");
  const dark = buildCardUrl(baseUrl, id, { ...options, mode: "dark" });
  const light = buildCardUrl(baseUrl, id, { ...options, mode: "light" });
  const discordUrl = `https://discord.com/users/${id}`;
  const dimensions = `width="${Math.ceil(size.width)}" height="${Math.ceil(size.height)}"`;
  const frameId = `dgp-${id}`;
  return {
    svgUrl, liveUrl,
    markdown: `[![Discord presence](${svgUrl})](${discordUrl})`,
    html: `<img src="${attribute(svgUrl)}" alt="Discord presence" ${dimensions} />`,
    picture: `<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="${attribute(dark)}" />\n  <source media="(prefers-color-scheme: light)" srcset="${attribute(light)}" />\n  <img src="${attribute(svgUrl)}" alt="Discord presence" ${dimensions} />\n</picture>`,
    iframe: `<iframe id="${frameId}" src="${attribute(liveUrl)}" title="Live Discord presence" ${dimensions} style="border:0;width:100%;max-width:${Math.ceil(size.width)}px" loading="lazy"></iframe>\n<script>\n  (() => {\n    const frame = document.getElementById("${frameId}");\n    window.addEventListener("message", (event) => {\n      if (event.origin !== new URL(frame.src).origin || event.source !== frame.contentWindow) return;\n      const { type, height } = event.data || {};\n      if (type === "dgp:height" && Number.isFinite(height) && height > 0 && height < 10000) {\n        frame.style.height = Math.ceil(height) + "px";\n      }\n    });\n  })();\n</script>`,
    url: svgUrl,
  };
}
