import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { aboutFields, bannerScope, cardBadges, effectPlan, ProfileEffect, profileSurface, resolveBanner } from "@/card/parts/profile-look";
import { Badges } from "@/card/parts/identity";
import { themes } from "@/card/theme-registry";
import { directAssets } from "@/card/types";
import { OPTION_NAMES, parseOptions } from "@/lib/options";
import { parseTimeZone, zonedParts } from "@/lib/timezone";
import { snapshotClock } from "@/card/themes/presence-kit";
import { serializeOptions, studioSearch, withOption } from "@/lib/embed";
import { profileCardData } from "./fixtures/profile-extras";
import { FIXED_NOW } from "./fixtures";

const scope = bannerScope(OPTION_NAMES);
const opts = parseOptions();
describe("profile banner resolution", () => {
  it.each(["kv", "image", "theme", "color", "nameplate", "accent"])("resolves the %s priority tier", (tier) => {
    const data = profileCardData();
    if (tier === "kv") data.kv.banner = "https://example.com/banner.png";
    if (["theme", "color", "nameplate", "accent"].includes(tier)) data.profile.bannerUrl = null;
    if (["color", "nameplate", "accent"].includes(tier)) data.profile.themeColors = null;
    if (["nameplate", "accent"].includes(tier)) data.profile.bannerColor = null;
    if (tier === "accent") data.user.nameplate = null;
    expect(resolveBanner(data, opts, scope).kind).toBe(tier);
  });
  it("honors source selection, KV/nameplate hides and member precedence", () => {
    const data = profileCardData();
    for (const source of ["profile", "nameplate", "accent", "none"] as const) expect(resolveBanner(data, { ...opts, banner_source: source }, scope).kind).toBe(source === "profile" ? "image" : source);
    const member = bannerScope(OPTION_NAMES, { nameplateFirst: true });
    expect(resolveBanner(data, opts, member).kind).toBe("nameplate");
    expect(resolveBanner(data, { ...opts, banner_source: "profile" }, member).kind).toBe("image");
    data.kv.banner = "https://example.com/banner.png";
    for (const hidden of [{ hide_kv: true }, { show_banner: false }]) expect(resolveBanner(data, { ...opts, ...hidden }, scope).kind).toBe("image");
    expect(resolveBanner(data, { ...opts, banner_source: "nameplate", hide_nameplate: true }, scope).kind).toBe("accent");
  });
  it("keeps explicit backgrounds and source opt-outs above Nitro surface tint", () => {
    const data = profileCardData();
    expect(profileSurface(data, opts, scope)).toHaveProperty("--pf-a", "#543ba2");
    expect(profileSurface(data, { ...opts, bg: "transparent" }, scope)).toEqual({});
    expect(profileSurface(data, { ...opts, banner_source: "none" }, scope)).toEqual({});
  });
});
describe("profile effects, badges and About Me", () => {
  it("uses a still SVG, live layers, and honors both effect controls", () => {
    const data = profileCardData();
    expect(effectPlan(data, opts, "svg")?.layers).toEqual([]);
    expect(effectPlan(data, opts, "live")?.layers).toHaveLength(2);
    expect(effectPlan(data, { ...opts, animated: false }, "live")?.layers).toEqual([]);
    const render = (options = opts) => renderToStaticMarkup(<ProfileEffect data={data} options={options} assets={directAssets} target="svg" width={420} />);
    expect(render()).toContain(data.profile.effect!.staticUrl!);
    expect(render()).not.toContain(data.profile.effect!.animatedUrl!);
    expect(render({ ...opts, hide_effect: true })).toBe("");
    data.profile.effect = null;
    expect(render()).toBe("");
  });
  it("deduplicates aliases, icons and repeated profile badges with accessible labels", () => {
    const data = profileCardData();
    const flag = { id: "hypesquad_bravery", label: "HypeSquad Bravery", icon: "https://cdn.discordapp.com/badge-icons/flag.png" };
    data.user.badges = [flag];
    data.profile.badges.push({ id: "hypesquad_house_1", description: flag.label, iconUrl: flag.icon }, data.profile.badges[0]!);
    const result = cardBadges(data, opts);
    expect(new Set(result.map((b) => b.id)).size).toBe(result.length);
    expect(result.filter((b) => b.icon === flag.icon)).toHaveLength(1);
    expect(cardBadges(data, { hide_badges: true })).toEqual([]);
    expect(renderToStaticMarkup(<Badges data={data} options={opts} assets={directAssets} />)).toContain('title="Completed a Quest"');
  });
  it("falls back to the sanitized profile text, lets KV win and hides all metadata", () => {
    const data = profileCardData();
    expect(aboutFields(data, opts)).toMatchObject({ bio: data.profile.bio, pronouns: "they/them" });
    data.kv.bio = "KV bio"; data.kv.pronouns = "KV pronouns";
    expect(aboutFields(data, opts)).toMatchObject({ bio: "KV bio", pronouns: "KV pronouns" });
    expect(Object.values(aboutFields(data, { hide_kv: true }))).toEqual([null, null, null, null]);
  });
});
describe("profile URL options and timezone", () => {
  it.each(["auto", "profile", "nameplate", "accent", "none"])("parses banner_source=%s", (banner_source) => expect(parseOptions({ banner_source }).banner_source).toBe(banner_source));
  it("falls back independently and uses the first repeated value", () => {
    expect(parseOptions({ banner_source: "bad", hide_effect: "bad", tz: "bad" })).toMatchObject({ banner_source: "auto", hide_effect: false, tz: "UTC" });
    expect(parseOptions({ banner_source: ["none", "profile"], hide_effect: "true", tz: "Asia/Ho_Chi_Minh" })).toMatchObject({ banner_source: "none", hide_effect: true });
    expect(parseTimeZone("Mars/Base")).toBeNull();
    expect(parseTimeZone("+07:00")).toBeNull();
  });
  it("formats local calendar boundaries and DST without a UTC suffix", () => {
    expect(snapshotClock(FIXED_NOW, "UTC")).toMatchObject({ time: "14:00", zone: "UTC" });
    expect(snapshotClock(FIXED_NOW, "invalid")).toMatchObject({ time: "14:00", zone: "UTC" });
    expect(snapshotClock(FIXED_NOW, "Asia/Ho_Chi_Minh")).toMatchObject({ time: "21:00", zone: "" });
    expect(zonedParts(Date.UTC(2026, 10, 12, 23, 30), "Asia/Ho_Chi_Minh")).toMatchObject({ day: 13, hour: 6, minute: 30 });
    expect(zonedParts(Date.UTC(2026, 6, 1, 12), "America/New_York").hour).toBe(8);
    expect(zonedParts(Date.UTC(2026, 0, 1, 12), "America/New_York").hour).toBe(7);
  });
  it("round trips Studio state, omits defaults, and uses banner's own width default", () => {
    expect(serializeOptions(opts).toString()).toBe("");
    const updated = withOption(withOption(opts, "banner_source", "none"), "hide_effect", "true");
    expect(studioSearch(updated, "983724520789655613")).toBe("banner_source=none&hide_effect=true");
    expect(serializeOptions(parseOptions({ theme: "banner" })).has("width")).toBe(false);
    expect(withOption(parseOptions({ theme: "banner", width: "900" }), "theme", "profile").width).toBe(600);
    expect(serializeOptions(parseOptions({ theme: "chat", tz: "Asia/Ho_Chi_Minh" })).get("tz")).toBeTruthy();
  });
  it("declares profile fetching only on themes that render extras", () => {
    for (const theme of Object.values(themes)) expect(typeof theme.usesProfile).toBe("boolean");
    for (const name of ["profile", "nitro", "glass", "banner", "polaroid", "voice", "neon", "mobile", "chat", "member", "terminal"]) expect(themes[name]!.usesProfile).toBe(true);
    for (const name of ["compact", "activity", "badge", "retro"]) expect(themes[name]!.usesProfile).toBe(true);
  });
});
