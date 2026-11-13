import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement } from "react";
import type { ProfileExtras } from "@/lib/discord/profile";
import type { PresenceResult } from "@/lib/lanyard/client";
import type { CardData } from "@/lib/lanyard/card-data";
import type { PresenceSnapshot } from "@/lib/lanyard/socket";
import { demoUserPresence, FIXED_NOW, spotifyPresence } from "./fixtures";

vi.mock("@/lib/lanyard/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/lanyard/client")>()),
  fetchPresence: vi.fn(),
  withAppIcons: vi.fn(async (data: CardData) => data),
}));
vi.mock("@/lib/discord/profile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/discord/profile")>()),
  fetchProfileExtras: vi.fn(),
}));
vi.mock("@/lib/svg/render", () => ({ renderInlinedSvg: vi.fn(async () => "<svg/>") }));

const { fetchPresence } = await import("@/lib/lanyard/client");
const { fetchProfileExtras } = await import("@/lib/discord/profile");
const { renderInlinedSvg } = await import("@/lib/svg/render");
const { GET } = await import("@/app/api/[id]/route");
const { default: LivePage } = await import("@/app/live/[id]/page");
const { default: Home } = await import("@/app/page");
const { liveCardData } = await import("@/live/LiveCard");

const ID = "983724520789655613";
const profile: ProfileExtras = { frame: null,
  bannerUrl: null, bannerColor: "#8b6dd8", themeColors: null, bio: "Hello", pronouns: null,
  effect: { skuId: "1139323093991575696" }, badges: [],
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const ok: PresenceResult = { ok: true, data: demoUserPresence };
const renderedData = () => vi.mocked(renderInlinedSvg).mock.calls.at(-1)?.[0];
const get = () => GET(new Request(`https://card.example/api/${ID}`), { params: Promise.resolve({ id: ID }) });

beforeEach(() => { vi.mocked(fetchPresence).mockReset(); vi.mocked(fetchProfileExtras).mockReset(); vi.mocked(renderInlinedSvg).mockClear(); });

describe("Studio server profile seed", () => {
  it("warms the profile in parallel before the browser's single JSON request", async () => {
    const presence = deferred<PresenceResult>();
    const extras = deferred<ProfileExtras | null>();
    vi.mocked(fetchPresence).mockReturnValue(presence.promise);
    vi.mocked(fetchProfileExtras).mockReturnValue(extras.promise);
    const pending = Home({ searchParams: Promise.resolve({}) });
    await vi.waitFor(() => { expect(fetchPresence).toHaveBeenCalledWith(ID); expect(fetchProfileExtras).toHaveBeenCalledWith(ID); });
    presence.resolve(ok); extras.resolve(profile);
    const element = await pending;
    expect((element as ReactElement<{ initialProfile: ProfileExtras | null }>).props.initialProfile).toEqual(profile);
  });
  it("fetches profile artwork for small Studio themes", async () => {
    vi.mocked(fetchPresence).mockResolvedValue(ok);
    vi.mocked(fetchProfileExtras).mockResolvedValue(profile);
    await Home({ searchParams: Promise.resolve({ theme: "badge" }) });
    expect(fetchProfileExtras).toHaveBeenCalledWith(ID);
  });
});

describe("/api/[id] profile wiring", () => {
  it("fetches profile artwork for compact cards", async () => {
    vi.mocked(fetchPresence).mockResolvedValue(ok);
    vi.mocked(fetchProfileExtras).mockResolvedValue(profile);
    await GET(new Request(`https://card.example/api/${ID}?theme=compact`), { params: Promise.resolve({ id: ID }) });
    expect(fetchProfileExtras).toHaveBeenCalledWith(ID);
  });
  it("starts Lanyard and the profile provider in parallel and attaches the profile", async () => {
    const presence = deferred<PresenceResult>();
    const extras = deferred<ProfileExtras | null>();
    vi.mocked(fetchPresence).mockReturnValue(presence.promise);
    vi.mocked(fetchProfileExtras).mockReturnValue(extras.promise);
    const response = get();
    // Neither upstream has answered, yet both requests are already in flight.
    await vi.waitFor(() => {
      expect(fetchPresence).toHaveBeenCalledWith(ID);
      expect(fetchProfileExtras).toHaveBeenCalledWith(ID);
    });
    extras.resolve(profile);
    presence.resolve(ok);
    expect((await response).status).toBe(200);
    expect(renderedData()?.profile).toEqual(profile);
  });

  it("still renders the presence card when the provider has nothing", async () => {
    vi.mocked(fetchPresence).mockResolvedValue(ok);
    vi.mocked(fetchProfileExtras).mockResolvedValue(null);
    const response = await get();
    expect(response.status).toBe(200);
    expect(renderedData()?.profile).toBeNull();
    expect(renderedData()?.user.displayName).toBe("LiênThuận");
  });

  it("survives a provider that rejects despite its never-throw contract", async () => {
    vi.mocked(fetchPresence).mockResolvedValue(ok);
    vi.mocked(fetchProfileExtras).mockRejectedValue(new Error("unexpected"));
    expect((await get()).status).toBe(200);
    expect(renderedData()?.profile).toBeNull();
  });

  it("does not attach a profile to error cards", async () => {
    vi.mocked(fetchPresence).mockResolvedValue({ ok: false, kind: "not_monitored", code: "user_not_monitored", message: "x" });
    vi.mocked(fetchProfileExtras).mockResolvedValue(profile);
    await get();
    expect(renderedData()?.profile).toBeNull();
    expect(vi.mocked(renderInlinedSvg).mock.calls.at(-1)?.[2]?.message).toContain("discord.gg/lanyard");
  });

  it("skips the provider for an invalid ID", async () => {
    await GET(new Request("https://card.example/api/nope"), { params: Promise.resolve({ id: "nope" }) });
    expect(fetchProfileExtras).not.toHaveBeenCalled();
  });
});

describe("/live/[id] profile wiring", () => {
  it("fetches badge artwork but skips invalid IDs", async () => {
    vi.mocked(fetchPresence).mockResolvedValue(ok);
    vi.mocked(fetchProfileExtras).mockResolvedValue(profile);
    await LivePage({ params: Promise.resolve({ id: ID }), searchParams: Promise.resolve({ theme: "badge" }) });
    await LivePage({ params: Promise.resolve({ id: "nope" }), searchParams: Promise.resolve({}) });
    expect(fetchProfileExtras).toHaveBeenCalledTimes(1);
  });
  const page = async () => {
    const element = await LivePage({ params: Promise.resolve({ id: ID }), searchParams: Promise.resolve({}) });
    expect(isValidElement(element)).toBe(true);
    return (element as ReactElement<{ initial: unknown; initialProfile: ProfileExtras | null }>).props;
  };

  it("fetches the initial presence and profile in parallel and seeds the client", async () => {
    const presence = deferred<PresenceResult>();
    const extras = deferred<ProfileExtras | null>();
    vi.mocked(fetchPresence).mockReturnValue(presence.promise);
    vi.mocked(fetchProfileExtras).mockReturnValue(extras.promise);
    const pending = page();
    await vi.waitFor(() => {
      expect(fetchPresence).toHaveBeenCalledWith(ID);
      expect(fetchProfileExtras).toHaveBeenCalledWith(ID);
    });
    presence.resolve(ok);
    extras.resolve(profile);
    const props = await pending;
    expect(props.initial).toEqual(demoUserPresence);
    expect(props.initialProfile).toEqual(profile);
  });

  it("drops the profile when the presence is unavailable", async () => {
    vi.mocked(fetchPresence).mockResolvedValue({ ok: false, kind: "network_error", message: "down" });
    vi.mocked(fetchProfileExtras).mockResolvedValue(profile);
    expect((await page()).initialProfile).toBeNull();
  });

  it("keeps the server profile across WebSocket presence updates", () => {
    const snapshot = (data: PresenceSnapshot["data"]): PresenceSnapshot => ({ data, status: "live", lastUpdate: FIXED_NOW, error: null });
    const first = liveCardData(ID, snapshot(demoUserPresence), FIXED_NOW, profile);
    const updated = liveCardData(ID, snapshot(spotifyPresence), FIXED_NOW + 1000, profile);
    expect(first.profile).toEqual(profile);
    expect(updated.profile).toEqual(profile);
    expect(updated.spotify).not.toBeNull();
    expect(liveCardData(ID, snapshot(null), FIXED_NOW, profile).profile).toBeNull();
    expect(liveCardData(ID, snapshot(demoUserPresence), FIXED_NOW).profile).toBeNull();
    expect(liveCardData("123456789012345678", snapshot(demoUserPresence), FIXED_NOW, profile).profile).toBeNull();
  });
});

