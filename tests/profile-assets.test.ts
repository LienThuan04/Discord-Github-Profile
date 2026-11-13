import { describe, expect, it, vi } from "vitest";
import { bannerSource } from "@/lib/discord/cdn";
import type { ProfileExtras } from "@/lib/discord/profile";
import { assetRole, inlineAssets, PLACEHOLDER, profileAssetRequests } from "@/lib/svg/assets";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64");
/** A PNG of roughly `size` bytes; only the signature is checked by the inliner. */
const pngOf = (size: number) => Buffer.concat([PNG, Buffer.alloc(Math.max(0, size - PNG.length))]);
const lookup = async () => [{ address: "93.184.216.34", family: 4 }];
const ID = "983724520789655613";
const CDN = "https://cdn.discordapp.com";
const STATIC_FRAME = `${CDN}/assets/content/196b75b6dc1ea082963c8c69c0ddc2c31efcaf18ee09f517e12760b3a105f790`;
const BASE_LAYER = `${CDN}/assets/content/4d89d846e27e98e767e31222a16adb13cdf0fa8e55431827fb728a38b230d229`;
const BADGE = `${CDN}/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png`;

const profile: ProfileExtras = { frame: null,
  bannerUrl: bannerSource(ID, "a_0123456789abcdef0123456789abcdef"),
  bannerColor: "#8b6dd8", themeColors: null, bio: null, pronouns: null,
  effect: { skuId: "1139323093991575696", staticUrl: STATIC_FRAME, animatedUrl: BASE_LAYER },
  badges: [{ id: "quest_completed", description: "Completed a Quest", iconUrl: BADGE }],
};

describe("profile extras in the inlined asset set", () => {
  it("lists static art only when animated=false", () => {
    const requests = profileAssetRequests(profile, { animated: false });
    expect(requests).toEqual([
      { url: profile.bannerUrl!.static, kind: "image" },
      { url: STATIC_FRAME, kind: "image" },
      { url: BADGE, kind: "image" },
    ]);
    expect(requests.some((request) => request.url.includes("animated=true") || request.url === BASE_LAYER)).toBe(false);
  });

  it("lists animated art with a static fallback when animated=true", () => {
    expect(profileAssetRequests(profile, { animated: true })).toEqual([
      { url: profile.bannerUrl!.animated, kind: "image", fallback: profile.bannerUrl!.static },
      { url: BASE_LAYER, kind: "image", fallback: STATIC_FRAME },
      { url: BADGE, kind: "image" },
    ]);
    expect(profileAssetRequests(null, { animated: true })).toEqual([]);
  });

  it("classifies profile art by Discord CDN path", () => {
    expect(assetRole(new URL(profile.bannerUrl!.static))).toBe("profile-banner");
    expect(assetRole(new URL(BASE_LAYER))).toBe("profile-effect");
    expect(assetRole(new URL(`${CDN}/assets/profile_effects/effects/2023-08-15/x/intro.png`))).toBe("profile-effect");
    expect(assetRole(new URL(BADGE))).toBe("badge-icon");
    expect(assetRole(new URL("https://example.com/banner.png"), "banner")).toBe("banner");
    expect(assetRole(new URL(`${CDN}/avatars/${ID}/c8996a80c144f90664d5d8cd9ebd0526.webp?size=128`))).toBe("image");
    expect(assetRole(new URL(`https://evil.example/badge-icons/x.png`))).toBe("image");
  });

  it("caps badge icons and effect frames tighter than ordinary images", async () => {
    const caps = new Map<string, number>();
    const download = vi.fn(async (url: URL, _address: unknown, _signal: AbortSignal, maxBytes: number) => {
      caps.set(url.href, maxBytes);
      return { mime: "image/png", bytes: pngOf(url.href === BADGE ? 70 * 1024 : 1024) };
    });
    const assets = await inlineAssets([{ url: BADGE }, { url: STATIC_FRAME }, { url: profile.bannerUrl!.static }], { lookup, download });
    expect(caps.get(BADGE)).toBe(64 * 1024);
    expect(caps.get(STATIC_FRAME)).toBe(384 * 1024);
    expect(caps.get(profile.bannerUrl!.static)).toBe(512 * 1024);
    expect(assets(BADGE)).toBe(PLACEHOLDER);
    expect(assets(STATIC_FRAME)).toMatch(/^data:image\/png;base64,/);
  });

  it("falls back to the still frame when an animated effect layer is too large", async () => {
    // The real Sakura Dreams base layer is a 2,122,918-byte APNG; its still frame is 10,332 bytes.
    const still = pngOf(10_332);
    const download = vi.fn(async (url: URL) => ({ mime: "image/png", bytes: url.href === BASE_LAYER ? pngOf(2_122_918) : still }));
    const assets = await inlineAssets([{ url: BASE_LAYER, fallback: STATIC_FRAME }], { lookup, download });
    expect(assets(BASE_LAYER)).toBe(`data:image/png;base64,${still.toString("base64")}`);
  });

  it("budgets identity art before decorative profile art", async () => {
    const avatar = `${CDN}/avatars/${ID}/c8996a80c144f90664d5d8cd9ebd0526.webp?size=128`;
    const animatedBanner = profile.bannerUrl!.animated!;
    const staticBanner = profile.bannerUrl!.static;
    const sizes = new Map([[animatedBanner, 300 * 1024], [staticBanner, 20 * 1024], [avatar, 300 * 1024]]);
    const download = vi.fn(async (url: URL) => ({ mime: "image/png", bytes: pngOf(sizes.get(url.href) ?? 1024) }));
    // The banner is requested first (it sits at the top of the card) but must not starve the avatar.
    const assets = await inlineAssets([{ url: animatedBanner, fallback: staticBanner }, { url: avatar }], { lookup, download, maxTotalBytes: 500 * 1024 });
    expect(assets(avatar)).not.toBe(PLACEHOLDER);
    expect(assets(animatedBanner)).toBe(`data:image/png;base64,${pngOf(20 * 1024).toString("base64")}`);
  });
});
