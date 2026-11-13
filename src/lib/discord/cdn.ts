/**
 * Discord (and partner) CDN URL builders.
 *
 * Every pattern here was checked with real HTTP requests on 2026-11-12; see
 * `docs/memory/gotchas.md` for the verified facts and the corrections to the original notes.
 */

export const DISCORD_CDN = "https://cdn.discordapp.com";
export const DISCORD_MEDIA_PROXY = "https://media.discordapp.net";
export const DISCORD_API = "https://discord.com/api/v10";
export const SPOTIFY_IMAGE_CDN = "https://i.scdn.co/image";

/** jdecked/twemoji is the maintained Twemoji fork. Pinned so the art never shifts under us. */
export const TWEMOJI_VERSION = "16.0.1";
export const TWEMOJI_BASE = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${TWEMOJI_VERSION}/assets/svg`;

/** A static image plus an optional animated variant of the same art. */
export interface ImageSource {
  static: string;
  animated?: string;
}

/** Sizes the Discord CDN accepts. Other values (e.g. 120) answer 400. */
export const CDN_SIZES = [16, 20, 22, 24, 28, 32, 40, 44, 48, 56, 60, 64, 80, 96, 100, 128, 160, 240, 256, 300, 320, 480, 512, 600, 640, 1024, 2048, 4096] as const;

/** Rounds up to the nearest size the CDN accepts. */
export function cdnSize(px: number): number {
  for (const size of CDN_SIZES) if (size >= px) return size;
  return 4096;
}

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;
const SNOWFLAKE = /^\d{1,20}$/;

function enc(segment: string): string {
  return encodeURIComponent(segment);
}

// ---------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------

export interface AvatarUrlOptions {
  size: number;
  format?: "webp" | "png";
  animated?: boolean;
}

export function avatarUrl(userId: string, hash: string, options: AvatarUrlOptions): string {
  const size = cdnSize(options.size);
  const base = `${DISCORD_CDN}/avatars/${enc(userId)}/${enc(hash)}`;
  if (options.animated && hash.startsWith("a_")) {
    return `${base}.webp?size=${size}&animated=true`;
  }
  return `${base}.${options.format ?? "webp"}?size=${size}`;
}

/** `(id >> 22) % 6` for migrated usernames, `discriminator % 5` for legacy tags. */
export function defaultAvatarIndex(userId: string, discriminator?: string | null): number {
  if (discriminator && discriminator !== "0" && /^\d+$/.test(discriminator)) {
    return Number(discriminator) % 5;
  }
  if (!SNOWFLAKE.test(userId)) return 0;
  return Number((BigInt(userId) >> 22n) % 6n);
}

export function defaultAvatarUrl(index: number): string {
  return `${DISCORD_CDN}/embed/avatars/${index}.png`;
}

export function avatarSource(
  userId: string,
  hash: string | null | undefined,
  discriminator: string | null | undefined,
  size: number,
): ImageSource {
  if (!hash) return { static: defaultAvatarUrl(defaultAvatarIndex(userId, discriminator)) };
  const source: ImageSource = { static: avatarUrl(userId, hash, { size }) };
  if (hash.startsWith("a_")) source.animated = avatarUrl(userId, hash, { size, animated: true });
  return source;
}

// ---------------------------------------------------------------------------
// Profile banners
// ---------------------------------------------------------------------------

/**
 * User banner. WebP is ~12x smaller than PNG for the same art (a real 600px banner: 20,764 bytes
 * WebP versus 240,949 PNG), and `.gif` answers 415 for a static banner. Discord documents animated
 * images (`a_` hashes) as `.webp?animated=true`; `animated=true` on a static banner is harmless.
 */
export function bannerSource(userId: string, hash: string, size = 600): ImageSource {
  const base = `${DISCORD_CDN}/banners/${enc(userId)}/${enc(hash)}.webp?size=${cdnSize(size)}`;
  return hash.startsWith("a_") ? { static: base, animated: `${base}&animated=true` } : { static: base };
}

// ---------------------------------------------------------------------------
// Avatar decorations
// ---------------------------------------------------------------------------

export interface DecorationUrlOptions {
  size: number;
  format: "png" | "webp";
  /**
   * `passthrough=true` returns the original APNG for animated presets. Discord ignores `size`
   * for it (the demo preset is 288px and ~800 KB), so prefer `format: "webp", animated: true`.
   */
  passthrough?: boolean;
  animated?: boolean;
}

export function decorationUrl(asset: string, options: DecorationUrlOptions): string {
  const size = cdnSize(options.size);
  const base = `${DISCORD_CDN}/avatar-decoration-presets/${enc(asset)}.${options.format}?size=${size}`;
  if (options.format === "webp" && options.animated && asset.startsWith("a_")) {
    return `${base}&animated=true`;
  }
  if (options.passthrough !== undefined) return `${base}&passthrough=${options.passthrough}`;
  return base;
}

export function decorationSource(asset: string, size: number): ImageSource {
  const source: ImageSource = {
    static: decorationUrl(asset, { size, format: "png", passthrough: false }),
  };
  if (asset.startsWith("a_")) {
    source.animated = decorationUrl(asset, { size, format: "webp", animated: true });
  }
  return source;
}

// ---------------------------------------------------------------------------
// Nameplates and guild tags
// ---------------------------------------------------------------------------

export function nameplateUrls(asset: string): { static: string; video: string } {
  const path = asset.replace(/^\/+/, "").replace(/\/?$/, "/");
  const safe = path
    .split("/")
    .map((part) => (part ? enc(part) : part))
    .join("/");
  return {
    static: `${DISCORD_CDN}/assets/collectibles/${safe}static.png`,
    video: `${DISCORD_CDN}/assets/collectibles/${safe}asset.webm`,
  };
}

/** Both `/guild-tag-badges/` and `/clan-badges/` answer 200; the former is the current name. */
export function guildTagBadgeUrl(guildId: string, badge: string, size = 32): string {
  return `${DISCORD_CDN}/guild-tag-badges/${enc(guildId)}/${enc(badge)}.png?size=${cdnSize(size)}`;
}

// ---------------------------------------------------------------------------
// Activity assets and application icons
// ---------------------------------------------------------------------------

/** Swaps Spotify's 640px art id prefix for the 300px one to keep SVGs small. */
function smallerSpotifyImage(id: string): string {
  return id.replace(/^ab67616d0000b273/, "ab67616d00001e02");
}

/**
 * Resolves an activity `large_image` / `small_image` value to an https URL.
 * Returns `null` for anything that cannot be resolved safely.
 */
export function activityAssetUrl(
  applicationId: string | null | undefined,
  asset: string | null | undefined,
  size = 128,
): string | null {
  if (!asset) return null;

  const colon = asset.indexOf(":");
  if (colon > 0) {
    const prefix = asset.slice(0, colon);
    const rest = asset.slice(colon + 1);
    if (!rest || rest.includes("..")) return null;
    switch (prefix) {
      case "mp":
        return `${DISCORD_MEDIA_PROXY}/${rest.replace(/^\/+/, "")}`;
      case "spotify":
        return SAFE_SEGMENT.test(rest) ? `${SPOTIFY_IMAGE_CDN}/${smallerSpotifyImage(rest)}` : null;
      case "youtube":
        return SAFE_SEGMENT.test(rest) ? `https://i.ytimg.com/vi/${rest}/hqdefault.jpg` : null;
      case "twitch":
        return SAFE_SEGMENT.test(rest)
          ? `https://static-cdn.jtvnw.net/previews-ttv/live_user_${rest.toLowerCase()}-320x180.jpg`
          : null;
      default:
        return null;
    }
  }

  if (!applicationId || !SNOWFLAKE.test(applicationId) || !SAFE_SEGMENT.test(asset)) return null;
  return `${DISCORD_CDN}/app-assets/${applicationId}/${asset}.png?size=${cdnSize(size)}`;
}

