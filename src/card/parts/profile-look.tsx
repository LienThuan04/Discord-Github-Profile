/**
 * Discord profile rendering shared by every theme: banner/backdrop art, the Nitro theme-colour surface, the
 * profile-effect overlay, the merged badge row and the bio/pronouns fallback. Everything is pure: decisions come
 * from `CardData` and `CardOptions` only, and every image passes through `assets()`.
 *
 * See "Profile rendering" in docs/THEME-CONTRACT.md.
 */
import type { CSSProperties } from "react";
import { ProfileEffectPlayer } from "@/live/ProfileEffectPlayer";
import type { CardData } from "@/lib/lanyard/card-data";
import type { BannerSource, CardOptions, OptionName } from "@/lib/options";
import type { ProfileEffectLayer } from "@/lib/discord/profile";
import type { CardProps } from "../types";
import { isMissingImage } from "./image-state";

/** The two controls every theme that renders profile art declares (effects only where an overlay is drawn). */
export const profileParams = ["banner_source", "hide_effect"] as const satisfies readonly OptionName[];

// ---------------------------------------------------------------------------
// Banner resolution
// ---------------------------------------------------------------------------

export type BannerArt =
  /** Lanyard KV `banner` (any public HTTPS host, `banner` asset role). */
  | { kind: "kv"; url: string; fallback?: string; under: string | null }
  /** Discord profile banner image. */
  | { kind: "image"; still: string; animated?: string; under: string | null }
  /** Nitro profile theme colours `[primary, accent]`. */
  | { kind: "theme"; colors: [string, string] }
  /** Solid profile banner colour. */
  | { kind: "color"; color: string }
  | { kind: "nameplate"; still: string; video: string; label: string | null; palette: string | null }
  /** The theme draws its own default art. */
  | { kind: "accent" }
  /** A plain surface: no banner art at all. */
  | { kind: "none" };

export interface BannerScope {
  /** The theme declares `show_banner`/`hide_kv`, so the KV banner may appear. */
  kv: boolean;
  /** The theme declares `hide_nameplate`, so the nameplate may appear. */
  nameplate: boolean;
  /** The theme declares `banner_source`; otherwise it behaves as `auto`. */
  source: boolean;
  /** Member rows: Discord shows the nameplate there, so it outranks the profile banner under `auto`. */
  nameplateFirst: boolean;
}

/** Derive what a theme may show from its declared controls, so undeclared controls can never change it. */
export function bannerScope(supported: readonly OptionName[], { nameplateFirst = false }: { nameplateFirst?: boolean } = {}): BannerScope {
  const has = (name: OptionName) => supported.includes(name);
  return { kv: has("show_banner") && has("hide_kv"), nameplate: has("hide_nameplate"), source: has("banner_source"), nameplateFirst };
}

/** The effective `banner_source` for a theme. */
export function bannerSourceOf(options: CardOptions, scope: BannerScope): BannerSource {
  return scope.source ? options.banner_source : "auto";
}

/** Whether profile colours may tint the card (`auto` and `profile` only). */
export function usesProfileColors(options: CardOptions, scope: BannerScope): boolean {
  const source = bannerSourceOf(options, scope);
  return source === "auto" || source === "profile";
}

const ACCENT: BannerArt = { kind: "accent" };

/**
 * Banner priority. `auto`: KV banner → Discord banner image → Nitro theme colours → profile banner colour →
 * nameplate → theme accent (member: nameplate first). `profile` skips the nameplate, `nameplate` uses only the
 * nameplate, `accent` and `none` use no profile data.
 */
