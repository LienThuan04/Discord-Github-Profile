import { lookup as dnsLookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { isIP, type LookupFunction } from "node:net";
import { request } from "node:https";
import type { AssetFallback, AssetKind, AssetResolver } from "@/card/types";
import { profileImages, type ProfileExtras } from "@/lib/discord/profile";

/** Tiny transparent PNG; failures never leave a remote or broken image in an SVG. */
export const PLACEHOLDER = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=";
export const ASSET_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net", "i.scdn.co", "i.ytimg.com", "static-cdn.jtvnw.net", "cdn.jsdelivr.net"]);
export interface AssetRequest { url: string; kind?: AssetKind; fallback?: AssetFallback }

/**
 * Size class of an image. `banner` is the privileged KV banner role (any public HTTPS host); the
 * `profile-*` and `badge-icon` roles are recognised by their Discord CDN path and need no privilege.
 */
export type AssetRole = "banner" | "profile-banner" | "profile-effect" | "profile-frame" | "badge-icon" | "image";
const ROLE_MAX_BYTES: Record<AssetRole, number> = {
  "banner": 2 * 1024 * 1024,
  "profile-banner": 512 * 1024,
  // Effect APNGs are huge (a real base layer is 2.1 MB); the still frame is ~10 KB.
  "profile-effect": 384 * 1024,
  "profile-frame": 160 * 1024,
  "badge-icon": 64 * 1024,
  "image": 512 * 1024,
};
/** Decorative art is budgeted after identity art, so a large banner cannot starve the avatar. */
const DECORATIVE_ROLES: ReadonlySet<AssetRole> = new Set(["banner", "profile-banner", "profile-effect", "profile-frame"]);

export function assetRole(url: URL, kind?: AssetKind): AssetRole {
  if (kind === "banner") return "banner";
  if (url.hostname !== "cdn.discordapp.com") return "image";
  if (url.pathname.startsWith("/banners/")) return "profile-banner";
  if (url.pathname.startsWith("/media/v1/collectibles-shop/")) return "profile-frame";
  if (url.pathname.startsWith("/assets/content/") || url.pathname.startsWith("/assets/profile_effects/")) return "profile-effect";
  if (url.pathname.startsWith("/badge-icons/")) return "badge-icon";
  return "image";
}

function isDecorative(item: AssetRequest): boolean {
  try { return DECORATIVE_ROLES.has(assetRole(new URL(item.url), item.kind)); } catch { return false; }
}

/**
 * Profile extras in the order a profile card shows them, static-only when `animated=false`.
 * Themes make the same `assets(url, "image", fallback)` calls through `profileImages()`.
 */
export function profileAssetRequests(profile: ProfileExtras | null | undefined, { animated }: { animated: boolean }): AssetRequest[] {
  const images = profileImages(profile, animated);
  return [images.banner, images.effect, ...images.badges].flatMap((choice) => (choice ? [{ url: choice.url, kind: "image" as const, ...(choice.fallback ? { fallback: choice.fallback } : {}) }] : []));
}

interface Download { mime: string; bytes: Buffer }
export interface InlineOptions {
  timeoutMs?: number;
  maxTotalBytes?: number;
  lookup?: (hostname: string) => Promise<LookupAddress[]>;
  download?: (url: URL, address: LookupAddress, signal: AbortSignal, maxBytes: number) => Promise<Download>;
}

/** Fail closed for special-use, local, mapped and transition ranges. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a = 0, b = 0, c = 0] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  if (family === 6) {
    const normalized = new URL(`https://[${address}]/`).hostname.slice(1, -1);
    const first = parseInt(normalized.split(":")[0]!, 16);
    if (!(first >= 0x2000 && first <= 0x3fff) || first === 0x2002) return false;
    if (first === 0x2001) {
      const second = parseInt(normalized.split(":")[1] || "0", 16);
      if (second <= 0x1ff || second === 0xdb8) return false;
    }
    return true;
  }
  return false;
}

/** Pin the already validated DNS address to the TLS connection; never follow redirects. */
async function downloadImage(url: URL, address: LookupAddress, signal: AbortSignal, maxBytes: number): Promise<Download> {
  return new Promise((resolve, reject) => {
    const lookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all) callback(null, [address]);
      else callback(null, address.address, address.family);
    };
    const req = request(url, { lookup, signal, headers: { Accept: "image/*", "User-Agent": "Discord-PULSE/0.1" } }, (response) => {
      const mime = (response.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();
      if (response.statusCode !== 200 || Number(response.headers["content-length"]) > maxBytes || !mime.startsWith("image/")) {
        response.destroy(); reject(new Error("Invalid image response")); return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxBytes) { response.destroy(new Error("Image size cap exceeded")); return; }
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => resolve({ mime, bytes: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.end();
  });
}

function validImage({ mime, bytes }: Download, url: URL): boolean {
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/gif") return /^GIF8[79]a/.test(bytes.subarray(0, 6).toString("ascii"));
  if (mime === "image/webp") return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  if (mime === "image/svg+xml" && url.hostname === "cdn.jsdelivr.net" && /^\/gh\/jdecked\/twemoji@16\.0\.1\/assets\/svg\/[a-f0-9-]+\.svg$/.test(url.pathname)) {
    const svg = bytes.toString("utf8");
    return /<svg[\s>]/.test(svg) && !/<!ENTITY|<!DOCTYPE|<script|<foreignObject|<image|<use|\bon\w+\s*=|(?:href|url)\s*[=(]/i.test(svg);
  }
  return false;
}

async function bounded<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

/** Parallel, bounded and deterministic. Banner privilege is never granted to ordinary image URLs. */
export async function inlineAssets(requests: AssetRequest[], options: InlineOptions = {}): Promise<AssetResolver> {
  const unique = new Map<string, AssetRequest>();
  for (const item of requests.slice(0, 64)) {
    if (!unique.has(item.url)) unique.set(item.url, item);
  }
  const signal = AbortSignal.timeout(options.timeoutMs ?? 4000);
  const dnsCache = new Map<string, Promise<LookupAddress[]>>();
  const resolveHost = (host: string): Promise<LookupAddress[]> => {
    let pending = dnsCache.get(host);
    if (!pending) {
      pending = (options.lookup ?? ((hostname) => dnsLookup(hostname, { all: true })))(host);
      dnsCache.set(host, pending);
    }
    return bounded(pending, signal);
  };
  async function fetchBatch(batch: AssetRequest[]): Promise<(Download | null)[]> {
    const out: (Download | null)[] = new Array(batch.length).fill(null);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(6, batch.length) }, async () => {
      while (cursor < batch.length && !signal.aborted) {
        const index = cursor++;
        const item = batch[index]!;
        try {
          const url = new URL(item.url);
          const host = url.hostname.replace(/^\[|\]$/g, "");
          if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || (item.kind !== "banner" && !ASSET_HOSTS.has(host))) continue;
          // jsDelivr is allowed only for our pinned emoji assets, never arbitrary npm/HTML content.
          if (host === "cdn.jsdelivr.net" && !/^\/gh\/jdecked\/twemoji@16\.0\.1\/assets\/svg\/[a-f0-9-]+\.svg$/.test(url.pathname)) continue;
          const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await resolveHost(host);
          if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) continue;
          const maxBytes = ROLE_MAX_BYTES[assetRole(url, item.kind)];
          const image = await bounded((options.download ?? downloadImage)(url, addresses[0]!, signal, maxBytes), signal);
          if (!image.bytes.length || image.bytes.length > maxBytes || !validImage(image, url)) continue;
          out[index] = image;
        } catch { /* A local placeholder is the intended fallback for every failed asset. */ }
      }
    }));
    return out;
  }
  const items = [...unique.values()];
  const loaded = await fetchBatch(items);
  const map = new Map<string, string>();
  const budget = options.maxTotalBytes ?? 660 * 1024;
  let bytes = 0;
  // Stable sort: request order within identity art, then within decorative art.
  const budgetOrder = items.map((_, index) => index).sort((a, b) => Number(isDecorative(items[a]!)) - Number(isDecorative(items[b]!)));
  for (const i of budgetOrder) {
    const item = items[i]!;
    const image = loaded[i];
    if (image && bytes + image.bytes.length <= budget) {
      bytes += image.bytes.length;
      map.set(item.url, `data:${image.mime};base64,${image.bytes.toString("base64")}`);
    }
  }
  const alternatives = (item: AssetRequest): readonly string[] => typeof item.fallback === "string" ? [item.fallback] : item.fallback ?? [];
  for (let step = 0; step < 3 && !signal.aborted; step++) {
    const pendingFallbacks = items.filter((item) => !map.has(item.url)).flatMap((item) => alternatives(item)[step] ?? []);
    if (!pendingFallbacks.length) break;
    const fallbackUrls = [...new Set(pendingFallbacks)].filter((url) => !map.has(url));
    const fallbackLoaded = await fetchBatch(fallbackUrls.map((url) => ({ url, kind: "image" })));
    for (let i = 0; i < fallbackUrls.length; i++) {
      const image = fallbackLoaded[i];
      if (image && bytes + image.bytes.length <= budget) {
        bytes += image.bytes.length;
        map.set(fallbackUrls[i]!, `data:${image.mime};base64,${image.bytes.toString("base64")}`);
      }
    }
    for (const item of items) {
      const fallback = alternatives(item)[step];
      if (!map.has(item.url) && fallback && map.has(fallback)) map.set(item.url, map.get(fallback)!);
    }
  }
  return (url) => map.get(url) ?? PLACEHOLDER;
}
