import { beforeEach, expect, it } from "vitest";
import { clearProfileCache, fetchProfileExtras, parseDstnProfile, parseFrameProduct } from "@/lib/discord/profile";
import { frameGeometry, frameLayerSources } from "@/card/parts/profile-frame";
import { parseOptions } from "@/lib/options";
import { serializeOptions } from "@/lib/embed";
import { frameCardData } from "./fixtures/profile-extras";
import { getTheme } from "@/card/theme-registry";
import { renderInlinedSvg } from "@/lib/svg/render";
import { inlineAssets } from "@/lib/svg/assets";
import { readFileSync } from "node:fs";

export const sku = "1484726324580061191";
export const product = { name: "Crystals (Amethyst)", styles: { background_colors: [4597896, 6240130] }, items: [{ type: 3, sku_id: sku, label: "Purple crystals", inner_width: 1200, overflow_top: 304, overflow_bottom: 60, overflow_horizontal: 56, layers: [{ id: "1514422966870347837", order: "front", anchor: "top" }, { id: "1514422970251083806", order: "back", anchor: "bottom" }] }] };
const id = "983724520789655613";
beforeEach(clearProfileCache);
it("reads type 3 and ignores expired or malformed collectible references", () => {
  const parse = (ref: unknown) => parseDstnProfile(id, { user: { id }, user_profile: { collectibles: [ref] } }, { now: 2000000000000 });
  expect(parse({ type: 3, sku_id: sku })?.frame?.skuId).toBe(sku);
  expect(parse({ type: 3, sku_id: sku, expires_at: 1 })?.frame).toBeNull();
  expect(parse({ type: 3, sku_id: sku, expires_at: "2000-01-01T00:00:00Z" })?.frame).toBeNull();
  expect(parse({ type: 3, sku_id: "../bad" })?.frame).toBeNull();
});
it("validates catalog geometry and derives trusted layer URLs", () => {
  expect(parseFrameProduct(sku, product)?.layers[0]?.url).toBe(`https://cdn.discordapp.com/media/v1/collectibles-shop/${sku}/1514422966870347837/static`);
  expect(parseFrameProduct(sku, { items: [] })).toBeNull();
  expect(parseFrameProduct(sku, { ...product, items: [{ ...product.items[0], inner_width: 0 }] })).toBeNull();
});
it("scales overflow around the card and anchors layers to top/bottom", () => {
  const geometry = frameGeometry({ width: 600, height: 400 }, parseFrameProduct(sku, product));
  expect(geometry).toMatchObject({ width: 656, height: 582, left: 28, top: 152, scale: .5, layerWidth: 656 });
  expect(geometry.layers[0]).toMatchObject({ left: 0, top: 0 });
  expect(geometry.layers[1]).toMatchObject({ left: 0, bottom: 0 });
  expect(frameLayerSources("https://cdn.discordapp.com/layer", 460, 1312 / 716)[0]).toBe("https://cdn.discordapp.com/layer?format=webp&width=460&height=251");
});
it("discovers PNG dimensions from a cancelled header stream before caching the frame", async () => {
  let cancelled = 0;
  const header = new Uint8Array(24);
  header.set([137,80,78,71,13,10,26,10]); header.set([73,72,68,82],12);
  new DataView(header.buffer).setUint32(16,1312); new DataView(header.buffer).setUint32(20,716);
  const profile = await fetchProfileExtras(id, { botToken: "", fetchImpl: async (input) => {
    const url = String(input);
    if (url.includes("/profile/")) return Response.json({ user: { id }, user_profile: { collectibles: [{ type:3, sku_id:sku }] } });
    if (url.includes("collectibles-products")) return Response.json(product);
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(header); }, cancel() { cancelled++; } }));
  } });
  expect(cancelled).toBe(2);
  expect(profile?.frame?.layers[0]).toMatchObject({ width:1312, height:716 });
});
it("falls back to no frame when its product is missing", async () => {
  const profile = await fetchProfileExtras(id, { botToken: "", fetchImpl: async (input) => String(input).includes("/profile/") ? Response.json({ user: { id }, user_profile: { collectibles: [{ type: 3, sku_id: sku }] } }) : new Response(null, { status: 404 }) });
  expect(profile?.frame).toBeNull();
});
it("parses hide_frame independently and omits its embed default", () => {
  expect(parseOptions({ hide_frame: "true" }).hide_frame).toBe(true);
  expect(parseOptions({ hide_frame: "bad" }).hide_frame).toBe(false);
  expect(serializeOptions(parseOptions()).has("hide_frame")).toBe(false);
  expect(serializeOptions(parseOptions({ hide_frame: "true" })).get("hide_frame")).toBe("true");
});
it("loads sized WebP then sized PNG then plain, bounded by the frame byte cap", async () => {
  const base = `https://cdn.discordapp.com/media/v1/collectibles-shop/${sku}/1514422970251083806/static`;
  const urls: string[] = [];
  const png = readFileSync(new URL("./fixtures/profile-pixel.png", import.meta.url));
  const assets = await inlineAssets([{ url: `${base}?format=webp&width=460&height=460`, fallback: [`${base}?width=460&height=460`, base] }], {
    lookup: async () => [{ address: "8.8.8.8", family: 4 }],
    download: async (url, _address, _signal, limit) => { urls.push(url.href); expect(limit).toBe(163840); if (url.search) throw new Error("404"); return { mime: "image/png", bytes: png }; },
  });
  expect(urls).toHaveLength(3);
  expect(assets(urls[0]!)).toMatch(/^data:image\/png/);
});
it("a failed frame image leaves a stable measured canvas without any broken layer", async () => {
  const data = frameCardData(), options = parseOptions();
  expect(getTheme("profile").measure(data, options)).toEqual({ width: 460, height: 631 });
  const svg = await renderInlinedSvg(data, options, undefined, { lookup: async () => [], download: async () => { throw new Error("offline"); } });
  expect(svg).toContain('class="pf-frame-canvas"');
  expect(svg).toContain('width="460" height="631"');
  expect(svg).not.toContain('aria-label="Large purple');
  expect(getTheme("profile").measure(data, { ...options, hide_frame: true })).toEqual({ width: 420, height: 524 });
});
it("fetches both collectibles in parallel and caches catalog data beyond profile expiry", async () => {
  let now = 2000000000000;
  const seen: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input); seen.push(url);
    if (url.includes("/profile/")) return Response.json({ user: { id }, user_profile: { collectibles: [{ type: 1, sku_id: "1139323093991575696" }, { type: 3, sku_id: sku }] } });
    return Response.json(url.endsWith(sku) ? { ...product, items: [{ ...product.items[0], layers: product.items[0]!.layers.map((layer) => ({ ...layer, width: 1312, height: 716 })) }] } : { items: [{ type: 1, sku_id: "1139323093991575696" }] });
  };
  expect((await fetchProfileExtras(id, { fetchImpl, botToken: "", now: () => now }))?.frame?.layers).toHaveLength(2);
  now += 11 * 60000;
  await fetchProfileExtras(id, { fetchImpl, botToken: "", now: () => now });
  expect(seen.filter((url) => url.includes("/collectibles-products/"))).toHaveLength(2);
  expect(seen.filter((url) => url.includes("/profile/"))).toHaveLength(2);
});