export function resolveBanner(data: CardData, options: CardOptions, scope: BannerScope): BannerArt {
  const source = bannerSourceOf(options, scope);
  if (source === "none") return { kind: "none" };
  if (source === "accent") return ACCENT;
  const plate = scope.nameplate && !options.hide_nameplate ? data.user.nameplate : null;
  const nameplate: BannerArt | null = plate ? { kind: "nameplate", still: plate.static, video: plate.video, label: plate.label, palette: plate.palette?.[options.mode] ?? null } : null;
  if (source === "nameplate") return nameplate ?? ACCENT;
  const profile = data.profile;
  const colour: BannerArt | null = profile?.themeColors ? { kind: "theme", colors: profile.themeColors } : profile?.bannerColor ? { kind: "color", color: profile.bannerColor } : null;
  const under = colour ? colourBackground(colour) : null;
  const still = profile?.bannerUrl?.static || null;
  const image: BannerArt | null = still ? { kind: "image", still, ...(profile?.bannerUrl?.animated ? { animated: profile.bannerUrl.animated } : {}), under } : null;
  const kvUrl = scope.kv && options.show_banner && !options.hide_kv ? data.kv.banner : null;
  // A failed KV image falls back to the next image tier; the colour tier is painted underneath it.
  const kvFallback = still ?? (source === "auto" && !colour && plate ? plate.static : undefined);
  const kv: BannerArt | null = kvUrl ? { kind: "kv", url: kvUrl, ...(kvFallback ? { fallback: kvFallback } : {}), under } : null;
  if (source === "profile") return kv ?? image ?? colour ?? ACCENT;
  if (scope.nameplateFirst) return nameplate ?? kv ?? image ?? colour ?? ACCENT;
  return kv ?? image ?? colour ?? nameplate ?? ACCENT;
}

/** One colour that stands for the banner, for themes that only take an accent from it. */
export function bannerTint(art: BannerArt, data: CardData): string | null {
  switch (art.kind) {
    case "theme": return art.colors[0];
    case "color": return art.color;
    case "kv": case "image": return data.profile?.themeColors?.[0] ?? data.profile?.bannerColor ?? null;
    case "nameplate": return art.palette;
    default: return null;
  }
}

/** A very subtle highlight; preserve the source color without tinting or darkening it. */
export const BANNER_SHEEN = "linear-gradient(118deg,#ffffff08,#ffffff00 45%)";

function colourBackground(art: BannerArt): string | null {
  if (art.kind === "theme") return `${BANNER_SHEEN},linear-gradient(135deg,${art.colors[0]},${art.colors[1]})`;
  if (art.kind === "color") return `${BANNER_SHEEN},linear-gradient(${art.color},${art.color})`;
  return null;
}

/** Inline style for a flat banner element (theme gradient or colour with sheen); empty for other kinds. */
export function bannerFillStyle(art: BannerArt): CSSProperties {
  const background = colourBackground(art);
  return background ? { backgroundImage: background } : {};
}

/**
 * Renders the resolved art as one absolutely positioned layer (`.pf-banner` plus the theme's class).
 * Returns `null` for `accent` and `none`: the theme draws its own default or nothing.
 */
