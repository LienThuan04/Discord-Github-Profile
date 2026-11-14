/**
 * Discord profile extras that Lanyard does not carry: banner, banner color, Nitro theme colors,
 * bio, pronouns, profile effect and the full profile badge list.
 *
 * Sources, merged so the official API wins wherever both answer:
 * 1. Official Discord API, only when `DISCORD_BOT_TOKEN` is set: `GET /users/{id}` with a bot token
 *    returns the banner hash, `accent_color` and the undocumented `banner_color`.
 * 2. The dstn profile mirror (`DISCORD_PROFILE_PROVIDER=dstn`, the default; `off` disables it). It is an
 *    unofficial third-party service that relays Discord's profile data and supplies everything else.
 * 3. Discord's public, unauthenticated `GET /collectibles-products/{sku}` turns a profile-effect SKU into
 *    its CDN art. The endpoint is undocumented, so a failure just leaves `effect` as `{ skuId }`.
 *
 * Callers wait at most `PROFILE_BUDGET_MS`. Requests that outlive the budget keep running until their own
 * abort timeout and fill the cache for the next render. The provider never throws; it returns `null` when
 * every enabled source fails, none is enabled, or the budget runs out.
 *
 * `lookupProfileExtras()` also says whether the result is complete and hands back a `settled` promise.
 * Routes use both: an incomplete card must not stay in the edge cache, and serverless hosts must be told
 * (`after()`) to keep the instance alive until the background requests have warmed the cache.
 *
 * The module has no Node-only imports, so client code may import its types and the pure helpers.
 */

import { z } from "zod";
import { badgeIconUrl, bannerSource, DISCORD_API, type ImageSource } from "./cdn";
import { colorIntToHex, normalizeHex } from "./color";
import { profileStoreFromEnv, type ProfileStore } from "./profile-store";

export interface ProfileBadge {
  /** Discord's badge id, e.g. `quest_completed`. */
  id: string;
  /** Tooltip text, e.g. "Completed a Quest". */
  description: string;
  iconUrl: string;
  /** https only; omitted when Discord gives none. */
  link?: string;
}

/** One animation layer, in Discord's coordinates for a 450px-wide profile popout. */
export interface ProfileEffectLayer {
  url: string;
  width: number;
  height: number;
  x: number;
  y: number;
  /** Milliseconds after the profile opens. */
  start: number;
  duration: number;
  loop: boolean;
  loopDelay: number;
  zIndex: number;
}

export interface ProfileEffect {
  skuId: string;
  title?: string;
  /** Still PNG frame; the right choice for `animated=false` and for SVG size. */
  staticUrl?: string;
  /** The base animation layer (APNG). Often large; see `layers` for the full composition. */
  animatedUrl?: string;
  layers?: ProfileEffectLayer[];
}

export interface ProfileFrame {
  skuId: string;
  name: string;
  label: string;
  layers: { id: string; order: "front" | "back"; anchor: "top" | "bottom"; url: string; width?: number; height?: number }[];
  innerWidth: number;
  overflowTop: number;
  overflowBottom: number;
  overflowHorizontal: number;
  colors?: string[];
}

export interface ProfileExtras {
  /** Discord profile banner (static WebP plus an animated variant for `a_` hashes). */
  bannerUrl: ImageSource | null;
  /** `#rrggbb` from `accent_color` / `banner_color`: the solid banner Discord shows without an image. */
  bannerColor: string | null;
  /** Nitro profile theme `[primary, accent]` as `#rrggbb`. */
  themeColors: [string, string] | null;
  bio: string | null;
  pronouns: string | null;
  effect: ProfileEffect | null;
  frame: ProfileFrame | null;
  /** Every profile badge in Discord's order, including the ones `public_flags` cannot express. */
  badges: ProfileBadge[];
}

/** Fields one source could provide. `undefined` means "this source has no opinion". */
export type ProfilePart = Partial<ProfileExtras>;
type EffectDetails = Omit<ProfileEffect, "skuId">;

export const PROFILE_BUDGET_MS = 1500;
const NETWORK_TIMEOUT_MS = 4000;
const SUCCESS_TTL_MS = 10 * 60_000;
const FAILURE_TTL_MS = 60_000;
const EFFECT_TTL_MS = 24 * 60 * 60_000;
/** Short, like the profile: a transient catalog failure must not hide the art for long. */
const EFFECT_FAILURE_TTL_MS = 60_000;
export const DEFAULT_PROFILE_MIRROR_URL = "https://dcdn.dstn.to";
/** Discord asks bot clients to identify as `DiscordBot ($url, $version)`. */
const BOT_USER_AGENT = "DiscordBot (https://github.com/LienThuan04/Discord-Github-Profile, 0.1.0)";
const USER_AGENT = "Discord-PULSE/0.1";

