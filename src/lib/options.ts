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
export const THEME_NAMES = ["profile", "nitro", "member", "compact", "activity", "glass", "badge", "chat", "banner", "terminal", "neon", "retro", "polaroid", "mobile", "voice"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];
/** Themes whose `width` range differs from the shared 300–600px clamp (default 420). */
export const THEME_WIDTHS: Partial<Record<ThemeName, { fallback: number; min: number; max: number }>> = { banner: { fallback: 800, min: 600, max: 1000 } };

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
});

export type CardOptions = z.infer<typeof optionSchema>;
export type OptionName = keyof CardOptions;
export const OPTION_NAMES = Object.keys(optionSchema.shape) as OptionName[];
export type QueryInput = URLSearchParams | Record<string, string | string[] | undefined>;

/** Unknown keys are ignored; repeated values consistently use the first. Every field falls back independently. */
export function parseOptions(input: QueryInput = {}): CardOptions {
  const record: Record<string, unknown> = {};
  for (const key of OPTION_NAMES) {
    const value = input instanceof URLSearchParams ? input.get(key) ?? undefined : input[key];
    record[key] = Array.isArray(value) ? value[0] : value;
  }
  const options = optionSchema.parse(record);
  const range = THEME_WIDTHS[options.theme];
  return range ? { ...options, width: number(range.fallback, range.min, range.max).parse(record.width) } : options;
}
