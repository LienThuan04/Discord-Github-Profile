import { beforeEach, describe, expect, it, vi } from "vitest";
import { bannerSource } from "@/lib/discord/cdn";
import { colorIntToHex } from "@/lib/discord/color";
import {
  clearProfileCache,
  fetchProfileExtras,
  mergeProfile,
  parseDstnProfile,
  parseEffectProduct,
  parseOfficialUser,
  preferredImage,
  profileImages,
  type ProfileExtras,
} from "@/lib/discord/profile";
import { emptyCardData, normalize } from "@/lib/lanyard/normalize";
import dstnSnapshot from "./fixtures/dstn-profile.json";
import effectProduct from "./fixtures/discord-effect-product.json";
import { demoUserPresence, FIXED_NOW } from "./fixtures";

const ID = "983724520789655613";
const SKU = "1139323093991575696";
const CDN = "https://cdn.discordapp.com";
const STATIC_FRAME = `${CDN}/assets/content/196b75b6dc1ea082963c8c69c0ddc2c31efcaf18ee09f517e12760b3a105f790`;
const BASE_LAYER = `${CDN}/assets/content/4d89d846e27e98e767e31222a16adb13cdf0fa8e55431827fb728a38b230d229`;
const LOOP_LAYER = `${CDN}/assets/content/865386444cad732750a74e393e3c3e14ccd5de4a5a2905e91e546e58b2603180`;

/** Shape documented for `GET /users/{id}`; synthetic because no bot token is available in tests. */
const officialUser = { id: ID, username: "lianharman", global_name: "LiênThuận", avatar: "c8996a80c144f90664d5d8cd9ebd0526", discriminator: "0", public_flags: 0, banner: "a_0123456789abcdef0123456789abcdef", accent_color: 16711680, banner_color: "#ff0000" };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
/** A fetch that never answers on its own but honours the abort signal, like a stalled socket. */
const stalled = (_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
  init?.signal?.addEventListener("abort", () => reject(init.signal!.reason), { once: true });
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
/** Routes the three upstream families; each handler can be swapped per test. */
function upstream(handlers: { official?: typeof fetch; dstn?: typeof fetch; product?: typeof fetch } = {}) {
  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://dcdn.dstn.to/profile/")) return (handlers.dstn ?? (async () => json(dstnSnapshot)))(input, init);
    if (url.includes("/collectibles-products/")) return (handlers.product ?? (async () => json(effectProduct)))(input, init);
    if (url.startsWith("https://discord.com/api/v10/users/")) return (handlers.official ?? (async () => json(officialUser)))(input, init);
    throw new Error(`unexpected request ${url}`);
  });
}
const calls = (fetchImpl: ReturnType<typeof upstream>, needle: string) => fetchImpl.mock.calls.filter(([input]) => String(input).includes(needle)).length;

beforeEach(() => clearProfileCache());

