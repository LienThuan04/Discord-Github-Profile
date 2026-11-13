import { z } from "zod";
import { normalizeHex } from "./discord/color";
import { STYLE_VALUES, type StyleParam } from "./style-options";
import { DEFAULT_TIME_ZONE, parseTimeZone } from "./timezone";

const boolean = (fallback: boolean) => z.preprocess((value) => value === "true" ? true : value === "false" ? false : value, z.boolean()).catch(fallback);
const number = (fallback: number, min: number, max: number) => z.preprocess((value) => typeof value === "string" && value.trim() ? Number(value) : value, z.number().finite().transform((value) => Math.min(max, Math.max(min, Math.round(value))))).catch(fallback);
const hex = z.string().transform((value, context) => {
  const color = normalizeHex(value);
  if (!color) { context.addIssue({ code: "custom", message: "Invalid hex color" }); return z.NEVER; }
  return color;
});
/** Style axes accept any letter case and surrounding whitespace; anything else falls back to the axis default. */
const style = <P extends StyleParam>(name: P) => z.preprocess((value) => typeof value === "string" ? value.trim().toLowerCase() : value, z.enum(STYLE_VALUES[name] as unknown as [(typeof STYLE_VALUES)[P][number], ...(typeof STYLE_VALUES)[P][number][]])).catch(STYLE_VALUES[name][0] as (typeof STYLE_VALUES)[P][number]);

/**
 * Where banner/backdrop art comes from (first value is the default). `auto` walks the whole chain: KV banner →
 * Discord banner image → Nitro theme colours → profile banner colour → nameplate → theme accent. `profile` skips
 * the nameplate, `nameplate` uses only the nameplate, `accent` uses the theme's own art and `none` draws a plain
 * surface. See "Profile rendering" in docs/THEME-CONTRACT.md.
 */
export const BANNER_SOURCES = ["auto", "profile", "nameplate", "accent", "none"] as const;
export type BannerSource = (typeof BANNER_SOURCES)[number];
/** IANA zone names, canonicalised by `Intl`; anything Intl rejects falls back to UTC. */
const timeZone = z.unknown().transform((value, context) => {
  const zone = parseTimeZone(value);
  if (!zone) { context.addIssue({ code: "custom", message: "Invalid time zone" }); return z.NEVER; }
  return zone;
}).catch(DEFAULT_TIME_ZONE);

/** Must match the keys of `themes` in `src/card/theme-registry.ts` (enforced by tests/options.test.ts). */
export const THEME_NAMES = ["profile", "nitro", "member", "compact", "activity", "glass", "badge", "chat", "banner", "terminal", "neon", "retro", "polaroid", "mobile", "voice", "wave"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];
/** Themes whose `width` range differs from the shared 300–600px clamp (default 420). */
export const THEME_WIDTHS: Partial<Record<ThemeName, { fallback: number; min: number; max: number }>> = { banner: { fallback: 800, min: 600, max: 1000 } };
/** Defaults are also used by the embed serializer and Studio; explicit query values take precedence. */
export const THEME_DEFAULTS: Partial<Record<ThemeName, Partial<CardOptions>>> = {
  member: { banner_source: "nameplate" }, wave: { banner_source: "nameplate", hide_platforms: true },
};

