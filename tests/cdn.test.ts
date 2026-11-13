import { describe, expect, it } from "vitest";
import {
  activityAssetUrl,
  appIconUrl,
  appRpcUrl,
  avatarSource,
  avatarUrl,
  badgeIconUrl,
  customEmojiUrl,
  decorationSource,
  decorationUrl,
  defaultAvatarIndex,
  defaultAvatarUrl,
  guildTagBadgeUrl,
  nameplateUrls,
  spotifyAlbumArtUrl,
  twemojiCodepoints,
  twemojiUrl,
  TWEMOJI_VERSION,
} from "@/lib/discord/cdn";

const DEMO_ID = "983724520789655613";

describe("avatars", () => {
  it("builds static avatar URLs", () => {
    expect(avatarUrl(DEMO_ID, "c8996a80c144f90664d5d8cd9ebd0526", { size: 128 })).toBe(
      "https://cdn.discordapp.com/avatars/983724520789655613/c8996a80c144f90664d5d8cd9ebd0526.webp?size=128",
    );
    expect(avatarUrl(DEMO_ID, "c8996a80c144f90664d5d8cd9ebd0526", { size: 64, format: "png" })).toBe(
      "https://cdn.discordapp.com/avatars/983724520789655613/c8996a80c144f90664d5d8cd9ebd0526.png?size=64",
    );
  });

  it("only animates a_ hashes", () => {
    expect(avatarUrl("1", "a_abc", { size: 128, animated: true })).toBe(
      "https://cdn.discordapp.com/avatars/1/a_abc.webp?size=128&animated=true",
    );
    expect(avatarUrl("1", "abc", { size: 128, animated: true })).toBe(
      "https://cdn.discordapp.com/avatars/1/abc.webp?size=128",
    );
  });

  it("computes the default avatar index", () => {
    // New username system: (id >> 22) % 6
    expect(defaultAvatarIndex(DEMO_ID)).toBe(Number((BigInt(DEMO_ID) >> 22n) % 6n));
    expect(defaultAvatarIndex(DEMO_ID, "0")).toBe(Number((BigInt(DEMO_ID) >> 22n) % 6n));
    // Legacy discriminators: discriminator % 5
    expect(defaultAvatarIndex(DEMO_ID, "1337")).toBe(1337 % 5);
    expect(defaultAvatarIndex("not-a-number")).toBe(0);
  });

  it("builds default avatar URLs", () => {
    expect(defaultAvatarUrl(3)).toBe("https://cdn.discordapp.com/embed/avatars/3.png");
  });

  it("returns static and animated candidates", () => {
    expect(avatarSource(DEMO_ID, null, "0", 128)).toEqual({
      static: `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex(DEMO_ID)}.png`,
    });
    expect(avatarSource("1", "a_x", "0", 128)).toEqual({
      static: "https://cdn.discordapp.com/avatars/1/a_x.webp?size=128",
      animated: "https://cdn.discordapp.com/avatars/1/a_x.webp?size=128&animated=true",
    });
  });
});

describe("avatar decorations", () => {
  const asset = "a_8c18ac604dd50ec43d571f18af63c79f";

  it("builds the passthrough PNG", () => {
    expect(decorationUrl(asset, { size: 96, format: "png", passthrough: false })).toBe(
      `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=96&passthrough=false`,
    );
    expect(decorationUrl(asset, { size: 96, format: "png", passthrough: true })).toBe(
      `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=96&passthrough=true`,
    );
  });

  it("builds the animated WebP for a_ assets only", () => {
    expect(decorationUrl(asset, { size: 96, format: "webp", animated: true })).toBe(
      `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.webp?size=96&animated=true`,
    );
    expect(decorationUrl("static", { size: 96, format: "webp", animated: true })).toBe(
      "https://cdn.discordapp.com/avatar-decoration-presets/static.webp?size=96",
    );
  });

  it("returns static and animated candidates", () => {
    expect(decorationSource(asset, 96)).toEqual({
      static: `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=96&passthrough=false`,
      animated: `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.webp?size=96&animated=true`,
    });
    expect(decorationSource("plain", 96)).toEqual({
      static: "https://cdn.discordapp.com/avatar-decoration-presets/plain.png?size=96&passthrough=false",
    });
  });
});

describe("nameplates", () => {
  it("builds static and video URLs", () => {
    expect(nameplateUrls("nameplates/pitter_patter/1495807265175900180/")).toEqual({
      static: "https://cdn.discordapp.com/assets/collectibles/nameplates/pitter_patter/1495807265175900180/static.png",
      video: "https://cdn.discordapp.com/assets/collectibles/nameplates/pitter_patter/1495807265175900180/asset.webm",
    });
  });

  it("adds a missing trailing slash", () => {
    expect(nameplateUrls("nameplates/x/1").static).toBe(
      "https://cdn.discordapp.com/assets/collectibles/nameplates/x/1/static.png",
    );
  });
});