describe("profile parsing", () => {
  it("converts Discord integer colors to #rrggbb", () => {
    expect(colorIntToHex(9137624)).toBe("#8b6dd8");
  });

  it("parses the real dstn snapshot for the demo user", () => {
    const profile = parseDstnProfile(ID, dstnSnapshot, { now: FIXED_NOW });
    expect(profile).toEqual({
      frame: { skuId: "1484726324580061191", name: "", label: "", layers: [], innerWidth: 1200, overflowTop: 0, overflowBottom: 0, overflowHorizontal: 0 },
      bannerUrl: null,
      bannerColor: "#8b6dd8",
      themeColors: null,
      bio: "View my profile: https://example.com/\nPlaying games and shipping code.",
      pronouns: null,
      effect: { skuId: SKU },
      badges: [
        { id: "quest_completed", description: "Completed a Quest", iconUrl: `${CDN}/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png`, link: "https://discord.com/discovery/quests" },
        { id: "april_fools_2026", description: "Level 0 Reached", iconUrl: `${CDN}/badge-icons/ca105ad9cfc8580c765101d17bbb2323.png` },
        { id: "orb_profile_badge", description: "Collected the Orb Profile Badge", iconUrl: `${CDN}/badge-icons/83d8a1eb09a8d64e59233eec5d4d5c2d.png` },
      ],
    });
  });

  it("reads Nitro theme colors, banners and pronouns, and drops unsafe or malformed entries", () => {
    const profile = parseDstnProfile(ID, {
      user: { id: ID, banner: "a_0123456789abcdef0123456789abcdef", accent_color: null, banner_color: "#FF00B0" },
      user_profile: { bio: "  ", pronouns: " they/them ", theme_colors: [3146811, 8783962], profile_effect: null },
      badges: [
        { id: "good", description: "Good", icon: "0123456789abcdef0123456789abcdef", link: "javascript:alert(1)" },
        { id: "bad-icon", description: "Bad", icon: "../../evil" },
        "not a badge",
      ],
    }, { now: FIXED_NOW });
    expect(profile).toMatchObject({
      bannerUrl: { static: `${CDN}/banners/${ID}/a_0123456789abcdef0123456789abcdef.webp?size=600`, animated: `${CDN}/banners/${ID}/a_0123456789abcdef0123456789abcdef.webp?size=600&animated=true` },
      bannerColor: "#ff00b0",
      themeColors: ["#30043b", "#86085a"],
      bio: null,
      pronouns: "they/them",
      effect: null,
      badges: [{ id: "good", description: "Good", iconUrl: `${CDN}/badge-icons/0123456789abcdef0123456789abcdef.png` }],
    });
    expect(profile?.badges[0]).not.toHaveProperty("link");
  });

  it.each([[[1, 2, 3]], [[1]], [["#fff", 2]], [null]])("ignores invalid theme colors %j", (themeColors) => {
    expect(parseDstnProfile(ID, { user: { id: ID }, user_profile: { theme_colors: themeColors } }, { now: FIXED_NOW })?.themeColors).toBeNull();
  });

  it("drops an expired profile effect and rejects another user's payload", () => {
    const expired = { ...dstnSnapshot, user_profile: { ...dstnSnapshot.user_profile, profile_effect: { sku_id: SKU, expires_at: Math.floor(FIXED_NOW / 1000) - 1 } } };
    expect(parseDstnProfile(ID, expired, { now: FIXED_NOW })?.effect).toBeNull();
    expect(parseDstnProfile("123456789012345678", dstnSnapshot, { now: FIXED_NOW })).toBeNull();
    expect(parseDstnProfile(ID, { message: "Not found" }, { now: FIXED_NOW })).toBeNull();
  });

  it("parses the official user object: banner hash, accent_color and undocumented banner_color", () => {
    expect(parseOfficialUser(ID, officialUser)).toEqual({
      bannerUrl: { static: `${CDN}/banners/${ID}/a_0123456789abcdef0123456789abcdef.webp?size=600`, animated: `${CDN}/banners/${ID}/a_0123456789abcdef0123456789abcdef.webp?size=600&animated=true` },
      bannerColor: "#ff0000",
    });
    expect(parseOfficialUser(ID, { ...officialUser, banner: null, accent_color: null, banner_color: "#8B6DD8" })).toEqual({ bannerUrl: null, bannerColor: "#8b6dd8" });
    expect(parseOfficialUser(ID, { ...officialUser, banner: "../x", accent_color: null, banner_color: null })).toEqual({ bannerUrl: null, bannerColor: null });
    expect(parseOfficialUser(ID, { ...officialUser, id: "1" })).toBeNull();
  });

  it("builds static WebP banners with an animated variant only for a_ hashes", () => {
    expect(bannerSource("94490510688792576", "bb4bff6e0bfc94ea9e01d6ad31750494")).toEqual({ static: `${CDN}/banners/94490510688792576/bb4bff6e0bfc94ea9e01d6ad31750494.webp?size=600` });
    expect(bannerSource(ID, "a_abc", 480).animated).toBe(`${CDN}/banners/${ID}/a_abc.webp?size=480&animated=true`);
  });

  it("maps the real Sakura Dreams collectibles product to CDN art", () => {
    expect(parseEffectProduct(SKU, effectProduct)).toEqual({
      title: "Sakura Dreams",
      staticUrl: STATIC_FRAME,
      animatedUrl: BASE_LAYER,
      layers: [
        { url: BASE_LAYER, width: 450, height: 880, x: 0, y: 0, start: 0, duration: 2880, loop: true, loopDelay: 0, zIndex: 100 },
        { url: LOOP_LAYER, width: 450, height: 880, x: 0, y: 0, start: 2880, duration: 2880, loop: true, loopDelay: 2880, zIndex: 101 },
      ],
    });
  });

  it("refuses effect art outside the Discord CDN and products without an effect item", () => {
    const hostile = structuredClone(effectProduct);
    hostile.items[0]!.staticFrameSrc = "https://evil.example/frame.png";
    hostile.items[0]!.reducedMotionSrc = "http://cdn.discordapp.com/assets/content/x";
    hostile.items[0]!.effects[0]!.src = "https://cdn.discordapp.com.evil.example/assets/content/x";
    const parsed = parseEffectProduct(SKU, hostile);
    expect(parsed?.staticUrl).toBeUndefined();
    expect(parsed?.layers?.map((layer) => layer.url)).toEqual([LOOP_LAYER]);
    expect(parseEffectProduct(SKU, { ...effectProduct, items: [{ type: 0, sku_id: SKU }] })).toBeNull();
    expect(parseEffectProduct(SKU, { message: "Unknown SKU", code: 10027 })).toBeNull();
  });
});

