import { describe, expect, it, vi } from "vitest";
import { parseStoredProfile, profileStoreFromEnv, upstashProfileStore, PROFILE_STORE_TTL_SECONDS } from "@/lib/discord/profile-store";
import type { ProfileExtras } from "@/lib/discord/profile";

const ID = "983724520789655613";
const CDN = "https://cdn.discordapp.com";
const profile: ProfileExtras = {
  bannerUrl: { static: `${CDN}/banners/${ID}/abc.webp?size=600` },
  bannerColor: "#8b6dd8",
  themeColors: null,
  bio: "https://example.com is my site",
  pronouns: null,
  effect: {
    skuId: "1139323093991575696", title: "Sakura Dreams", staticUrl: `${CDN}/assets/content/still`, animatedUrl: `${CDN}/assets/content/base`,
    layers: [{ url: `${CDN}/assets/content/base`, width: 450, height: 880, x: 0, y: 0, start: 0, duration: 2880, loop: true, loopDelay: 0, zIndex: 100 }],
  },
  frame: {
    skuId: "1484726324580061191", name: "Crystals (Amethyst)", label: "Purple crystals", innerWidth: 1200, overflowTop: 304, overflowBottom: 0, overflowHorizontal: 56,
    layers: [{ id: "1514422966870347837", order: "front", anchor: "top", url: `${CDN}/media/v1/collectibles-shop/1484726324580061191/1514422966870347837/static`, width: 1312, height: 716 }],
    colors: ["#462888", "#5f3782"],
  },
  badges: [{ id: "quest_completed", description: "Completed a Quest", iconUrl: `${CDN}/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png`, link: "https://discord.com/discovery/quests" }],
};
const envelope = (value: unknown, id = ID) => JSON.stringify({ v: 1, id, savedAt: 1, profile: value });
/** A fake Upstash REST endpoint backed by a Map. */
function upstash(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
    const [command, key, value] = JSON.parse(String(init?.body)) as string[];
    if (command === "GETEX") return Response.json({ result: data.get(key!) ?? null });
    if (command === "SET") { data.set(key!, value!); return Response.json({ result: "OK" }); }
    return Response.json({ error: "unknown command" }, { status: 400 });
  });
  return { data, fetchImpl };
}

describe("parseStoredProfile()", () => {
  it("round-trips a complete profile, including a bio that starts with a link", () => {
    expect(parseStoredProfile(ID, envelope(profile))).toEqual(profile);
  });
  it("rejects another user's entry, other versions and malformed JSON", () => {
    expect(parseStoredProfile(ID, envelope(profile, "123456789012345678"))).toBeNull();
    expect(parseStoredProfile(ID, JSON.stringify({ v: 2, id: ID, savedAt: 1, profile }))).toBeNull();
    expect(parseStoredProfile(ID, "{not json")).toBeNull();
    expect(parseStoredProfile(ID, null)).toBeNull();
  });
  it("rejects art that does not come from Discord's CDN", () => {
    const evil = { ...profile, effect: { ...profile.effect!, staticUrl: "https://evil.example/x.png" } };
    expect(parseStoredProfile(ID, envelope(evil))).toBeNull();
    const evilFrame = { ...profile, frame: { ...profile.frame!, layers: [{ ...profile.frame!.layers[0]!, url: "http://cdn.discordapp.com/x" }] } };
    expect(parseStoredProfile(ID, envelope(evilFrame))).toBeNull();
  });
});

describe("upstashProfileStore()", () => {
  it("saves with a long expiry and loads while refreshing the expiry", async () => {
    const { data, fetchImpl } = upstash();
    const store = upstashProfileStore({ url: "https://store.example", token: "secret", fetchImpl });
    await store.save(ID, profile);
    const [, init] = fetchImpl.mock.calls[0]!;
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer secret");
    expect(JSON.parse(String(init?.body))).toEqual(["SET", `dgp:profile:v1:${ID}`, expect.any(String), "EX", PROFILE_STORE_TTL_SECONDS]);
    expect(data.size).toBe(1);
    expect(await store.load(ID)).toEqual(profile);
    expect(JSON.parse(String(fetchImpl.mock.calls[1]![1]?.body))).toEqual(["GETEX", `dgp:profile:v1:${ID}`, "EX", PROFILE_STORE_TTL_SECONDS]);
  });
  it("never throws: errors, bad responses and misses load as null", async () => {
    for (const fetchImpl of [
      vi.fn<typeof fetch>(async () => { throw new TypeError("offline"); }),
      vi.fn<typeof fetch>(async () => new Response("nope", { status: 500 })),
      vi.fn<typeof fetch>(async () => Response.json({ error: "WRONGPASS" })),
      upstash().fetchImpl,
    ]) {
      const store = upstashProfileStore({ url: "https://store.example", token: "t", fetchImpl });
      await expect(store.load(ID)).resolves.toBeNull();
      await expect(store.save(ID, profile)).resolves.toBeUndefined();
    }
  });
});

describe("profileStoreFromEnv()", () => {
  it("accepts Upstash and Vercel KV variable names over HTTPS only", () => {
    expect(profileStoreFromEnv({})).toBeNull();
    expect(profileStoreFromEnv({ UPSTASH_REDIS_REST_URL: "https://a.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t" })).not.toBeNull();
    expect(profileStoreFromEnv({ KV_REST_API_URL: "https://a.upstash.io", KV_REST_API_TOKEN: "t" })).not.toBeNull();
    expect(profileStoreFromEnv({ KV_REST_API_URL: "http://a.upstash.io", KV_REST_API_TOKEN: "t" })).toBeNull();
    expect(profileStoreFromEnv({ KV_REST_API_URL: "http://127.0.0.1:8079", KV_REST_API_TOKEN: "t" })).not.toBeNull();
    expect(profileStoreFromEnv({ KV_REST_API_URL: "http://localhost.evil.example", KV_REST_API_TOKEN: "t" })).toBeNull();
    expect(profileStoreFromEnv({ KV_REST_API_URL: "https://a.upstash.io" })).toBeNull();
    expect(profileStoreFromEnv({ KV_REST_API_URL: "https://a.upstash.io", KV_REST_API_TOKEN: "t", PROFILE_STORE: "off" })).toBeNull();
  });
});
