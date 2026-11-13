import { afterEach, describe, expect, it, vi } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { getTheme, themes } from "@/card/theme-registry";
import { clearProfileCache, fetchProfileExtras } from "@/lib/discord/profile";
import type { CardData } from "@/lib/lanyard/card-data";
import { normalize } from "@/lib/lanyard/normalize";
import type { Activity, LanyardPresence } from "@/lib/lanyard/types";
import { parseOptions, type CardOptions } from "@/lib/options";
import { PLACEHOLDER, type InlineOptions } from "@/lib/svg/assets";
import { renderInlinedSvg } from "@/lib/svg/render";
import { FIXED_NOW, plainUserPresence } from "./fixtures";
import { frameCardData, profileExtras } from "./fixtures/profile-extras";

// A real 2×2 PNG keeps successful art distinct from the 1×1 failure placeholder.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEUlEQVR4nGP4nzbzPwgzwBgAa0AL9Yei5DIAAAAASUVORK5CYII=", "base64");
const INLINE: InlineOptions = {
  lookup: async () => [{ address: "8.8.8.8", family: 4 }],
  download: async () => ({ mime: "image/png", bytes: PNG }),
};
const IMAGE = `data:image/png;base64,${PNG.toString("base64")}`;
const RTL_NAME = "🧑🏽‍💻 مرحبا بالعالم שלום LiênThuận <&> ".repeat(30);
const HUGE_TEXT = "Synthetic placeholder bio مرحبا 🧑🏽‍💻 <&>\n".repeat(20_000);
const UNKNOWN_KV = "unlisted-kv-must-never-render";
const withProfile = (presence: LanyardPresence): CardData => ({
  ...normalize(presence, { now: FIXED_NOW }),
  profile: structuredClone(profileExtras),
});

const activities: Activity[] = [0, 1, 3, 5].map((type, index) => ({
  id: `synthetic-${index}`,
  type,
  name: `Activity ${index + 1} مرحبا 🎮`,
  application_id: "383226320970055681",
  details: "Long synthetic details <&> שלום 🧑🏽‍💻 ".repeat(30),
  state: "A synthetic room with a long title ".repeat(30),
  assets: { large_image: "1359298108856729682", small_image: "1359298109074706533" },
  timestamps: { start: FIXED_NOW - 120_000, end: FIXED_NOW + 240_000 },
  party: { size: [4, 4] },
  buttons: ["Synthetic action <&> ".repeat(10), "Second action", "Ignored third action"],
}));
const busyPresence: LanyardPresence = {
  ...plainUserPresence,
  discord_user: { ...plainUserPresence.discord_user, avatar: "0123456789abcdef0123456789abcdef" },
  active_on_discord_desktop: true,
  active_on_discord_mobile: true,
  activities: [
    { id: "custom", type: 4, name: "Custom Status", state: "Synthetic custom status مرحبا ✨", emoji: { name: "🔥" } },
    ...activities,
  ],
  listening_to_spotify: true,
  spotify: {
    track_id: "synthetic-track",
    song: "Synthetic track 🎵",
    artist: "Synthetic artist שלום",
    album: "Synthetic album",
    album_art_url: "https://i.scdn.co/image/ab67616d0000b2731fb3115e3b35b94a49d6fe20",
    timestamps: { start: FIXED_NOW - 60_000, end: FIXED_NOW + 180_000 },
  },
};
const longNameData = withProfile({
  ...plainUserPresence,
  discord_user: { ...plainUserPresence.discord_user, global_name: RTL_NAME, username: "synthetic-user<&>".repeat(12) },
});
const busyData = withProfile(busyPresence);
const missingAvatarData = normalize(plainUserPresence, { now: FIXED_NOW });
const hugeKvData = withProfile({
  ...plainUserPresence,
  kv: {
    bio: HUGE_TEXT,
    pronouns: HUGE_TEXT,
    location: HUGE_TEXT,
    website: `https://example.com/${"synthetic/".repeat(20_000)}`,
    unknown: UNKNOWN_KV.repeat(20_000),
  },
});
// Invisible users are exposed by Lanyard as offline; stale client flags must stay hidden.
const offlineData = withProfile({
  ...plainUserPresence,
  discord_status: "offline",
  active_on_discord_web: true,
  active_on_discord_desktop: true,
  active_on_discord_mobile: true,
  active_on_discord_embedded: true,
  active_on_discord_vr: true,
});
const failedAssetsData: CardData = { ...busyData, profile: frameCardData().profile };
const scenarios = [
  { name: "long RTL and emoji identity", data: longNameData },
  { name: "four activities with Spotify and custom status", data: busyData },
  { name: "missing avatar", data: missingAvatarData },
  { name: "huge whitelisted and unknown KV", data: hugeKvData },
  { name: "invisible user exposed as offline", data: offlineData },
];
const matrix = Object.keys(themes).flatMap((theme) => (["dark", "light"] as const).flatMap((mode) =>
  ["300", "1000"].map((width) => ({ theme, mode, width })),
));