describe("mergeProfile()", () => {
  const mirror = parseDstnProfile(ID, { ...dstnSnapshot, user: { ...dstnSnapshot.user, banner: "fedcba9876543210fedcba9876543210" } }, { now: FIXED_NOW });

  it("lets the official API win on banner and color, keeping mirror-only fields", () => {
    const merged = mergeProfile(parseOfficialUser(ID, officialUser), mirror);
    expect(merged?.bannerUrl?.static).toContain("a_0123456789abcdef0123456789abcdef");
    expect(merged?.bannerColor).toBe("#ff0000");
    expect(merged?.badges).toHaveLength(3);
    expect(merged?.effect).toEqual({ skuId: SKU });
    expect(merged?.bio).toContain("View my profile");
  });

  it("treats an official null as authoritative", () => {
    const merged = mergeProfile({ bannerUrl: null, bannerColor: null }, mirror);
    expect(merged?.bannerUrl).toBeNull();
    expect(merged?.bannerColor).toBeNull();
  });

  it("fills defaults for a single source and returns null when both fail", () => {
    expect(mergeProfile({ bannerUrl: null, bannerColor: "#8b6dd8" }, null)).toEqual({ frame: null, bannerUrl: null, bannerColor: "#8b6dd8", themeColors: null, bio: null, pronouns: null, effect: null, badges: [] });
    expect(mergeProfile(null, undefined)).toBeNull();
  });
});

describe("profile image selection", () => {
  const profile: ProfileExtras = { frame: null,
    bannerUrl: bannerSource(ID, "a_0123456789abcdef0123456789abcdef"), bannerColor: null, themeColors: null, bio: null, pronouns: null,
    effect: { skuId: SKU, staticUrl: STATIC_FRAME, animatedUrl: BASE_LAYER }, badges: [{ id: "x", description: "X", iconUrl: `${CDN}/badge-icons/0123456789abcdef0123456789abcdef.png` }],
  };

  it("prefers static variants when animated=false", () => {
    const images = profileImages(profile, false);
    expect(images.banner).toEqual({ url: profile.bannerUrl!.static });
    expect(images.effect).toEqual({ url: STATIC_FRAME });
    expect(images.badges).toEqual([{ url: profile.badges[0]!.iconUrl }]);
  });

  it("requests animated art with a static fallback when animated=true", () => {
    const images = profileImages(profile, true);
    expect(images.banner).toEqual({ url: profile.bannerUrl!.animated, fallback: profile.bannerUrl!.static });
    expect(images.effect).toEqual({ url: BASE_LAYER, fallback: STATIC_FRAME });
  });

  it("never animates an effect that has no still frame when animated=false", () => {
    expect(preferredImage({ animated: BASE_LAYER }, false)).toBeNull();
    expect(preferredImage({ animated: BASE_LAYER }, true)).toEqual({ url: BASE_LAYER });
    expect(profileImages(null, true)).toEqual({ banner: null, effect: null, badges: [] });
  });
});