describe("guild tag badges", () => {
  it("uses the guild-tag-badges path", () => {
    expect(guildTagBadgeUrl("1369636126096097300", "f199d66208891c43b51805e21b78bd4c", 32)).toBe(
      "https://cdn.discordapp.com/guild-tag-badges/1369636126096097300/f199d66208891c43b51805e21b78bd4c.png?size=32",
    );
  });
});

describe("activity assets", () => {
  const app = "383226320970055681";

  it("maps media proxy assets", () => {
    expect(activityAssetUrl(app, "mp:external/abc/https/example.com/a.png")).toBe(
      "https://media.discordapp.net/external/abc/https/example.com/a.png",
    );
    expect(activityAssetUrl(undefined, "mp:attachments/1/2/a.png")).toBe(
      "https://media.discordapp.net/attachments/1/2/a.png",
    );
  });

  it("maps spotify, youtube and twitch prefixes", () => {
    expect(activityAssetUrl(undefined, "spotify:ab67616d0000b2731fb3115e3b35b94a49d6fe20")).toBe(
      "https://i.scdn.co/image/ab67616d00001e021fb3115e3b35b94a49d6fe20",
    );
    expect(activityAssetUrl(undefined, "youtube:dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
    expect(activityAssetUrl(undefined, "twitch:shroud")).toBe(
      "https://static-cdn.jtvnw.net/previews-ttv/live_user_shroud-320x180.jpg",
    );
  });

  it("maps application assets", () => {
    expect(activityAssetUrl(app, "1359298108856729682", 128)).toBe(
      "https://cdn.discordapp.com/app-assets/383226320970055681/1359298108856729682.png?size=128",
    );
  });

  it("returns null for unknown or unusable assets", () => {
    expect(activityAssetUrl(undefined, "1359298108856729682")).toBeNull();
    expect(activityAssetUrl(app, "")).toBeNull();
    expect(activityAssetUrl(app, undefined)).toBeNull();
    expect(activityAssetUrl(app, "weird:thing")).toBeNull();
    expect(activityAssetUrl(app, "../../etc")).toBeNull();
  });

  it("builds app icon URLs", () => {
    expect(appRpcUrl(app)).toBe("https://discord.com/api/v10/applications/383226320970055681/rpc");
    expect(appIconUrl(app, "db3133f34f68553148f3a65c1f4633aa", 64)).toBe(
      "https://cdn.discordapp.com/app-icons/383226320970055681/db3133f34f68553148f3a65c1f4633aa.png?size=64",
    );
  });
});

describe("spotify album art", () => {
  it("downsizes 640px art to the 300px variant", () => {
    expect(spotifyAlbumArtUrl("https://i.scdn.co/image/ab67616d0000b2731fb3115e3b35b94a49d6fe20")).toBe(
      "https://i.scdn.co/image/ab67616d00001e021fb3115e3b35b94a49d6fe20",
    );
  });

  it("leaves other URLs alone and drops non-https ones", () => {
    expect(spotifyAlbumArtUrl("https://i.scdn.co/image/abc")).toBe("https://i.scdn.co/image/abc");
    expect(spotifyAlbumArtUrl("http://i.scdn.co/image/abc")).toBeNull();
    expect(spotifyAlbumArtUrl(null)).toBeNull();
  });
});

describe("emoji", () => {
  it("builds custom emoji URLs", () => {
    expect(customEmojiUrl("232720527448342530", false, 32)).toBe(
      "https://cdn.discordapp.com/emojis/232720527448342530.png?size=32",
    );
    expect(customEmojiUrl("232720527448342530", true, 32)).toBe(
      "https://cdn.discordapp.com/emojis/232720527448342530.gif?size=32",
    );
  });

  it("computes Twemoji file names", () => {
    expect(twemojiCodepoints("😀")).toBe("1f600");
    // FE0F is dropped when there is no ZWJ.
    expect(twemojiCodepoints("❤️")).toBe("2764");
    // ...and kept inside ZWJ sequences.
    expect(twemojiCodepoints("🏳️‍🌈")).toBe("1f3f3-fe0f-200d-1f308");
    expect(twemojiCodepoints("👍🏽")).toBe("1f44d-1f3fd");
    expect(twemojiCodepoints("")).toBeNull();
    expect(twemojiCodepoints("abc")).toBeNull();
  });

  it("pins the Twemoji version", () => {
    expect(twemojiUrl("😀")).toBe(
      `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${TWEMOJI_VERSION}/assets/svg/1f600.svg`,
    );
    expect(TWEMOJI_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("badges", () => {
  it("builds badge icon URLs", () => {
    expect(badgeIconUrl("7060786766c9c840eb3019e725d2b358")).toBe(
      "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png",
    );
  });
});
