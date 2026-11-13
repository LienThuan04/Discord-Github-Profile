/**
 * `CardData` is the pure view model every card theme renders. It is produced by `normalize()`
 * from a Lanyard presence and contains no Lanyard-specific shapes, so themes never parse raw data.
 *
 * Image fields hold remote https URLs. The SVG renderer swaps them for data URIs through the
 * `AssetResolver` at render time; the live card uses them directly.
 */

import type { Badge } from "@/lib/discord/badges";
import type { ImageSource } from "@/lib/discord/cdn";
import type { NameplatePaletteColors } from "@/lib/discord/nameplate";
import type { ProfileExtras } from "@/lib/discord/profile";
import type { DiscordStatus } from "./types";

export type Platform = "desktop" | "web" | "mobile" | "embedded" | "vr";

export interface CardUser {
  id: string;
  username: string;
  /** `global_name` → `display_name` → `username`. */
  displayName: string;
  /** `name#1234` for accounts that still have a legacy discriminator, else `null`. */
  legacyTag: string | null;
  bot: boolean;
  avatar: ImageSource;
  decoration: { source: ImageSource; skuId: string | null } | null;
  nameplate: {
    static: string;
    video: string;
    label: string | null;
    palette: NameplatePaletteColors | null;
  } | null;
  guildTag: { tag: string; badge: string | null; guildId: string | null } | null;
  /** From `display_name_styles`. Colors are `#rrggbb`. */
  nameStyle: { colors: string[]; fontId: number; effectId: number } | null;
  badges: Badge[];
}

export interface CardEmoji {
  name: string;
  /** Custom emoji or Twemoji image, `null` when neither applies (text is shown instead). */
  url: string | null;
  custom: boolean;
}

export interface CustomStatusView {
  text: string | null;
  emoji: CardEmoji | null;
}

export interface CardImage {
  url: string;
  text: string | null;
}

export interface ActivityView {
  /** Stable key for React lists. */
  key: string;
  type: number;
  /** "Playing", "Listening to", ... */
  verb: string;
  /** Section header, e.g. "Listening to Apple Music". */
  title: string;
  name: string;
  details: string | null;
  state: string | null;
  largeImage: CardImage | null;
  smallImage: CardImage | null;
  applicationId: string | null;
  /** Application icon used when there is no large image. Filled by `withAppIcons()`. */
  appIcon: string | null;
  timestamps: { start?: number; end?: number } | null;
  /** "2 of 4" */
  party: string | null;
  /** Button labels (Discord never shares button URLs). */
  buttons: string[];
  /** Stream URL for type 1 activities. */
  url: string | null;
}

export interface SpotifyView {
  trackId: string | null;
  song: string;
  artist: string;
  album: string;
  albumArt: string | null;
  timestamps: { start: number; end: number } | null;
}

/** Whitelisted Lanyard KV keys, cleaned and length-limited. */
export interface KvView {
  bio: string | null;
  /** https URL, syntactically checked. Network checks happen in the SVG asset inliner. */
  banner: string | null;
  pronouns: string | null;
  location: string | null;
  website: { url: string; label: string } | null;
  /** `#rrggbb` */
  accent: string | null;
}

export interface CardData {
  /** Snapshot time in ms. Clocks and timers are computed against it. */
  now: number;
  user: CardUser;
  status: DiscordStatus;
  platforms: Platform[];
  customStatus: CustomStatusView | null;
  /** Activity types 0/1/2/3/5, Spotify excluded (see `spotify`). */
  activities: ActivityView[];
  spotify: SpotifyView | null;
  kv: KvView;
  /**
   * Discord profile extras Lanyard does not carry (banner, banner color, theme colors, bio, pronouns,
   * profile effect, full badge list). `normalize()` always sets `null`; `/api/[id]` and `/live/[id]`
   * attach the provider result. See "Profile extras" in `docs/THEME-CONTRACT.md`.
   */
  profile: ProfileExtras | null;
}
