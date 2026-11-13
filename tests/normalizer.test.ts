import { describe, expect, it, vi } from "vitest";
import { normalize } from "@/lib/lanyard/normalize";
import { fetchPresence, isSnowflake, withAppIcons } from "@/lib/lanyard/client";
import {
  demoUserPresence,
  FIXED_NOW,
  gamePresence,
  gradientNamePresence,
  notMonitoredResponse,
  offlinePresence,
  plainUserPresence,
  spotifyPresence,
  streamingPresence,
  watchingPresence,
} from "./fixtures";

describe("normalize()", () => {
  it.each([0, Math.floor(FIXED_NOW / 1000) - 1, Math.floor(FIXED_NOW / 1000)])("omits cosmetics expired at Unix second %s", (expires_at) => {
    const data = normalize({
      ...demoUserPresence,
      discord_user: { ...demoUserPresence.discord_user,
        avatar_decoration_data: { ...demoUserPresence.discord_user.avatar_decoration_data!, expires_at },
        collectibles: { nameplate: { ...demoUserPresence.discord_user.collectibles!.nameplate!, expires_at } },
      },
    }, { now: FIXED_NOW });
    expect(data.user.decoration).toBeNull();
    expect(data.user.nameplate).toBeNull();
  });

  it.each([undefined, null, Math.floor(FIXED_NOW / 1000) + 1])("keeps cosmetics with expiry %s", (expires_at) => {
    const data = normalize({
      ...demoUserPresence,
      discord_user: { ...demoUserPresence.discord_user,
        avatar_decoration_data: { ...demoUserPresence.discord_user.avatar_decoration_data!, expires_at },
        collectibles: { nameplate: { ...demoUserPresence.discord_user.collectibles!.nameplate!, expires_at } },
      },
    }, { now: FIXED_NOW });
    expect(data.user.decoration).not.toBeNull();
    expect(data.user.nameplate).not.toBeNull();
  });
  it("normalizes the real demo user snapshot (LiênThuận)", () => {
    const data = normalize(demoUserPresence, { now: FIXED_NOW });

    expect(data.now).toBe(FIXED_NOW);
    expect(data.user.id).toBe("983724520789655613");
    expect(data.user.username).toBe("lianharman");
    expect(data.user.displayName).toBe("LiênThuận");
    expect(data.user.legacyTag).toBeNull();
    expect(data.user.bot).toBe(false);
    expect(data.user.avatar.static).toBe(
      "https://cdn.discordapp.com/avatars/983724520789655613/c8996a80c144f90664d5d8cd9ebd0526.webp?size=128",
    );
    expect(data.user.decoration?.source.animated).toBe(
      "https://cdn.discordapp.com/avatar-decoration-presets/a_8c18ac604dd50ec43d571f18af63c79f.webp?size=96&animated=true",
    );
    expect(data.user.nameplate).toEqual({
      static:
        "https://cdn.discordapp.com/assets/collectibles/nameplates/pitter_patter/1495807265175900180/static.png",
      video:
        "https://cdn.discordapp.com/assets/collectibles/nameplates/pitter_patter/1495807265175900180/asset.webm",
      label: "Drizzling rain pattering over a small pond",
      palette: {
        name: "forest",
        label: "Forest",
        dark: "#2d5401",
        light: "#6aa624",
      },
    });
    expect(data.user.guildTag).toEqual({
      tag: "ᗪᗴᐯ",
      badge:
        "https://cdn.discordapp.com/guild-tag-badges/1369636126096097300/f199d66208891c43b51805e21b78bd4c.png?size=32",
      guildId: "1369636126096097300",
    });
    expect(data.status).toBe("online");
    expect(data.platforms).toEqual(["web"]);
    expect(data.customStatus).toEqual({
      text: "Nothing here to care about",
      emoji: null,
    });
    expect(data.activities).toEqual([]);
    expect(data.spotify).toBeNull();
  });

  it("normalizes rich game activity, badges, platforms, Twemoji custom status, and KV fields", () => {
    const data = normalize(gamePresence, { now: FIXED_NOW });

    expect(data.status).toBe("dnd");
    expect(data.platforms).toEqual(["desktop", "web", "mobile"]);
    expect(data.user.badges.map((b) => b.id)).toEqual([
      "hypesquad_brilliance",
      "active_developer",
      "early_supporter",
    ]);
    expect(data.customStatus).toEqual({
      text: "Shipping Phase 1",
      emoji: {
        name: "🔥",
        url: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@16.0.1/assets/svg/1f525.svg",
        custom: false,
      },
    });
    expect(data.activities).toHaveLength(1);
    const act = data.activities[0]!;
    expect(act.name).toBe("Visual Studio Code");
    expect(act.verb).toBe("Playing");
    expect(act.title).toBe("Playing");
    expect(act.details).toBe("Editing normalize.ts");
    expect(act.state).toBe("Workspace: Discord-Github-Profile");
    expect(act.party).toBe("2 of 4");
    expect(act.buttons).toEqual(["View Repository", "Open Card Studio"]);
    expect(act.largeImage?.url).toBe(
      "https://cdn.discordapp.com/app-assets/383226320970055681/1359298108856729682.png?size=128",
    );
    expect(act.smallImage?.url).toBe(
      "https://cdn.discordapp.com/app-assets/383226320970055681/1359298109074706533.png?size=64",
    );
    expect(data.kv).toEqual({
      bio: "Full-stack engineer building tools for the open web.",
      pronouns: "he/him",
      location: "Ho Chi Minh City, VN",
      website: {
        url: "https://github.com/LienThuan04",
        label: "github.com/LienThuan04",
      },
      banner: "https://cdn.discordapp.com/banners/983724520789655613/a_banner_hash.png",
      accent: "#5865f2",
    });
  });

  it("extracts Spotify and deduplicates the Spotify activity from activities[]", () => {
    const data = normalize(spotifyPresence, { now: FIXED_NOW });

    expect(data.spotify).toEqual({
      trackId: "4uLU6hMCjMI75M1A2tKUQC",
      song: "Never Gonna Give You Up",
      artist: "Rick Astley",
      album: "Whenever You Need Somebody",
      albumArt: "https://i.scdn.co/image/ab67616d00001e021fb3115e3b35b94a49d6fe20",
      timestamps: {
        start: FIXED_NOW - 83_400,
        end: FIXED_NOW + 126_600,
      },
    });
    expect(data.activities).toEqual([]);
  });

  it("normalizes streaming and watching activities", () => {
    const streamData = normalize(streamingPresence, { now: FIXED_NOW });
    expect(streamData.activities[0]?.title).toBe("Live on Twitch");
    expect(streamData.activities[0]?.url).toBe("https://www.twitch.tv/shroud");
    expect(streamData.activities[0]?.largeImage?.url).toBe(
      "https://static-cdn.jtvnw.net/previews-ttv/live_user_shroud-320x180.jpg",
    );

    const watchData = normalize(watchingPresence, { now: FIXED_NOW });
    expect(watchData.activities[0]?.title).toBe("Watching YouTube");
    expect(watchData.activities[0]?.largeImage?.url).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });

  it("handles plain users with no cosmetics and falls back to username", () => {
    const data = normalize(plainUserPresence, { now: FIXED_NOW });
    expect(data.user.displayName).toBe("plainuser");
    expect(data.user.decoration).toBeNull();
    expect(data.user.nameplate).toBeNull();
    expect(data.user.guildTag).toBeNull();
    expect(data.user.nameStyle).toBeNull();
    expect(data.user.avatar.static).toMatch(/^https:\/\/cdn\.discordapp\.com\/embed\/avatars\/\d\.png$/);
  });

  it("extracts display_name_styles gradient colors and custom animated emoji", () => {
    const data = normalize(gradientNamePresence, { now: FIXED_NOW });
    expect(data.user.nameStyle).toEqual({
      fontId: 2,
      effectId: 1,
      colors: ["#5865f2", "#ec48bd", "#35ed7e"],
    });
    expect(data.customStatus?.emoji).toEqual({
      name: "partyblob",
      url: "https://cdn.discordapp.com/emojis/232720527448342530.gif?size=32",
      custom: true,
    });
  });

  it("normalizes offline presence cleanly", () => {
    const data = normalize(offlinePresence, { now: FIXED_NOW });
    expect(data.status).toBe("offline");
    expect(data.platforms).toEqual([]);
    expect(data.activities).toEqual([]);
    expect(data.spotify).toBeNull();
  });

  it("rejects unsafe KV URLs and clamps long KV strings", () => {
    const data = normalize(
      {
        ...plainUserPresence,
        kv: {
          banner: "http://127.0.0.1/evil.png",
          website: "javascript:alert(1)",
          accent: "not-a-color",
          bio: "x".repeat(500),
        },
      },
      { now: FIXED_NOW },
    );
    expect(data.kv.banner).toBeNull();
    expect(data.kv.website).toBeNull();
    expect(data.kv.accent).toBeNull();
    expect(data.kv.bio?.length).toBeLessThanOrEqual(240);
  });
});

