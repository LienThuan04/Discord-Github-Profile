import { describe, expect, it, vi } from "vitest";
import { inlineAssets, isPublicAddress, PLACEHOLDER } from "@/lib/svg/assets";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64");
const lookup = async () => [{ address: "93.184.216.34", family: 4 }];

describe("asset security and budgets", () => {
  it.each(["127.0.0.1", "10.2.3.4", "172.16.0.1", "192.168.0.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "::", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "2001:db8::1"])("blocks non-public address %s", (ip) => expect(isPublicAddress(ip)).toBe(false));
  it.each(["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])("allows public address %s", (ip) => expect(isPublicAddress(ip)).toBe(true));
  it("inlines trusted assets, deduplicates URLs and substitutes missing images", async () => {
    const download = vi.fn(async () => ({ mime: "image/png", bytes: png }));
    const assets = await inlineAssets([{ url: "https://cdn.discordapp.com/embed/avatars/0.png" }, { url: "https://cdn.discordapp.com/embed/avatars/0.png" }, { url: "https://evil.example/image.png" }], { lookup, download });
    expect(assets("https://cdn.discordapp.com/embed/avatars/0.png")).toMatch(/^data:image\/png;base64,/);
    expect(assets("https://evil.example/image.png")).toBe(PLACEHOLDER);
    expect(download).toHaveBeenCalledTimes(1);
  });
  it("blocks banner private DNS, userinfo, HTTP, ports, mixed DNS and redirects", async () => {
    const download = vi.fn(async () => ({ mime: "image/png", bytes: png }));
    for (const url of ["http://example.com/x", "https://user:pass@example.com/x", "https://example.com:8443/x", "https://127.0.0.1/x"]) {
      const assets = await inlineAssets([{ url, kind: "banner" }], { lookup, download });
      expect(assets(url)).toBe(PLACEHOLDER);
    }
    const url = "https://banner.example/image.png";
    const assets = await inlineAssets([{ url, kind: "banner" }], { lookup: async () => [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.1", family: 4 }], download });
    expect(assets(url)).toBe(PLACEHOLDER);
    expect(download).not.toHaveBeenCalled();
  });
  it("uses a placeholder for non-images, invalid bytes, failures and oversize assets", async () => {
    const url = "https://cdn.discordapp.com/image.png";
    for (const download of [async () => ({ mime: "text/html", bytes: png }), async () => ({ mime: "image/png", bytes: Buffer.from("<html>") }), async () => ({ mime: "image/png", bytes: Buffer.alloc(2_100_000) }), async () => { throw new Error("timeout"); }]) {
      const assets = await inlineAssets([{ url }], { lookup, download });
      expect(assets(url)).toBe(PLACEHOLDER);
    }
  });
  it("falls back to a static image when the animated variant fails", async () => {
    const animated = "https://cdn.discordapp.com/emojis/232720527448342530.gif?size=32";
    const still = animated.replace(".gif", ".png");
    const staticImage = Buffer.concat([png, Buffer.from("static fallback")]);
    const assets = await inlineAssets([{ url: animated, fallback: still }], { lookup, download: async (url) => { if (url.pathname.endsWith(".gif")) throw new Error("415"); return { mime: "image/png", bytes: staticImage }; } });
    expect(assets(animated)).toMatch(/^data:image\/png;base64,/);
    expect(assets(animated)).not.toBe(PLACEHOLDER);
  });
  it("bounds a stalled DNS resolver without reaching the network", async () => {
    const url = "https://cdn.discordapp.com/image.png";
    const assets = await inlineAssets([{ url }], { timeoutMs: 5, lookup: () => new Promise(() => {}) });
    expect(assets(url)).toBe(PLACEHOLDER);
  });
  it("reuses a fallback already loaded as a primary request", async () => {
    const primary = "https://cdn.discordapp.com/missing.png", fallback = "https://cdn.discordapp.com/fallback.png";
    const download = vi.fn(async (url: URL) => { if (url.href === primary) throw new Error("404"); return { mime: "image/png", bytes: png }; });
    const assets = await inlineAssets([{ url: primary, fallback }, { url: fallback }], { lookup, download });
    expect(assets(primary)).toBe(assets(fallback));
    expect(download).toHaveBeenCalledTimes(2);
  });
  it("skips redundant fallback downloads when primary succeeds and deduplicates host DNS lookups", async () => {
    const animated = "https://cdn.discordapp.com/avatar-decoration-presets/a_test.webp?size=96&animated=true";
    const still = "https://cdn.discordapp.com/avatar-decoration-presets/a_test.png?size=96&passthrough=false";
    const other = "https://cdn.discordapp.com/embed/avatars/1.png";
    const lookupSpy = vi.fn(lookup);
    const downloadSpy = vi.fn(async () => ({ mime: "image/png", bytes: png }));
    const assets = await inlineAssets(
      [
        { url: animated, fallback: still },
        { url: other },
      ],
      { lookup: lookupSpy, download: downloadSpy },
    );
    expect(assets(animated)).toMatch(/^data:image\/png;base64,/);
    expect(assets(other)).toMatch(/^data:image\/png;base64,/);
    expect(downloadSpy).toHaveBeenCalledTimes(2);
    expect(lookupSpy).toHaveBeenCalledTimes(1);
  });
});