describe("fetchProfileExtras()", () => {
  it("merges dstn with the effect product for the demo user without a bot token", async () => {
    const fetchImpl = upstream();
    const profile = await fetchProfileExtras(ID, { fetchImpl, provider: "dstn", botToken: "", now: () => FIXED_NOW });
    expect(profile?.bannerColor).toBe("#8b6dd8");
    expect(profile?.badges.map((badge) => badge.id)).toEqual(["quest_completed", "april_fools_2026", "orb_profile_badge"]);
    expect(profile?.effect).toMatchObject({ skuId: SKU, title: "Sakura Dreams", staticUrl: STATIC_FRAME, animatedUrl: BASE_LAYER });
    expect(calls(fetchImpl, "discord.com/api/v10/users/")).toBe(0);
    expect(fetchImpl.mock.calls.find(([input]) => String(input).includes("collectibles-products"))?.[0]).toBe(`https://discord.com/api/v10/collectibles-products/${SKU}`);
  });

  it("calls the official API in parallel with dstn when a bot token is configured", async () => {
    const official = deferred<Response>();
    const dstn = deferred<Response>();
    const fetchImpl = upstream({ official: () => official.promise, dstn: () => dstn.promise });
    const pending = fetchProfileExtras(ID, { fetchImpl, provider: "dstn", botToken: "test-token", now: () => FIXED_NOW });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
    const officialInit = fetchImpl.mock.calls.find(([input]) => String(input).includes("/users/"))?.[1];
    expect(new Headers(officialInit?.headers).get("authorization")).toBe("Bot test-token");
    expect(new Headers(officialInit?.headers).get("user-agent")).toMatch(/^DiscordBot \(/);
    official.resolve(json(officialUser));
    dstn.resolve(json(dstnSnapshot));
    const profile = await pending;
    expect(profile?.bannerColor).toBe("#ff0000");
    expect(profile?.bannerUrl?.animated).toContain("animated=true");
    expect(profile?.badges).toHaveLength(3);
  });

  it("uses only the official API when the mirror is disabled", async () => {
    const fetchImpl = upstream();
    const profile = await fetchProfileExtras(ID, { fetchImpl, provider: "off", botToken: "test-token", now: () => FIXED_NOW });
    expect(profile).toEqual({ frame: null, bannerUrl: parseOfficialUser(ID, officialUser)!.bannerUrl, bannerColor: "#ff0000", themeColors: null, bio: null, pronouns: null, effect: null, badges: [] });
    expect(calls(fetchImpl, "dstn")).toBe(0);
  });

  it("returns null without any request when no source is enabled or the ID is invalid", async () => {
    const fetchImpl = upstream();
    expect(await fetchProfileExtras(ID, { fetchImpl, provider: "off", botToken: "" })).toBeNull();
    expect(await fetchProfileExtras("not-an-id", { fetchImpl, provider: "dstn" })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reads the provider, base URL and token from the environment", async () => {
    vi.stubEnv("DISCORD_PROFILE_PROVIDER", "dstn");
    vi.stubEnv("DISCORD_PROFILE_PROVIDER_URL", "https://mirror.example/");
    vi.stubEnv("DISCORD_BOT_TOKEN", "");
    try {
      const fetchImpl = vi.fn<typeof fetch>(async () => json(dstnSnapshot));
      await fetchProfileExtras(ID, { fetchImpl, now: () => FIXED_NOW });
      expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(`https://mirror.example/profile/${ID}`);
      clearProfileCache();
      vi.stubEnv("DISCORD_PROFILE_PROVIDER", "off");
      fetchImpl.mockClear();
      expect(await fetchProfileExtras(ID, { fetchImpl })).toBeNull();
      expect(fetchImpl).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });

  it.each([
    ["HTTP 500", async () => json({ message: "boom" }, 500)],
    ["invalid JSON", async () => new Response("<html>", { status: 200 })],
    ["network error", async () => { throw new TypeError("fetch failed"); }],
    ["synchronous throw", () => { throw new Error("sync"); }],
  ] as [string, typeof fetch][])("returns null on %s and never throws", async (_name, dstn) => {
    // Without a bot token the mirror is the only request, so the handler can be the fetch itself.
    const fetchImpl = vi.fn<typeof fetch>(dstn);
    await expect(fetchProfileExtras(ID, { fetchImpl, provider: "dstn", botToken: "", now: () => FIXED_NOW })).resolves.toBeNull();
  });

  it("gives up after the time budget when every source stalls", async () => {
    const fetchImpl = upstream({ dstn: stalled, official: stalled });
    const started = performance.now();
    const profile = await fetchProfileExtras(ID, { fetchImpl, provider: "dstn", botToken: "t", budgetMs: 40, timeoutMs: 80, now: () => FIXED_NOW });
    expect(profile).toBeNull();
    expect(performance.now() - started).toBeLessThan(400);
  });

  it("keeps the default budget at or below 1500 ms", async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = upstream({ dstn: stalled });
      const pending = fetchProfileExtras(ID, { fetchImpl, provider: "dstn", botToken: "", now: () => FIXED_NOW });
      await vi.advanceTimersByTimeAsync(1500);
      await expect(pending).resolves.toBeNull();
    } finally { vi.useRealTimers(); }
  });

  it("returns the profile without effect art when only the effect lookup misses the budget, then fills it in", async () => {
    const product = deferred<Response>();
    const fetchImpl = upstream({ product: () => product.promise });
    const first = await fetchProfileExtras(ID, { fetchImpl, provider: "dstn", botToken: "", budgetMs: 60, now: () => FIXED_NOW });
    expect(first?.effect).toEqual({ skuId: SKU });
    expect(first?.badges).toHaveLength(3);
    product.resolve(json(effectProduct));
    await vi.waitFor(async () => expect((await fetchProfileExtras(ID, { fetchImpl, provider: "dstn", botToken: "", now: () => FIXED_NOW }))?.effect?.title).toBe("Sakura Dreams"));
    expect(calls(fetchImpl, "dcdn.dstn.to")).toBe(1);
    expect(calls(fetchImpl, `/collectibles-products/${SKU}`)).toBe(1);
  });

  it("lets a late mirror response fill the cache for the next request", async () => {
    const dstn = deferred<Response>();
    const fetchImpl = upstream({ dstn: () => dstn.promise });
    expect(await fetchProfileExtras(ID, { fetchImpl, provider: "dstn", botToken: "", budgetMs: 20, now: () => FIXED_NOW })).toBeNull();
    dstn.resolve(json(dstnSnapshot));
    await vi.waitFor(async () => expect(await fetchProfileExtras(ID, { fetchImpl, provider: "dstn", botToken: "", budgetMs: 20, now: () => FIXED_NOW })).not.toBeNull());
    expect(calls(fetchImpl, "dcdn.dstn.to")).toBe(1);
  });

  it("shares one upstream request between concurrent callers", async () => {
    const fetchImpl = upstream();
    const options = { fetchImpl, provider: "dstn", botToken: "", now: () => FIXED_NOW };
    const [a, b] = await Promise.all([fetchProfileExtras(ID, options), fetchProfileExtras(ID, options)]);
    expect(a).toEqual(b);
    expect(calls(fetchImpl, "dcdn.dstn.to")).toBe(1);
  });

  it("caches success for about ten minutes", async () => {
    let now = FIXED_NOW;
    const fetchImpl = upstream();
    const options = { fetchImpl, provider: "dstn", botToken: "", now: () => now };
    await fetchProfileExtras(ID, options);
    now += 9 * 60_000;
    await fetchProfileExtras(ID, options);
    expect(calls(fetchImpl, "dcdn.dstn.to")).toBe(1);
    now += 2 * 60_000;
    await fetchProfileExtras(ID, options);
    expect(calls(fetchImpl, "dcdn.dstn.to")).toBe(2);
    // The effect mapping is cached for much longer than the profile.
    expect(calls(fetchImpl, `/collectibles-products/${SKU}`)).toBe(1);
  });

  it("caches failure for about one minute", async () => {
    let now = FIXED_NOW;
    const fetchImpl = upstream({ dstn: async () => json({ message: "Not found" }, 404) });
    const options = { fetchImpl, provider: "dstn", botToken: "", now: () => now };
    expect(await fetchProfileExtras(ID, options)).toBeNull();
    now += 30_000;
    expect(await fetchProfileExtras(ID, options)).toBeNull();
    expect(calls(fetchImpl, "dcdn.dstn.to")).toBe(1);
    now += 31_000;
    await fetchProfileExtras(ID, options);
    expect(calls(fetchImpl, "dcdn.dstn.to")).toBe(2);
  });

  it("re-checks a degraded result sooner when one enabled source failed", async () => {
    let now = FIXED_NOW;
    const fetchImpl = upstream({ official: async () => json({ message: "401: Unauthorized" }, 401) });
    const options = { fetchImpl, provider: "dstn", botToken: "bad", now: () => now };
    expect((await fetchProfileExtras(ID, options))?.bannerColor).toBe("#8b6dd8");
    now += 61_000;
    await fetchProfileExtras(ID, options);
    expect(calls(fetchImpl, "/users/")).toBe(2);
  });
});

describe("CardData.profile", () => {
  it("defaults to null in normalize() and error cards", () => {
    expect(normalize(demoUserPresence, { now: FIXED_NOW }).profile).toBeNull();
    expect(emptyCardData(ID, FIXED_NOW).profile).toBeNull();
  });
});