describe("Lanyard client & RPC icon resolver", () => {
  it.each([null, { name: "🔥", id: null }])("accepts a nullable custom-status emoji variant: %j", async (emoji) => {
    const result = await fetchPresence("983724520789655613", {
      fetchImpl: async () => new Response(JSON.stringify({ success: true, data: {
        ...plainUserPresence, activities: [{ id: "custom", name: "Custom Status", type: 4, state: "Working", emoji }],
      } })),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = normalize(result.data, { now: FIXED_NOW });
    expect(data.customStatus?.text).toBe("Working");
    expect(data.customStatus?.emoji?.url ?? null).toBe(emoji ? "https://cdn.jsdelivr.net/gh/jdecked/twemoji@16.0.1/assets/svg/1f525.svg" : null);
  });
  it("validates Discord snowflakes", () => {
    expect(isSnowflake("983724520789655613")).toBe(true);
    expect(isSnowflake("123")).toBe(false);
    expect(isSnowflake("983724520789655613abc")).toBe(false);
  });

  it("rejects invalid snowflakes before calling fetch", async () => {
    const spy = vi.fn();
    const res = await fetchPresence("not-a-snowflake", { fetchImpl: spy as unknown as typeof fetch });
    expect(res).toEqual({
      ok: false,
      kind: "invalid_id",
      message: "Invalid Discord user ID (expected a 17-20 digit snowflake).",
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns ok:true on a valid Lanyard response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: demoUserPresence }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await fetchPresence("983724520789655613", {
      baseUrl: "https://lanyard.example/v1",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.discord_user.display_name).toBe("LiênThuận");
    }
    expect(mockFetch).toHaveBeenCalledWith(
      "https://lanyard.example/v1/users/983724520789655613",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns kind:not_monitored when Lanyard returns user_not_monitored", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(notMonitoredResponse), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await fetchPresence("983724520789655613", {
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    expect(res).toEqual({
      ok: false,
      kind: "not_monitored",
      code: "user_not_monitored",
      message: "User is not being monitored by Lanyard",
    });
  });

  it("returns kind:network_error when fetch rejects", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("socket hang up"));
    const res = await fetchPresence("983724520789655613", {
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    expect(res).toEqual({
      ok: false,
      kind: "network_error",
      message: "socket hang up",
    });
  });

  it("populates missing activity largeImage with appIcon via /applications/{id}/rpc", async () => {
    const base = normalize(
      {
        ...plainUserPresence,
        activities: [
          {
            id: "act-no-art",
            name: "Visual Studio Code",
            type: 0,
            application_id: "383226320970055681",
          },
        ],
      },
      { now: FIXED_NOW },
    );
    expect(base.activities[0]?.largeImage).toBeNull();
    expect(base.activities[0]?.appIcon).toBeNull();

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "383226320970055681", icon: "db3133f34f68553148f3a65c1f4633aa" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const enriched = await withAppIcons(base, {
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    expect(enriched.activities[0]?.appIcon).toBe(
      "https://cdn.discordapp.com/app-icons/383226320970055681/db3133f34f68553148f3a65c1f4633aa.png?size=64",
    );

    const second = await withAppIcons(base, {
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    expect(second.activities[0]?.appIcon).toBe(
      "https://cdn.discordapp.com/app-icons/383226320970055681/db3133f34f68553148f3a65c1f4633aa.png?size=64",
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("tolerates nullable Discord activity subfields in Lanyard responses", async () => {
    const result = await fetchPresence("983724520789655613", {
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              ...plainUserPresence,
              activities: [
                {
                  id: "act-nulls",
                  name: "Neovim",
                  type: 0,
                  application_id: null,
                  timestamps: { start: FIXED_NOW - 30_000, end: null },
                  assets: { large_image: null, large_text: null, small_image: null, small_text: null },
                  party: null,
                  buttons: null,
                  sync_id: null,
                },
              ],
            },
          }),
        ),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = normalize(result.data, { now: FIXED_NOW });
    expect(data.activities[0]?.name).toBe("Neovim");
    expect(data.activities[0]?.timestamps).toEqual({ start: FIXED_NOW - 30_000 });
  });
});
