import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import { normalizeHex } from "@/lib/discord/color";

/** Exact names only: an unrelated activity containing a brand name must retain its own artwork.
 * Matching by name (not application ID) also covers the many third-party presence apps that report these services. */
export const WAVE_APP_COLORS: Readonly<Record<string, string>> = {
  // https://discord.com/branding
  discord: "#5865f2",
  // https://newsroom.spotify.com/media-kit/ (Spotify Green), for activities that reuse the service name
  spotify: "#1db954",
  // https://www.youtube.com/howyoutubeworks/resources/brand-resources/
  youtube: "#ff0000", "youtube music": "#ff0000",
  // https://brand.twitch.tv/ (Twitch Purple)
  twitch: "#9146ff",
  // https://code.visualstudio.com/brand
  "visual studio code": "#007acc", "vs code": "#007acc",
  // Visual Studio's purple product color
  "visual studio": "#5c2d91",
  // https://brand.netflix.com/ (Netflix Red)
  netflix: "#e50914",
  // Crunchyroll orange
  crunchyroll: "#f47521",
  // Apple Music red
  "apple music": "#fa243c",
  // https://developers.soundcloud.com/docs/api/buttons-logos
  soundcloud: "#ff5500",
};

/** WCAG relative luminance in sRGB; inputs are normalized six-digit colors. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  return channels[0]! * .2126 + channels[1]! * .7152 + channels[2]! * .0722;
}

export function contrastRatio(a: string, b: string): number {
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}

/**
 * White text whenever it reaches 2.4:1, like the owner's original card (white on Spotify green); the panel adds a
 * soft text shadow for white ink. Light fills such as white or yellow switch to black, which then has at least 4.5:1.
 */
export const WHITE_INK_MIN_CONTRAST = 2.4;
export function waveTextColor(color: string): "#000000" | "#ffffff" {
  return contrastRatio(color, "#ffffff") >= WHITE_INK_MIN_CONTRAST ? "#ffffff" : "#000000";
}

export interface WaveColor {
  kind: "custom" | "spotify" | "brand" | "art" | "idle";
  color: string;
  ink: string;
  image: string | null;
}

/** Only visible presence contributes color. The registry has already removed ignored application IDs. */
export function resolveWaveColor(data: CardData, options: CardOptions): WaveColor {
  const solid = (color: string, kind: WaveColor["kind"]): WaveColor => ({ kind, color, ink: waveTextColor(color), image: null });
  const custom = options.wave_color !== "auto" ? normalizeHex(options.wave_color ?? "") : null;
  if (custom) return solid(custom, "custom");
  if (!options.hide_spotify && data.spotify) return solid("#1db954", "spotify");
  const activity = !options.hide_activity ? data.activities[0] : null;
  if (activity) {
    const brand = WAVE_APP_COLORS[activity.name.trim().toLowerCase()];
    if (brand) return solid(brand, "brand");
    const image = activity.largeImage?.url ?? activity.appIcon;
    // The artwork is inlined normally; a >=80% dark scrim makes white copy independent of its pixels.
    if (image) return { kind: "art", color: "#111827", ink: "#ffffff", image };
  }
  return solid(data.profile?.bannerColor ?? (options.accent === "#5865f2" ? data.kv.accent ?? options.accent : options.accent), "idle");
}