export function BannerFill({ art, className, data, options, assets, target }: CardProps & { art: BannerArt; className: string }) {
  const classes = `pf-banner pf-${art.kind} ${className}`;
  switch (art.kind) {
    case "kv":
      return <div className={classes} style={art.under ? { backgroundImage: art.under } : undefined}><img src={assets(art.url, "banner", art.fallback)} alt="" /></div>;
    case "image": {
      const src = options.animated && art.animated ? assets(art.animated, "image", art.still) : assets(art.still, "image");
      return <div className={classes} style={art.under ? { backgroundImage: art.under } : undefined}><img src={src} alt={`${data.user.displayName}'s profile banner`} /></div>;
    }
    case "theme": case "color":
      return <div className={classes} style={bannerFillStyle(art)} />;
    case "nameplate":
      return <div className={classes} style={art.palette ? { backgroundColor: art.palette } : undefined}>{target === "live" && options.animated
        ? <video src={assets(art.video)} autoPlay muted loop playsInline aria-label={art.label ?? "Nameplate"} />
        : <img src={assets(art.still)} alt="" />}</div>;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Nitro theme-colour surface
// ---------------------------------------------------------------------------

/**
 * Discord paints a Nitro-themed profile with a primary→accent gradient under a readability scrim. Returns the
 * root style for that surface, or `{}` when there are no theme colours, `bg` is set or `banner_source` opts out.
 * `--bg` stays a solid colour (avatar cut-outs and borders use it); `--pf-a`/`--pf-b` expose the raw colours.
 */
export function profileSurface(data: CardData, options: CardOptions, scope: BannerScope): CSSProperties {
  const colors = data.profile?.themeColors;
  if (!colors || options.bg || !usesProfileColors(options, scope)) return {};
  const [primary, accent] = colors;
  const dark = options.mode === "dark";
  const base = dark ? "#0b0c1d" : "#ffffff";
  const share = dark ? 34 : 20;
  const mix = (color: string, amount = share) => `color-mix(in srgb,${color} ${amount}%,${base})`;
  return {
    "--pf-a": primary, "--pf-b": accent,
    "--bg": mix(primary),
    "--panel": dark ? "color-mix(in srgb,#000 32%,transparent)" : "color-mix(in srgb,#fff 62%,transparent)",
    background: `linear-gradient(180deg,${mix(primary)} 0%,${mix(primary, share - 4)} 38%,${mix(accent)} 100%)`,
  } as CSSProperties;
}

// ---------------------------------------------------------------------------
// Profile effect overlay
// ---------------------------------------------------------------------------

/** Profile effects are authored for Discord's 450px-wide profile popout. */
export const EFFECT_CANVAS = 450;

export interface EffectPlan {
  /** SVG and non-animated/live fallback still frame. */
  still: string | null;
  /** Timed APNG layers for the live target (`animated=true`), in paint order. */
  layers: ProfileEffectLayer[];
}

/** What to draw for the profile effect, or `null` when there is none or `hide_effect` is set. */
export function effectPlan(data: CardData, options: CardOptions, target: CardProps["target"]): EffectPlan | null {
  const effect = options.hide_effect ? null : data.profile?.effect;
  if (!effect) return null;
  const layers = target === "live" && options.animated ? [...(effect.layers ?? [])].sort((a, b) => a.zIndex - b.zIndex || a.start - b.start) : [];
  // SVG uses the still frame: real base layers are megabytes and only one part of a layered composition.
  const still = effect.staticUrl ?? (options.animated && !layers.length ? effect.animatedUrl ?? null : null);
  return still || layers.length ? { still, layers } : null;
}

/**
 * The profile effect as an overlay scaled to `width` and anchored at the top. It never takes pointer events and
 * is clipped to the card's radius by `.pf-effect`. SVG draws the still frame; live with `animated=true` draws the
 * timed APNG layers (still frame for reduced motion). `className` lets a theme move it behind text.
 */
export function ProfileEffect({ data, options, assets, target, width, className = "" }: CardProps & { width: number; className?: string }) {
  const plan = effectPlan(data, options, target);
  if (!plan) return null;
  const effect = data.profile!.effect!;
  const scale = width / EFFECT_CANVAS;
  // The 880px popout art crosses copy on short/wide layouts. Preserve its color, but paint it behind content.
  const placement = ["chat", "banner", "badge", "compact", "member"].includes(options.theme) ? "pf-underlay" : "";
  const title = effect.title ? `Profile effect: ${effect.title}` : "Profile effect";
  if (plan.layers.length) {
    const layers = plan.layers.map((layer) => ({ ...layer, url: assets(layer.url) }));
    return <div className={`pf-effect pf-live ${placement} ${className}`} role="img" aria-label={title}>
      <ProfileEffectPlayer layers={layers} still={plan.still ? assets(plan.still) : null} scale={scale} />
    </div>;
  }
  const src = assets(plan.still!, "image");
  if (isMissingImage(src)) return null;
  return <div className={`pf-effect ${placement} ${className}`} role="img" aria-label={title}><img className="pf-fx-still" src={src} alt="" /></div>;
}

/** Shared CSS for banner fills and effect overlays. Append it to a theme's stylesheet. */
export const profileLookCss = `
.pf-banner{position:absolute;inset:0;overflow:hidden;pointer-events:none;background-size:cover}.pf-banner>img,.pf-banner>video{display:block;width:100%;height:100%;object-fit:cover}
.pf-effect{position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:4;border-radius:inherit;}.pf-effect img{position:absolute;display:block;max-width:none;object-fit:fill}.pf-effect .pf-fx-still{left:0;top:0;width:100%;height:auto;min-width:100%}.pf-effect .pf-player{position:absolute;inset:0}.pf-effect .pf-playing>.pf-fx-still{display:none}
.pf-effect.pf-underlay{z-index:-1}
`;

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export interface ShownBadge { id: string; label: string; icon: string; link?: string }

/** Discord's profile badge ids for the `public_flags` badges whose local ids differ. */
const FLAG_BADGE_ALIASES: Readonly<Record<string, string>> = { hypesquad_bravery: "hypesquad_house_1", hypesquad_brilliance: "hypesquad_house_2", hypesquad_balance: "hypesquad_house_3" };
const iconKey = (url: string) => /\/badge-icons\/([^/.?]+)/.exec(url)?.[1] ?? url;

/**
 * The badge row: Discord's profile badges (quests, orbs, Nitro, boosts …) in Discord's order, plus any
 * `public_flags` badge the profile list lacks (deduplicated by id and icon). Flag badges come first, where
 * Discord shows them. Respects `hide_badges`.
 */
export function cardBadges(data: CardData, options: Pick<CardOptions, "hide_badges">): ShownBadge[] {
  if (options.hide_badges) return [];
  const flags: ShownBadge[] = data.user.badges.map((badge) => ({ id: badge.id, label: badge.label, icon: badge.icon }));
  const profile = data.profile?.badges ?? [];
  if (!profile.length) return flags;
  const ids = new Set(profile.map((badge) => badge.id));
  const icons = new Set(profile.map((badge) => iconKey(badge.iconUrl)));
  const missing = flags.filter((badge) => !ids.has(badge.id) && !ids.has(FLAG_BADGE_ALIASES[badge.id] ?? badge.id) && !icons.has(iconKey(badge.icon)));
  const seenIds = new Set<string>();
  const seenIcons = new Set<string>();
  return [...missing, ...profile.map((badge) => ({ id: badge.id, label: badge.description, icon: badge.iconUrl, ...(badge.link ? { link: badge.link } : {}) }))].filter((badge) => {
    const id = FLAG_BADGE_ALIASES[badge.id] ?? badge.id;
    const icon = iconKey(badge.icon);
    if (seenIds.has(id) || seenIcons.has(icon)) return false;
    seenIds.add(id); seenIcons.add(icon);
    return true;
  });
}

// ---------------------------------------------------------------------------
// About: bio and pronouns
// ---------------------------------------------------------------------------

export interface AboutFields {
  bio: string | null;
  pronouns: string | null;
  location: string | null;
  website: { url: string; label: string } | null;
}

/** Discord bios carry custom-emoji markup; show `:name:` instead of `<a:name:123>`. */
export function cleanBio(bio: string | null | undefined): string | null {
  if (!bio) return null;
  const text = bio.replace(/<a?:(\w{1,32}):\d{17,20}>/g, ":$1:").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return text || null;
}

/** KV text wins; the Discord profile fills a missing bio or pronouns. `hide_kv` hides all of it. */
export function aboutFields(data: CardData, options: Pick<CardOptions, "hide_kv">): AboutFields {
  if (options.hide_kv) return { bio: null, pronouns: null, location: null, website: null };
  return {
    bio: data.kv.bio ?? cleanBio(data.profile?.bio),
    pronouns: data.kv.pronouns ?? data.profile?.pronouns ?? null,
    location: data.kv.location,
    website: data.kv.website,
  };
}