const SNOWFLAKE = /^\d{17,20}$/;
const HASH = /^(?:a_)?[0-9a-f]{16,64}$/i;
const BADGE_ID = /^[\w.:-]{1,64}$/;

// ---------------------------------------------------------------------------
// Pure parsing
// ---------------------------------------------------------------------------

const text = (value: unknown, limit: number): string | null =>
  typeof value === "string" ? value.trim().slice(0, limit) || null : null;

function hex6(value: string | null): string | null {
  return value && value.length === 7 ? value : null;
}

/** Discord integer color first, then a `#rrggbb` string. */
function colorFrom(integer: unknown, hex: unknown): string | null {
  if (typeof integer === "number") {
    const color = colorIntToHex(integer);
    if (color) return color;
  }
  return typeof hex === "string" ? hex6(normalizeHex(hex)) : null;
}

function bannerFrom(userId: string, hash: unknown): ImageSource | null {
  return typeof hash === "string" && HASH.test(hash) ? bannerSource(userId, hash) : null;
}

/** Discord mixes Unix seconds and milliseconds in `expires_at`. */
function isExpired(expiresAt: unknown, now: number): boolean {
  if (typeof expiresAt === "string") return !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now;
  return typeof expiresAt === "number" && (expiresAt >= 1e11 ? expiresAt <= now : expiresAt * 1000 <= now);
}

function httpsLink(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

/** Effect art must stay on the allowlisted Discord CDN under `/assets/`. */
function discordAsset(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    const ok = url.protocol === "https:" && url.hostname === "cdn.discordapp.com" && !url.port && !url.username && !url.password && url.pathname.startsWith("/assets/");
    return ok ? url.href : undefined;
  } catch { return undefined; }
}

function themeColorsFrom(value: unknown): [string, string] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [primary, accent] = value.map((color) => (typeof color === "number" ? colorIntToHex(color) : null));
  return primary && accent ? [primary, accent] : null;
}

const badgeSchema = z.object({
  id: z.string().regex(BADGE_ID),
  description: z.string().nullish(),
  icon: z.string().regex(HASH),
  link: z.unknown().optional(),
});

function badgesFrom(value: unknown): ProfileBadge[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 32).flatMap((entry): ProfileBadge[] => {
    const parsed = badgeSchema.safeParse(entry);
    if (!parsed.success) return [];
    const link = httpsLink(parsed.data.link);
    const badge: ProfileBadge = { id: parsed.data.id, description: text(parsed.data.description, 120) ?? parsed.data.id, iconUrl: badgeIconUrl(parsed.data.icon) };
    return [link ? { ...badge, link } : badge];
  });
}

const effectRefSchema = z.object({ sku_id: z.string().regex(SNOWFLAKE), expires_at: z.union([z.number().finite(), z.string()]).nullish() });
const collectibleSchema = effectRefSchema.extend({ type: z.union([z.literal(1), z.literal(3)]) });

const officialUserSchema = z.object({
  id: z.string(),
  banner: z.unknown().optional(),
  accent_color: z.unknown().optional(),
  banner_color: z.unknown().optional(),
});

/** `GET /users/{id}` (official, bot token). Field names verified against Discord's User object docs. */
export function parseOfficialUser(userId: string, body: unknown): Pick<ProfileExtras, "bannerUrl" | "bannerColor"> | null {
  const parsed = officialUserSchema.safeParse(body);
  if (!parsed.success || parsed.data.id !== userId) return null;
  return { bannerUrl: bannerFrom(userId, parsed.data.banner), bannerColor: colorFrom(parsed.data.accent_color, parsed.data.banner_color) };
}

const dstnSchema = z.object({
  user: z.object({
    id: z.string(),
    banner: z.unknown().optional(),
    accent_color: z.unknown().optional(),
    banner_color: z.unknown().optional(),
    bio: z.unknown().optional(),
  }),
  user_profile: z.object({
    bio: z.unknown().optional(),
    accent_color: z.unknown().optional(),
    pronouns: z.unknown().optional(),
    banner: z.unknown().optional(),
    theme_colors: z.unknown().optional(),
    profile_effect: z.unknown().optional(),
    collectibles: z.unknown().optional(),
  }).nullish(),
  badges: z.unknown().optional(),
});

