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
 * The module has no Node-only imports, so client code may import its types and the pure helpers.
 */

import { z } from "zod";
import { badgeIconUrl, bannerSource, DISCORD_API, type ImageSource } from "./cdn";
import { colorIntToHex, normalizeHex } from "./color";

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
const EFFECT_FAILURE_TTL_MS = 10 * 60_000;
export const DEFAULT_PROFILE_MIRROR_URL = "https://dcdn.dstn.to";
/** Discord asks bot clients to identify as `DiscordBot ($url, $version)`. */
const BOT_USER_AGENT = "DiscordBot (https://github.com/LienThuan04/Discord-Github-Profile, 0.1.0)";
const USER_AGENT = "Discord-Github-Profile/0.1";

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
}

interface Settings {
  fetchImpl: typeof fetch;
  token: string | null;
  mirror: string | null;
  api: string;
  budgetMs: number;
  timeoutMs: number;
  now: () => number;
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
const profileCache = new TtlCache<ProfileExtras | null>(500);
const profileInflight = new Map<string, Promise<ProfileExtras | null>>();
const effectCache = new TtlCache<EffectDetails | null>(256);
const effectInflight = new Map<string, Promise<EffectDetails | null>>();
const frameCache = new TtlCache<ProfileFrame | null>(256);
const frameInflight = new Map<string, Promise<ProfileFrame | null>>();

export function clearProfileCache(): void {
  generation++;
  profileCache.clear();
  profileInflight.clear();
  effectCache.clear();
  effectInflight.clear();
  frameCache.clear();
  frameInflight.clear();
}

async function getJson(settings: Settings, url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await settings.fetchImpl(url, { method: "GET", headers: { Accept: "application/json", ...headers }, signal: AbortSignal.timeout(settings.timeoutMs), cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** `undefined`: source disabled. `null`: source enabled but failed. */
async function loadProfile(userId: string, settings: Settings): Promise<{ profile: ProfileExtras | null; degraded: boolean }> {
  const [official, mirror] = await Promise.all([
    settings.token
      ? getJson(settings, `${settings.api}/users/${userId}`, { Authorization: `Bot ${settings.token}`, "User-Agent": BOT_USER_AGENT }).then((body) => parseOfficialUser(userId, body), () => null)
      : undefined,
    settings.mirror
      ? getJson(settings, `${settings.mirror}/profile/${userId}`, { "User-Agent": USER_AGENT }).then((body) => parseDstnProfile(userId, body, { now: settings.now() }), () => null)
      : undefined,
  ]);
  return { profile: mergeProfile(official, mirror), degraded: official === null || mirror === null };
}

function startProfileLoad(key: string, userId: string, settings: Settings): Promise<ProfileExtras | null> {
  const started = generation;
  const pending: Promise<ProfileExtras | null> = loadProfile(userId, settings)
    .then(({ profile, degraded }) => {
      if (started === generation) profileCache.set(key, profile, profile && !degraded ? SUCCESS_TTL_MS : FAILURE_TTL_MS, settings.now());
      return profile;
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

/** Profile extras for a Discord user, or `null`. Never throws and never waits longer than the budget. */
export async function fetchProfileExtras(userId: string, options: ProfileProviderOptions = {}): Promise<ProfileExtras | null> {
  try {
    if (!SNOWFLAKE.test(userId)) return null;
    const settings = settingsFrom(options);
    if (!settings.token && !settings.mirror) return null;
    const deadline = Date.now() + settings.budgetMs;
    const key = `${settings.mirror ?? "-"}|${settings.token ? "bot" : "-"}|${userId}`;
    const cached = profileCache.get(key, settings.now());
    const base = cached ? Promise.resolve(cached.value) : (profileInflight.get(key) ?? startProfileLoad(key, userId, settings));
    const profile = await within(base, settings.budgetMs);
    if (profile === TIMEOUT || !profile) return null;
    const [details, frame] = await Promise.all([
      profile.effect ? within(lookupEffect(profile.effect.skuId, settings), deadline - Date.now()) : null,
      profile.frame ? within(lookupFrame(profile.frame.skuId, settings), deadline - Date.now()) : null,
    ]);
    return { ...profile, effect: details && details !== TIMEOUT ? { skuId: profile.effect!.skuId, ...details } : profile.effect, frame: frame && frame !== TIMEOUT ? frame : null };
  } catch {
    return null;
  }
}