export const optionSchema = z.object({
  theme: z.enum(THEME_NAMES).catch("profile"), mode: z.enum(["dark", "light"]).catch("dark"),
  accent: hex.catch("#5865f2"), bg: z.union([z.literal("transparent"), hex]).nullable().catch(null),
  radius: number(16, 0, 48), width: number(420, 300, 600), animated: boolean(true), max_activities: number(2, 1, 4),
  idle_text: z.string().trim().min(1).transform((value) => value.slice(0, 120)).catch("Enjoying a quiet moment"),
  name_gradient: z.string().transform((value, context) => {
    const colors = value.split("-").map(normalizeHex);
    if (colors.length < 2 || colors.length > 8 || colors.some((color) => !color)) { context.addIssue({ code: "custom", message: "Invalid gradient" }); return z.NEVER; }
    return colors as string[];
  }).catch([]), force_gradient: boolean(false), show_banner: boolean(true),
  hide_decoration: boolean(false), hide_nameplate: boolean(false), hide_tag: boolean(false), hide_badges: boolean(false), hide_status: boolean(false), hide_platforms: boolean(false), hide_custom_status: boolean(false), hide_activity: boolean(false), hide_spotify: boolean(false), hide_timestamps: boolean(false), hide_kv: boolean(false),
  avatar_shape: style("avatar_shape"), ring: style("ring"), pattern: style("pattern"), effect: style("effect"),
  status_style: style("status_style"), eq_style: style("eq_style"), font: style("font"), border: style("border"),
  banner_source: z.preprocess((value) => typeof value === "string" ? value.trim().toLowerCase() : value, z.enum(BANNER_SOURCES)).catch("auto"),
  hide_effect: boolean(false), hide_frame: boolean(false), tz: timeZone,
  wave_color: z.preprocess((value) => typeof value === "string" ? value.trim().toLowerCase() : value, z.union([z.literal("auto"), hex.refine((value) => value.length === 7, "Use an opaque RGB color")])).catch("auto"),
  ignore_app_id: z.string().trim().transform((value, context) => {
    if (!value) return "";
    const ids = value.split(",").map((id) => id.trim());
    if (ids.length > 10 || ids.some((id) => !/^\d{17,20}$/.test(id))) { context.addIssue({ code: "custom", message: "Use up to 10 comma-separated snowflakes" }); return z.NEVER; }
    return [...new Set(ids)].join(",");
  }).catch(""),
});

export type CardOptions = z.infer<typeof optionSchema>;
export type OptionName = keyof CardOptions;
export const OPTION_NAMES = Object.keys(optionSchema.shape) as OptionName[];
export type QueryInput = URLSearchParams | Record<string, string | string[] | undefined>;

/** Read the first value identically for route searchParams and URLSearchParams. */
function queryValue(input: QueryInput, key: string): string | undefined {
  const value = input instanceof URLSearchParams ? input.get(key) ?? undefined : input[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Compatibility is opt-in through the old keys themselves; modern keys (including invalid ones) always win. */
function legacyOptions(input: QueryInput, record: Record<string, unknown>) {
  const set = (key: OptionName, value: string | undefined) => { if (record[key] === undefined && value !== undefined) record[key] = value; };
  const legacyTheme = queryValue(input, "theme");
  if (legacyTheme === "dark" || legacyTheme === "light") { record.theme = "wave"; set("mode", legacyTheme); }
  const aliases = { animatedDecoration: "animated", hideDecoration: "hide_decoration", hideStatus: "hide_status", hideActivity: "hide_activity", hideSpotify: "hide_spotify", hideBadges: "hide_badges", forceGradient: "force_gradient", ignoreAppId: "ignore_app_id" } as const;
  for (const [old, modern] of Object.entries(aliases)) set(modern, queryValue(input, old));
  const shape = queryValue(input, "imgStyle");
  if (shape === "circle" || shape === "square") set("avatar_shape", shape);
  const banner = queryValue(input, "showBanner");
  if (banner === "false") set("banner_source", "none");
  else if (banner === "true" || banner === "animated") {
    set("banner_source", THEME_DEFAULTS[record.theme as ThemeName]?.banner_source ?? "auto");
    if (banner === "animated") set("animated", "true");
  }
}

/** Unknown keys are ignored; repeated values consistently use the first. Every field falls back independently. */
export function parseOptions(input: QueryInput = {}): CardOptions {
  const record: Record<string, unknown> = {};
  for (const key of OPTION_NAMES) record[key] = queryValue(input, key);
  legacyOptions(input, record);
  const options = optionSchema.parse(record);
  for (const [key, fallback] of Object.entries(THEME_DEFAULTS[options.theme] ?? {})) {
    // Replace the field's global catch, so malformed inputs fall back to the selected theme's value too.
    const field: z.ZodType = optionSchema.shape[key as OptionName].unwrap();
    Object.assign(options, { [key]: field.catch(fallback).parse(record[key]) });
  }
  const range = THEME_WIDTHS[options.theme];
  return range ? { ...options, width: number(range.fallback, range.min, range.max).parse(record.width) } : options;
}