/** `GET {mirror}/profile/{id}` (dstn). Malformed fields degrade to empty values instead of failing. */
export function parseDstnProfile(userId: string, body: unknown, { now }: { now: number }): ProfileExtras | null {
  const parsed = dstnSchema.safeParse(body);
  if (!parsed.success || parsed.data.user.id !== userId) return null;
  const { user } = parsed.data;
  const profile = parsed.data.user_profile ?? {};
  const effect = effectRefSchema.safeParse(profile.profile_effect);
  const collectibles = (Array.isArray(profile.collectibles) ? profile.collectibles : []).slice(0, 16).flatMap((entry) => {
    const ref = collectibleSchema.safeParse(entry);
    return ref.success && !isExpired(ref.data.expires_at, now) ? [ref.data] : [];
  });
  const effectSku = effect.success && !isExpired(effect.data.expires_at, now) ? effect.data.sku_id : profile.profile_effect == null ? collectibles.find((item) => item.type === 1)?.sku_id : undefined;
  const frameSku = collectibles.find((item) => item.type === 3)?.sku_id;
  return {
    bannerUrl: bannerFrom(userId, user.banner ?? profile.banner),
    bannerColor: colorFrom(profile.accent_color ?? user.accent_color, user.banner_color),
    themeColors: themeColorsFrom(profile.theme_colors),
    bio: text(profile.bio, 400) ?? text(user.bio, 400),
    pronouns: text(profile.pronouns, 40),
    effect: effectSku ? { skuId: effectSku } : null,
    frame: frameSku ? { skuId: frameSku, name: "", label: "", layers: [], innerWidth: 1200, overflowTop: 0, overflowBottom: 0, overflowHorizontal: 0 } : null,
    badges: badgesFrom(parsed.data.badges),
  };
}

const layerSchema = z.object({
  src: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  start: z.number().nonnegative().optional(),
  duration: z.number().nonnegative().optional(),
  loop: z.boolean().optional(),
  loopDelay: z.number().nonnegative().optional(),
  zIndex: z.number().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});
const effectItemSchema = z.object({
  type: z.literal(1),
  sku_id: z.string().optional(),
  title: z.unknown().optional(),
  staticFrameSrc: z.unknown().optional(),
  reducedMotionSrc: z.unknown().optional(),
  effects: z.array(z.unknown()).optional(),
});
const productSchema = z.object({ name: z.unknown().optional(), items: z.array(z.unknown()) });

const dimension = z.number().int().nonnegative().max(4096);
const frameItemSchema = z.object({
  type: z.literal(3), sku_id: z.string().regex(SNOWFLAKE), label: z.string().max(1000),
  inner_width: z.number().int().min(100).max(4096), overflow_top: dimension, overflow_bottom: dimension, overflow_horizontal: dimension,
  layers: z.array(z.object({ id: z.string().regex(SNOWFLAKE), order: z.enum(["front", "back"]), anchor: z.enum(["top", "bottom"]), width: z.number().int().positive().max(16384).optional(), height: z.number().int().positive().max(16384).optional() })).min(1).max(8),
});
/** Public catalog metadata; URLs are constructed from validated snowflakes, never supplied by the mirror. */
export function parseFrameProduct(skuId: string, body: unknown): ProfileFrame | null {
  if (!SNOWFLAKE.test(skuId)) return null;
  const product = productSchema.extend({ styles: z.object({ background_colors: z.array(z.number().int().min(0).max(0xffffff)).max(8) }).optional() }).safeParse(body);
  if (!product.success) return null;
  for (const raw of product.data.items) {
    const item = frameItemSchema.safeParse(raw);
    if (!item.success || item.data.sku_id !== skuId) continue;
    const frame = item.data;
    return { skuId, name: text(product.data.name, 80) ?? "Profile frame", label: frame.label,
      innerWidth: frame.inner_width, overflowTop: frame.overflow_top, overflowBottom: frame.overflow_bottom, overflowHorizontal: frame.overflow_horizontal,
      layers: frame.layers.map((layer) => ({ ...layer, url: `https://cdn.discordapp.com/media/v1/collectibles-shop/${skuId}/${layer.id}/static` })),
      ...(product.data.styles ? { colors: product.data.styles.background_colors.map((color) => colorIntToHex(color)!) } : {}),
    };
  }
  return null;
}