function inspectSvg(svg: string, data: CardData, options: CardOptions) {
  const issues: string[] = [];
  const xml = new DOMParser({ onError: (level, message) => { issues.push(`${level}: ${message}`); } }).parseFromString(svg, "image/svg+xml");
  expect(issues).toEqual([]);
  expect(Buffer.byteLength(svg, "utf8")).toBeLessThan(1_000_000);
  expect(svg).not.toMatch(/(?:NaN|[-+]?Infinity)(?:px|%|[;"\s<])/);
  const size = getTheme(options.theme).measure(data, options);
  expect(Number.isFinite(size.width) && Number.isFinite(size.height)).toBe(true);
  expect(size.width).toBeGreaterThan(0);
  expect(size.height).toBeGreaterThan(0);
  expect(getTheme(options.theme).measure(data, options)).toEqual(size);
  const root = xml.documentElement!;
  expect(root.localName).toBe("svg");
  expect(root.namespaceURI).toBe("http://www.w3.org/2000/svg");
  expect(root.getAttribute("width")).toBe(String(size.width));
  expect(root.getAttribute("height")).toBe(String(size.height));
  expect(root.getAttribute("viewBox")).toBe(`0 0 ${size.width} ${size.height}`);
  expect(root.getAttribute("aria-label")).toBe(`${data.user.displayName}'s Discord presence`);
  const foreign = xml.getElementsByTagName("foreignObject").item(0)!;
  expect(foreign.getAttribute("x")).toBe("0");
  expect(foreign.getAttribute("y")).toBe("0");
  expect(foreign.getAttribute("width")).toBe(String(size.width));
  expect(foreign.getAttribute("height")).toBe(String(size.height));
  for (const element of Array.from(xml.getElementsByTagName("*"))) {
    for (const name of ["src", "href", "xlink:href", "poster"]) {
      const resource = element.getAttribute(name);
      if (resource) expect(resource, `${element.tagName}[${name}]`).toMatch(/^(?:data:image\/|#)/);
    }
    expect(element.hasAttribute("srcset")).toBe(false);
    for (const name of ["width", "height", "x", "y", "cx", "cy", "r", "rx", "ry"]) {
      const value = element.getAttribute(name);
      if (value && !value.endsWith("%")) expect(Number.isFinite(Number(value)), `${element.tagName}[${name}]=${value}`).toBe(true);
    }
  }
  // Namespace URLs and URL-shaped user text are harmless; only resource loads are forbidden.
  for (const match of svg.matchAll(/url\(\s*["']?([^\s)'"<>]+)["']?\s*\)/g)) expect(match[1]).toMatch(/^(?:data:image\/|#)/);
  expect(svg).not.toMatch(/@import\b/i);
  return xml;
}

afterEach(() => { clearProfileCache(); vi.useRealTimers(); });

it("normalizes the synthetic stress payloads before any theme renders them", () => {
  expect(longNameData.user.displayName).toContain("مرحبا");
  expect(longNameData.user.displayName).toContain("🧑🏽‍💻");
  expect(longNameData.user.displayName.length).toBeLessThanOrEqual(80);
  expect(busyData.activities).toHaveLength(4);
  expect(busyData.activities.map((activity) => activity.name)).toEqual(activities.map((activity) => activity.name));
  expect(busyData.spotify?.song).toBe("Synthetic track 🎵");
  expect(busyData.customStatus?.text).toContain("Synthetic custom status");
  expect(hugeKvData.kv.bio?.length).toBeLessThanOrEqual(240);
  expect(hugeKvData.kv.pronouns?.length).toBeLessThanOrEqual(40);
  expect(hugeKvData.kv.location?.length).toBeLessThanOrEqual(80);
  expect(hugeKvData.kv.website?.label.length).toBeLessThanOrEqual(80);
  expect(hugeKvData.kv).not.toHaveProperty("unknown");
  expect(missingAvatarData.user.avatar.static).toMatch(/\/embed\/avatars\/[0-5]\.png/);
  expect(offlineData.status).toBe("offline");
  expect(offlineData.platforms).toEqual([]);
});

describe.each(matrix)("worst-case SVG / $theme / $mode / width=$width", ({ theme, mode, width }) => {
  const options = parseOptions({ theme, mode, width, max_activities: "4" });

  it.each(scenarios)("renders $name through the production inliner", async ({ data }) => {
    const downloaded: string[] = [];
    const svg = await renderInlinedSvg(data, options, undefined, {
      ...INLINE,
      download: async (url) => { downloaded.push(url.href); return { mime: "image/png", bytes: PNG }; },
    });
    const xml = inspectSvg(svg, data, options);
    expect(svg).not.toContain(UNKNOWN_KV);
    if (data === missingAvatarData && theme !== "badge") {
      expect(downloaded.some((url) => url.includes("/embed/avatars/"))).toBe(true);
      expect(Array.from(xml.getElementsByTagName("img")).some((image) => image.getAttribute("src") === IMAGE)).toBe(true);
    }
    if (data === offlineData) {
      expect(Array.from(xml.getElementsByTagName("*")).some((element) => element.getAttribute("aria-label") === "Active platforms")).toBe(false);
    }
    if (data === busyData && getTheme(theme).supportedParams.includes("max_activities")) {
      for (const activity of activities) expect(xml.documentElement!.textContent).toContain(activity.name);
    }
  });

  it("fails every primary and fallback lookup without leaking remote art or changing frame geometry", async () => {
    const lookup = vi.fn<NonNullable<InlineOptions["lookup"]>>(async () => { throw new Error("Synthetic DNS failure"); });
    const download = vi.fn<NonNullable<InlineOptions["download"]>>(async () => { throw new Error("DNS failure must prevent downloads"); });
    const success = await renderInlinedSvg(failedAssetsData, options, undefined, INLINE);
    const svg = await renderInlinedSvg(failedAssetsData, options, undefined, { lookup, download });
    const xml = inspectSvg(svg, failedAssetsData, options);
    const successfulXml = inspectSvg(success, failedAssetsData, options);
    expect(lookup).toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
    expect(success).toContain(IMAGE);
    expect(svg).not.toContain(IMAGE);
    for (const image of Array.from(xml.getElementsByTagName("img"))) expect(image.getAttribute("src")).toBe(PLACEHOLDER);
    expect(xml.documentElement!.getAttribute("viewBox")).toBe(successfulXml.documentElement!.getAttribute("viewBox"));
    expect(svg).toContain("pf-frame-canvas");
    const hasEffectStill = (document: typeof xml) => Array.from(document.getElementsByTagName("img")).some((image) => image.getAttribute("class") === "pf-fx-still");
    expect(hasEffectStill(successfulXml)).toBe(true);
    expect(hasEffectStill(xml)).toBe(false);
  });

  it("renders complete presence when the real profile provider reaches its caller deadline", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    let release!: (response: Response) => void;
    let upstreamSettled = false;
    const upstream = new Promise<Response>((resolve) => { release = resolve; });
    const fetchImpl = vi.fn<typeof fetch>(() => upstream.then((response) => { upstreamSettled = true; return response; }));
    try {
      const pending = fetchProfileExtras(plainUserPresence.discord_user.id, {
        fetchImpl, provider: "dstn", botToken: "", now: () => FIXED_NOW,
      });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1499);
      let returned = false;
      void pending.then(() => { returned = true; });
      await Promise.resolve();
      expect(returned).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      const profile = await pending;
      expect(profile).toBeNull();
      expect(upstreamSettled).toBe(false);
      const data = { ...normalize(busyPresence, { now: FIXED_NOW }), profile };
      const svg = await renderInlinedSvg(data, options, undefined, INLINE);
      const xml = inspectSvg(svg, data, options);
      expect(xml.documentElement!.textContent).toContain("Synthetic track");
      expect(svg).not.toContain("Presence unavailable");
    } finally {
      release(new Response(null, { status: 404 }));
      await upstream;
    }
  });
});
