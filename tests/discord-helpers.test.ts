import { describe, expect, it } from "vitest";
import { BADGES, flagsToBadges, UserFlag } from "@/lib/discord/badges";
import { nameplatePalette, NAMEPLATE_PALETTES } from "@/lib/discord/nameplate";
import {
  activityTypeLabel,
  formatParty,
  isShownActivityType,
  sectionTitle,
} from "@/lib/discord/activity";
import { colorIntToHex, isHexColor, normalizeHex } from "@/lib/discord/color";

describe("flagsToBadges", () => {
  it("returns no badges for 0 or bad input", () => {
    expect(flagsToBadges(0)).toEqual([]);
    expect(flagsToBadges(undefined)).toEqual([]);
    expect(flagsToBadges(-1)).toEqual([]);
    expect(flagsToBadges(Number.NaN)).toEqual([]);
  });

  it("maps Phineas' real flags (131584) to Verified Developer + Early Supporter", () => {
    expect(flagsToBadges(131584).map((b) => b.id)).toEqual(["verified_developer", "early_supporter"]);
  });

  it("orders badges like the Discord client", () => {
    const flags =
      UserFlag.ActiveDeveloper | UserFlag.HypeSquadOnlineHouse1 | UserFlag.Staff | UserFlag.BugHunterLevel2;
    expect(flagsToBadges(flags).map((b) => b.id)).toEqual([
      "staff",
      "hypesquad_bravery",
      "bug_hunter_level_2",
      "active_developer",
    ]);
  });

  it("ignores flags without a public badge (e.g. verified bot)", () => {
    expect(flagsToBadges(1 << 16)).toEqual([]);
  });

  it("has an icon URL and label for every badge", () => {
    for (const badge of BADGES) {
      expect(badge.icon).toMatch(/^https:\/\/cdn\.discordapp\.com\/badge-icons\/[0-9a-f]{32}\.png$/);
      expect(badge.label.length).toBeGreaterThan(0);
    }
  });
});

describe("nameplatePalette", () => {
  it("returns verified colors for a known palette", () => {
    expect(nameplatePalette("forest")).toEqual({ name: "forest", label: "Forest", dark: "#2d5401", light: "#6aa624" });
  });

  it("falls back for unknown palettes", () => {
    expect(nameplatePalette("nope")).toBeNull();
    expect(nameplatePalette(null)).toBeNull();
  });

  it("covers every palette Discord ships", () => {
    expect(Object.keys(NAMEPLATE_PALETTES).sort()).toEqual(
      ["berry", "bubble_gum", "clover", "cobalt", "crimson", "forest", "lemon", "sky", "teal", "violet", "white"].sort(),
    );
  });
});

describe("activity helpers", () => {
  it("labels activity types", () => {
    expect(activityTypeLabel(0)).toBe("Playing");
    expect(activityTypeLabel(1)).toBe("Streaming");
    expect(activityTypeLabel(2)).toBe("Listening to");
    expect(activityTypeLabel(3)).toBe("Watching");
    expect(activityTypeLabel(5)).toBe("Competing in");
    expect(activityTypeLabel(4)).toBe("");
    expect(activityTypeLabel(99)).toBe("");
  });

  it("builds section titles", () => {
    expect(sectionTitle(0, "Minecraft")).toBe("Playing");
    expect(sectionTitle(2, "Spotify")).toBe("Listening to Spotify");
    expect(sectionTitle(2, "Apple Music")).toBe("Listening to Apple Music");
    expect(sectionTitle(1, "Twitch")).toBe("Live on Twitch");
    expect(sectionTitle(3, "YouTube")).toBe("Watching YouTube");
    expect(sectionTitle(5, "Arena")).toBe("Competing");
  });

  it("knows which activity types the card shows", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(isShownActivityType)).toEqual([true, true, true, true, false, true, false]);
  });

  it("formats party sizes", () => {
    expect(formatParty({ size: [2, 4] })).toBe("2 of 4");
    expect(formatParty({ size: [3, 0] })).toBe("3 in party");
    expect(formatParty({ size: [0, 0] })).toBeNull();
    expect(formatParty({})).toBeNull();
    expect(formatParty(undefined)).toBeNull();
  });
});

describe("colors", () => {
  it("converts integers to hex", () => {
    expect(colorIntToHex(16711680)).toBe("#ff0000");
    expect(colorIntToHex(0)).toBe("#000000");
    expect(colorIntToHex(-1)).toBeNull();
    expect(colorIntToHex(0x1000000)).toBeNull();
    expect(colorIntToHex(1.5)).toBeNull();
  });

  it("validates and normalizes hex", () => {
    expect(isHexColor("5865f2")).toBe(true);
    expect(isHexColor("#5865F2")).toBe(true);
    expect(isHexColor("#abc")).toBe(true);
    expect(isHexColor("#5865f2cc")).toBe(true);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("#12345")).toBe(false);
    expect(normalizeHex("ABC")).toBe("#aabbcc");
    expect(normalizeHex("#5865F2")).toBe("#5865f2");
    expect(normalizeHex("5865f280")).toBe("#5865f280");
    expect(normalizeHex("url(x)")).toBeNull();
  });
});