/** Public, unauthenticated endpoint that returns `{ id, name, icon, ... }` for an application. */
export function appRpcUrl(applicationId: string): string {
  return `${DISCORD_API}/applications/${enc(applicationId)}/rpc`;
}

export function appIconUrl(applicationId: string, icon: string, size = 64): string {
  return `${DISCORD_CDN}/app-icons/${enc(applicationId)}/${enc(icon)}.png?size=${cdnSize(size)}`;
}

export function spotifyAlbumArtUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith("https://")) return null;
  const prefix = `${SPOTIFY_IMAGE_CDN}/`;
  if (url.startsWith(prefix)) return prefix + smallerSpotifyImage(url.slice(prefix.length));
  return url;
}

// ---------------------------------------------------------------------------
// Emoji and badges
// ---------------------------------------------------------------------------

export function customEmojiUrl(id: string, animated: boolean, size = 32): string {
  return `${DISCORD_CDN}/emojis/${enc(id)}.${animated ? "gif" : "png"}?size=${cdnSize(size)}`;
}

const ZWJ = "\u200d";
const VS16 = /\ufe0f/g;

/** Twemoji file name for an emoji: code points joined by `-`, FE0F dropped unless a ZWJ is present. */
export function twemojiCodepoints(emoji: string): string | null {
  if (!emoji || !/\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]\ufe0f?\u20e3/u.test(emoji)) {
    return null;
  }
  const text = emoji.includes(ZWJ) ? emoji : emoji.replace(VS16, "");
  const points: string[] = [];
  for (const char of text) points.push(char.codePointAt(0)!.toString(16));
  return points.length ? points.join("-") : null;
}

export function twemojiUrl(emoji: string): string | null {
  const name = twemojiCodepoints(emoji);
  return name ? `${TWEMOJI_BASE}/${name}.svg` : null;
}

export function badgeIconUrl(hash: string): string {
  return `${DISCORD_CDN}/badge-icons/${enc(hash)}.png`;
}