/** `GET /collectibles-products/{sku}`: item type 1 is a profile effect. */
export function parseEffectProduct(skuId: string, body: unknown): EffectDetails | null {
  const product = productSchema.safeParse(body);
  if (!product.success) return null;
  const items = product.data.items.flatMap((item) => {
    const parsed = effectItemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  const item = items.find((candidate) => candidate.sku_id === skuId) ?? items[0];
  if (!item) return null;
  const layers = (item.effects ?? []).slice(0, 8).flatMap((entry): ProfileEffectLayer[] => {
    const layer = layerSchema.safeParse(entry);
    const url = layer.success ? discordAsset(layer.data.src) : undefined;
    if (!layer.success || !url) return [];
    const { width, height, start = 0, duration = 0, loop = false, loopDelay = 0, zIndex = 0, position } = layer.data;
    return [{ url, width, height, x: position?.x ?? 0, y: position?.y ?? 0, start, duration, loop, loopDelay, zIndex }];
  });
  const base = [...layers].sort((a, b) => a.start - b.start || a.zIndex - b.zIndex)[0];
  const title = text(item.title, 80) ?? text(product.data.name, 80);
  const staticUrl = discordAsset(item.staticFrameSrc) ?? discordAsset(item.reducedMotionSrc);
  return {
    ...(title ? { title } : {}),
    ...(staticUrl ? { staticUrl } : {}),
    ...(base ? { animatedUrl: base.url } : {}),
    ...(layers.length ? { layers } : {}),
  };
}

/** Official fields win on overlap, including an explicit official `null`. */
export function mergeProfile(official: ProfilePart | null | undefined, mirror: ProfilePart | null | undefined): ProfileExtras | null {
  if (!official && !mirror) return null;
  const pick = <K extends keyof ProfileExtras>(key: K, fallback: ProfileExtras[K]): ProfileExtras[K] => {
    const fromOfficial = official?.[key];
    if (fromOfficial !== undefined) return fromOfficial as ProfileExtras[K];
    const fromMirror = mirror?.[key];
    return fromMirror !== undefined ? (fromMirror as ProfileExtras[K]) : fallback;
  };
  return {
    bannerUrl: pick("bannerUrl", null),
    bannerColor: pick("bannerColor", null),
    themeColors: pick("themeColors", null),
    bio: pick("bio", null),
    pronouns: pick("pronouns", null),
    effect: pick("effect", null),
    frame: pick("frame", null),
    badges: pick("badges", []),
  };
}

// ---------------------------------------------------------------------------
// Image selection shared by the SVG and live targets
// ---------------------------------------------------------------------------

export interface ImageChoice {
  url: string;
  /** Static variant for the SVG inliner when the animated art fails or exceeds its budget. */
  fallback?: string;
}

/** Static art for `animated=false`; animated art with a static fallback otherwise. */
export function preferredImage(source: { static?: string | null; animated?: string | null } | null | undefined, animated: boolean): ImageChoice | null {
  const still = source?.static || undefined;
  const moving = source?.animated || undefined;
  if (animated && moving) return still && still !== moving ? { url: moving, fallback: still } : { url: moving };
  return still ? { url: still } : null;
}

/** The exact `assets(url, "image", fallback)` requests a theme should make for profile art. */
export function profileImages(profile: ProfileExtras | null | undefined, animated: boolean): { banner: ImageChoice | null; effect: ImageChoice | null; badges: ImageChoice[] } {
  return {
    banner: preferredImage(profile?.bannerUrl, animated),
    effect: preferredImage(profile?.effect ? { static: profile.effect.staticUrl, animated: profile.effect.animatedUrl } : null, animated),
    badges: (profile?.badges ?? []).map((badge) => ({ url: badge.iconUrl })),
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ProfileProviderOptions {
  fetchImpl?: typeof fetch;
  /** Defaults to `DISCORD_BOT_TOKEN`. Empty disables the official source. */
  botToken?: string | null;
  /** Defaults to `DISCORD_PROFILE_PROVIDER`: `dstn` (default) or `off`. Unknown values disable the mirror. */
  provider?: string;
  /** Defaults to `DISCORD_PROFILE_PROVIDER_URL`, then `https://dcdn.dstn.to`. */
  mirrorUrl?: string;
  apiUrl?: string;
  /** How long the caller waits. Capped at `PROFILE_BUDGET_MS`. */
  budgetMs?: number;
  /** Abort timeout for each upstream request; may outlive the budget to warm the cache. */
  timeoutMs?: number;
  /** Clock for cache expiry and effect expiry. */
  now?: () => number;
  /** Last good profiles. Defaults to the Upstash store configured in the environment; `null` disables it. */
  store?: ProfileStore | null;
  /** Cosmetics the user declared in Lanyard KV (see `declaredCosmetics()`), usually still loading with the presence. */
  declared?: DeclaredCosmetics | null | Promise<DeclaredCosmetics | null>;
}

interface Settings {
  fetchImpl: typeof fetch;
  token: string | null;
  mirror: string | null;
  api: string;
  budgetMs: number;
  timeoutMs: number;
  now: () => number;
  store: ProfileStore | null;
}

/** Cosmetics a user declared in Lanyard KV: a collectible SKU, `null` for "none", absent when not declared. */
export interface DeclaredCosmetics {
  effect?: string | null;
  frame?: string | null;
}

/** Lanyard KV keys that pin a user's cosmetics when the profile sources cannot see them. */
export const DECLARED_COSMETIC_KEYS = { effect: "profile_effect", frame: "profile_frame" } as const;

/** Reads `profile_effect` / `profile_frame` from Lanyard KV: a SKU, or `none`/`off`. Anything else is ignored. */
export function declaredCosmetics(kv: Record<string, string> | null | undefined): DeclaredCosmetics | null {
  const read = (value: string | undefined): string | null | undefined => {
    const clean = value?.trim().toLowerCase();
    if (!clean) return undefined;
    if (clean === "none" || clean === "off") return null;
    return SNOWFLAKE.test(clean) ? clean : undefined;
  };
  const effect = read(kv?.[DECLARED_COSMETIC_KEYS.effect]);
  const frame = read(kv?.[DECLARED_COSMETIC_KEYS.frame]);
  if (effect === undefined && frame === undefined) return null;
  return { ...(effect !== undefined ? { effect } : {}), ...(frame !== undefined ? { frame } : {}) };
}

/** KV declarations from a Lanyard presence result (structural, so this module stays free of Lanyard imports). */
export function presenceCosmetics(result: { ok: true; data: { kv?: Record<string, string> } } | { ok: false }): DeclaredCosmetics | null {
  return result.ok ? declaredCosmetics(result.data.kv) : null;
}

/** A live result. `cosmetics` is true when the mirror answered, so its effect and frame are current. */
interface LiveProfile {
  profile: ProfileExtras;
  cosmetics: boolean;
}

function baseUrl(value: string | undefined, fallback: string): string | null {
  const raw = value?.trim() || fallback;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href.replace(/\/+$/, "") : null;
  } catch { return null; }
}

function settingsFrom(options: ProfileProviderOptions): Settings {
  const provider = (options.provider ?? process.env.DISCORD_PROFILE_PROVIDER ?? "").trim().toLowerCase() || "dstn";
  return {
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
    token: (options.botToken ?? process.env.DISCORD_BOT_TOKEN ?? "").trim() || null,
    mirror: provider === "dstn" ? baseUrl(options.mirrorUrl ?? process.env.DISCORD_PROFILE_PROVIDER_URL, DEFAULT_PROFILE_MIRROR_URL) : null,
    api: (options.apiUrl ?? DISCORD_API).replace(/\/+$/, ""),
    budgetMs: Math.max(0, Math.min(options.budgetMs ?? PROFILE_BUDGET_MS, PROFILE_BUDGET_MS)),
    timeoutMs: options.timeoutMs ?? NETWORK_TIMEOUT_MS,
    now: options.now ?? Date.now,
    store: options.store !== undefined ? options.store : profileStoreFromEnv(),
  };
}

/** Small LRU with per-entry expiry. Map insertion order doubles as recency order. */
class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; expires: number }>();
  private readonly limit: number;
  constructor(limit: number) { this.limit = limit; }
  get(key: string, now: number): { value: V } | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    if (entry.expires <= now) return undefined;
    this.entries.set(key, entry);
    return { value: entry.value };
  }
  set(key: string, value: V, ttlMs: number, now: number): void {
    this.entries.delete(key);
    if (this.entries.size >= this.limit) this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key, { value, expires: now + ttlMs });
  }
  clear(): void { this.entries.clear(); }
}

