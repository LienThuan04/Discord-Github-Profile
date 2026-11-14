/**
 * Durable "last good profile" per user, so a card keeps its profile frame, effect and badges when the
 * live sources are slow (cold start) or gone (the unofficial mirror is down or blocks the host).
 *
 * Backed by Upstash Redis over its REST API (plain `fetch`, works on Vercel and Cloudflare). It turns on
 * when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` or Vercel's `KV_REST_API_URL`/`KV_REST_API_TOKEN`
 * are set; `PROFILE_STORE=off` disables it. Without them the provider behaves as before.
 *
 * Entries hold only the normalized public profile the card shows. Every art URL must point at Discord's
 * CDN, so a tampered entry cannot make the card load images from anywhere else. Calls never throw.
 */

import { z } from "zod";
import type { ProfileExtras } from "./profile";

export interface ProfileStore {
  /** The last good profile for this user, or `null`. Never throws. */
  load(userId: string): Promise<ProfileExtras | null>;
  /** Never throws. */
  save(userId: string, profile: ProfileExtras): Promise<void>;
}

/** Ninety days, refreshed on every read, so active cards never lose their entry. */
export const PROFILE_STORE_TTL_SECONDS = 90 * 24 * 60 * 60;
const KEY_PREFIX = "dgp:profile:v1:";
const LOAD_TIMEOUT_MS = 800;
const SAVE_TIMEOUT_MS = 3000;

const snowflake = z.string().regex(/^\d{17,20}$/);
const cdnUrl = z.string().max(2048).startsWith("https://cdn.discordapp.com/");
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const size = z.number().int().positive().max(16384);
const offset = z.number().finite();

const profileSchema = z.object({
  bannerUrl: z.object({ static: cdnUrl, animated: cdnUrl.optional() }).nullable(),
  bannerColor: hex.nullable(),
  themeColors: z.tuple([hex, hex]).nullable(),
  bio: z.string().max(4000).nullable(),
  pronouns: z.string().max(200).nullable(),
  effect: z.object({
    skuId: snowflake,
    title: z.string().max(200).optional(),
    staticUrl: cdnUrl.optional(),
    animatedUrl: cdnUrl.optional(),
    layers: z.array(z.object({ url: cdnUrl, width: size, height: size, x: offset, y: offset, start: offset, duration: offset, loop: z.boolean(), loopDelay: offset, zIndex: offset })).max(16).optional(),
  }).nullable(),
  frame: z.object({
    skuId: snowflake,
    name: z.string().max(200),
    label: z.string().max(1000),
    layers: z.array(z.object({ id: snowflake, order: z.enum(["front", "back"]), anchor: z.enum(["top", "bottom"]), url: cdnUrl, width: size.optional(), height: size.optional() })).min(1).max(8),
    innerWidth: z.number().int().min(100).max(4096),
    overflowTop: z.number().int().nonnegative().max(4096),
    overflowBottom: z.number().int().nonnegative().max(4096),
    overflowHorizontal: z.number().int().nonnegative().max(4096),
    colors: z.array(hex).max(8).optional(),
  }).nullable(),
  badges: z.array(z.object({ id: z.string().max(100), description: z.string().max(300), iconUrl: cdnUrl, link: z.string().max(2048).startsWith("https://").optional() })).max(64),
});

const envelopeSchema = z.object({ v: z.literal(1), id: snowflake, savedAt: z.number(), profile: profileSchema });

/** Validates one stored entry for `userId`; anything unexpected reads as a miss. */
export function parseStoredProfile(userId: string, raw: unknown): ProfileExtras | null {
  if (typeof raw !== "string") return null;
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return null; }
  const parsed = envelopeSchema.safeParse(body);
  return parsed.success && parsed.data.id === userId ? (parsed.data.profile as ProfileExtras) : null;
}

export function upstashProfileStore({ url, token, fetchImpl = globalThis.fetch }: { url: string; token: string; fetchImpl?: typeof fetch }): ProfileStore {
  const endpoint = url.replace(/\/+$/, "");
  async function command(args: (string | number)[], timeoutMs: number): Promise<unknown> {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as { result?: unknown; error?: unknown };
    if (body.error) throw new Error(String(body.error));
    return body.result;
  }
  return {
    async load(userId) {
      try {
        return parseStoredProfile(userId, await command(["GETEX", KEY_PREFIX + userId, "EX", PROFILE_STORE_TTL_SECONDS], LOAD_TIMEOUT_MS));
      } catch { return null; }
    },
    async save(userId, profile) {
      try {
        await command(["SET", KEY_PREFIX + userId, JSON.stringify({ v: 1, id: userId, savedAt: Date.now(), profile }), "EX", PROFILE_STORE_TTL_SECONDS], SAVE_TIMEOUT_MS);
      } catch { /* The next good lookup tries again. */ }
    },
  };
}

/** The configured store, or `null` when no Upstash/Vercel KV credentials are set. */
export function profileStoreFromEnv(env: Record<string, string | undefined> = process.env, fetchImpl?: typeof fetch): ProfileStore | null {
  if ((env.PROFILE_STORE ?? "").trim().toLowerCase() === "off") return null;
  const url = (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || "").trim();
  const token = (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || "").trim();
  if (!url || !token) return null;
  try {
    const parsed = new URL(url);
    // Plain HTTP only for a local Redis REST proxy during development.
    const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) return null;
  } catch { return null; }
  return upstashProfileStore({ url, token, ...(fetchImpl ? { fetchImpl } : {}) });
}