/** Results from before `clearProfileCache()` must not land in the fresh cache. */
let generation = 0;
const profileCache = new TtlCache<LiveProfile | null>(500);
const profileInflight = new Map<string, Promise<LiveProfile | null>>();
const effectCache = new TtlCache<EffectDetails | null>(256);
const effectInflight = new Map<string, Promise<EffectDetails | null>>();
const frameCache = new TtlCache<ProfileFrame | null>(256);
const frameInflight = new Map<string, Promise<ProfileFrame | null>>();
/** Durable-store reads, so a dead mirror does not turn every render into a store request. */
const storedCache = new TtlCache<ProfileExtras | null>(500);
/** What this instance last saved or loaded per user, so unchanged profiles are not written again. */
const savedCache = new TtlCache<string>(500);
const STORED_TTL_MS = 60_000;
const SAVED_TTL_MS = 6 * 60 * 60_000;

export function clearProfileCache(): void {
  generation++;
  profileCache.clear();
  profileInflight.clear();
  effectCache.clear();
  effectInflight.clear();
  frameCache.clear();
  frameInflight.clear();
  storedCache.clear();
  savedCache.clear();
}

async function getJson(settings: Settings, url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await settings.fetchImpl(url, { method: "GET", headers: { Accept: "application/json", ...headers }, signal: AbortSignal.timeout(settings.timeoutMs), cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** `undefined`: source disabled. `null`: source enabled but failed. */
async function loadProfile(userId: string, settings: Settings): Promise<{ live: LiveProfile | null; degraded: boolean }> {
  const [official, mirror] = await Promise.all([
    settings.token
      ? getJson(settings, `${settings.api}/users/${userId}`, { Authorization: `Bot ${settings.token}`, "User-Agent": BOT_USER_AGENT }).then((body) => parseOfficialUser(userId, body), () => null)
      : undefined,
    settings.mirror
      ? getJson(settings, `${settings.mirror}/profile/${userId}`, { "User-Agent": USER_AGENT }).then((body) => parseDstnProfile(userId, body, { now: settings.now() }), () => null)
      : undefined,
  ]);
  const profile = mergeProfile(official, mirror);
  return { live: profile ? { profile, cosmetics: Boolean(mirror) } : null, degraded: official === null || mirror === null };
}

function startProfileLoad(key: string, userId: string, settings: Settings): Promise<LiveProfile | null> {
  const started = generation;
  const pending: Promise<LiveProfile | null> = loadProfile(userId, settings)
    .then(({ live, degraded }) => {
      if (started === generation) profileCache.set(key, live, live && !degraded ? SUCCESS_TTL_MS : FAILURE_TTL_MS, settings.now());
      return live;
    }, () => null)
    .finally(() => { if (profileInflight.get(key) === pending) profileInflight.delete(key); });
  profileInflight.set(key, pending);
  return pending;
}

function lookupEffect(skuId: string, settings: Settings): Promise<EffectDetails | null> {
  const cached = effectCache.get(skuId, settings.now());
  if (cached) return Promise.resolve(cached.value);
  const inflight = effectInflight.get(skuId);
  if (inflight) return inflight;
  const started = generation;
  const pending: Promise<EffectDetails | null> = getJson(settings, `${settings.api}/collectibles-products/${skuId}`, { "User-Agent": USER_AGENT })
    .then((body) => parseEffectProduct(skuId, body), () => null)
    .then((details) => {
      if (started === generation) effectCache.set(skuId, details, details ? EFFECT_TTL_MS : EFFECT_FAILURE_TTL_MS, settings.now());
      return details;
    })
    .finally(() => { if (effectInflight.get(skuId) === pending) effectInflight.delete(skuId); });
  effectInflight.set(skuId, pending);
  return pending;
}

const TIMEOUT = Symbol("timeout");

function lookupFrame(skuId: string, settings: Settings): Promise<ProfileFrame | null> {
  const cached = frameCache.get(skuId, settings.now());
  if (cached) return Promise.resolve(cached.value);
  const existing = frameInflight.get(skuId);
  if (existing) return existing;
  const started = generation;
  const pending = getJson(settings, `${settings.api}/collectibles-products/${skuId}`, { "User-Agent": USER_AGENT })
    .then((body) => parseFrameProduct(skuId, body), () => null)
    .then(async (frame) => {
      if (!frame) return null;
      const layers = await Promise.all(frame.layers.map(async (layer) => {
        if (layer.width && layer.height) return layer;
        const dimensions = await frameImageDimensions(layer.url, settings);
        return dimensions ? { ...layer, ...dimensions } : null;
      }));
      return layers.every((layer) => layer !== null) ? { ...frame, layers } : null;
    })
    .then((frame) => {
      if (started === generation) frameCache.set(skuId, frame, frame ? EFFECT_TTL_MS : EFFECT_FAILURE_TTL_MS, settings.now());
      return frame;
    }).finally(() => { if (frameInflight.get(skuId) === pending) frameInflight.delete(skuId); });
  frameInflight.set(skuId, pending);
  return pending;
}

/** Read only the PNG header, then cancel the body. Catalog layers omit their intrinsic image dimensions. */
async function frameImageDimensions(url: string, settings: Settings): Promise<{ width: number; height: number } | null> {
  try {
    const response = await settings.fetchImpl(url, { headers: { Range: "bytes=0-23" }, signal: AbortSignal.timeout(settings.timeoutMs), cache: "no-store" });
    if (!response.ok || !response.body) return null;
    const reader = response.body.getReader();
    const header = new Uint8Array(24);
    let count = 0;
    try {
      while (count < 24) {
        const chunk = await reader.read();
        if (chunk.done) return null;
        const part = chunk.value.subarray(0, 24 - count); header.set(part, count); count += part.length;
      }
    } finally { await reader.cancel(); }
    if (header.slice(0, 8).join() !== "137,80,78,71,13,10,26,10" || String.fromCharCode(...header.slice(12, 16)) !== "IHDR") return null;
    const view = new DataView(header.buffer);
    const parsed = z.object({ width: z.number().int().min(1).max(16384), height: z.number().int().min(1).max(16384) }).safeParse({ width: view.getUint32(16), height: view.getUint32(20) });
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

function within<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMEOUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<typeof TIMEOUT>((resolve) => { timer = setTimeout(() => resolve(TIMEOUT), Math.max(0, ms)); });
  return Promise.race([promise, expiry]).finally(() => clearTimeout(timer));
}

export interface ProfileLookup {
  profile: ProfileExtras | null;
  /**
   * `false` when the budget ran out, an enabled source failed, or effect/frame art is missing. A card
   * rendered from such a result may differ from the next render and should only be cached briefly.
   */
  complete: boolean;
  /** Resolves (never rejects) once every request this lookup started has finished and been cached. */
  settled: Promise<void>;
}

const SETTLED: Promise<void> = Promise.resolve();

const EMPTY_PROFILE: ProfileExtras = { bannerUrl: null, bannerColor: null, themeColors: null, bio: null, pronouns: null, effect: null, frame: null, badges: [] };
const settle = <T>(value: T | typeof TIMEOUT): T | null => (value === TIMEOUT ? null : value);
const hasEffectArt = (effect: ProfileEffect | null | undefined): effect is ProfileEffect => Boolean(effect && (effect.staticUrl || effect.layers?.length));

async function loadStored(userId: string, settings: Settings): Promise<ProfileExtras | null> {
  const cached = storedCache.get(userId, settings.now());
  if (cached) return cached.value;
  const stored = await settings.store!.load(userId);
  storedCache.set(userId, stored, STORED_TTL_MS, settings.now());
  if (stored) savedCache.set(userId, JSON.stringify(stored), SAVED_TTL_MS, settings.now());
  return stored;
}

/** The live profile with its catalog art, waiting as long as the lookups take; `null` while any art is missing. */
async function withFullArt(profile: ProfileExtras, settings: Settings): Promise<ProfileExtras | null> {
  const [details, frame] = await Promise.all([
    profile.effect ? lookupEffect(profile.effect.skuId, settings) : null,
    profile.frame ? lookupFrame(profile.frame.skuId, settings) : null,
  ]);
  if ((profile.effect && !details) || (profile.frame && !frame)) return null;
  return { ...profile, effect: profile.effect && details ? { skuId: profile.effect.skuId, ...details } : null, frame };
}

/** Saves a complete live profile as the user's last good one, skipping unchanged writes. */
async function remember(userId: string, profile: ProfileExtras, settings: Settings): Promise<void> {
  if (!settings.store) return;
  const json = JSON.stringify(profile);
  if (savedCache.get(userId, settings.now())?.value === json) return;
  savedCache.set(userId, json, SAVED_TTL_MS, settings.now());
  storedCache.set(userId, profile, STORED_TTL_MS, settings.now());
  await settings.store.save(userId, profile);
}

/** Art for an effect SKU: stored art for the same SKU first (catalog entries do not change), then the catalog. */
async function resolveEffect(skuId: string, stored: ProfileExtras | null, settings: Settings, deadline: number): Promise<{ effect: ProfileEffect; ready: boolean }> {
  if (stored?.effect?.skuId === skuId && hasEffectArt(stored.effect)) return { effect: stored.effect, ready: true };
  const details = settle(await within(lookupEffect(skuId, settings), deadline - Date.now()));
  return details ? { effect: { skuId, ...details }, ready: true } : { effect: { skuId }, ready: false };
}

async function resolveFrame(skuId: string, stored: ProfileExtras | null, settings: Settings, deadline: number): Promise<{ frame: ProfileFrame | null; ready: boolean }> {
  if (stored?.frame?.skuId === skuId) return { frame: stored.frame, ready: true };
  const frame = settle(await within(lookupFrame(skuId, settings), deadline - Date.now()));
  return { frame, ready: frame !== null };
}

/**
 * Profile extras plus completeness. Never throws and never waits longer than the budget.
 *
 * The effect and frame come from, in order: a live mirror answer within the budget, the user's Lanyard KV
 * declaration (`profile_effect` / `profile_frame`), then the last good profile in the durable store.
 * Every other field comes from the live answer, else the store. Complete live answers are saved to the store
 * in the background (`settled`), so cold starts and mirror outages fall back to them.
 */
export async function lookupProfileExtras(userId: string, options: ProfileProviderOptions = {}): Promise<ProfileLookup> {
  try {
    if (!SNOWFLAKE.test(userId)) return { profile: null, complete: true, settled: SETTLED };
    const settings = settingsFrom(options);
    const live = Boolean(settings.token || settings.mirror);
    if (!live && !settings.store && !options.declared) return { profile: null, complete: true, settled: SETTLED };
    const deadline = Date.now() + settings.budgetMs;
    const key = `${settings.mirror ?? "-"}|${settings.token ? "bot" : "-"}|${userId}`;
    const cached = live ? profileCache.get(key, settings.now()) : undefined;
    const base: Promise<LiveProfile | null> = !live ? Promise.resolve(null) : cached ? Promise.resolve(cached.value) : (profileInflight.get(key) ?? startProfileLoad(key, userId, settings));
    // The store is only read when this instance has no current cosmetics of its own.
    const storedLoad = settings.store && !cached?.value?.cosmetics ? loadStored(userId, settings) : Promise.resolve(null);
    const declaredLoad = Promise.resolve(options.declared ?? null).catch(() => null);
    // Finish the art lookups even after the budget, then keep a complete live answer for later cold starts.
    const settled = base.then(async (value) => {
      const full = value ? await withFullArt(value.profile, settings) : null;
      if (full && value?.cosmetics) await remember(userId, full, settings);
    }).then(() => undefined, () => undefined);

    const [fresh, stored, declared] = await Promise.all([
      within(base, settings.budgetMs).then(settle),
      within(storedLoad, settings.budgetMs).then(settle),
      within(declaredLoad, settings.budgetMs).then(settle),
    ]);
    const current = fresh?.cosmetics ? fresh.profile : null;
    const profileBase = current ?? stored ?? fresh?.profile ?? (declared ? EMPTY_PROFILE : null);
    if (!profileBase) return { profile: null, complete: !live, settled };
    // Fields other than cosmetics are final when they come from a mirror answer, the store, or a deployment without a mirror.
    const baseReady = Boolean(current || stored || (fresh && !settings.mirror) || !live);
    const choose = (kind: "effect" | "frame"): { sku: string | null; known: boolean } => {
      if (current) return { sku: current[kind]?.skuId ?? null, known: true };
      if (declared?.[kind] !== undefined) return { sku: declared[kind] ?? null, known: true };
      if (stored) return { sku: stored[kind]?.skuId ?? null, known: true };
      return { sku: null, known: !settings.mirror };
    };
    const effectChoice = choose("effect");
    const frameChoice = choose("frame");
    const [effect, frame] = await Promise.all([
      effectChoice.sku ? resolveEffect(effectChoice.sku, stored, settings, deadline) : { effect: null, ready: true },
      frameChoice.sku ? resolveFrame(frameChoice.sku, stored, settings, deadline) : { frame: null, ready: true },
    ]);
    return {
      profile: { ...profileBase, effect: effect.effect, frame: frame.frame },
      complete: baseReady && effectChoice.known && frameChoice.known && effect.ready && frame.ready,
      settled,
    };
  } catch {
    return { profile: null, complete: false, settled: SETTLED };
  }
}

/** Profile extras for a Discord user, or `null`. Never throws and never waits longer than the budget. */
export async function fetchProfileExtras(userId: string, options: ProfileProviderOptions = {}): Promise<ProfileExtras | null> {
  return (await lookupProfileExtras(userId, options)).profile;
}
