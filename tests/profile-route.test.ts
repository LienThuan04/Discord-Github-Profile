import { beforeEach, describe, expect, it, vi } from "vitest";
import { profileExtras } from "./fixtures/profile-extras";
import type { ProfileLookup } from "@/lib/discord/profile";
vi.mock("@/lib/discord/profile", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/discord/profile")>()), lookupProfileExtras: vi.fn() }));
vi.mock("@/lib/lanyard/client", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/lanyard/client")>()), fetchPresence: vi.fn(async () => ({ ok: false, kind: "network_error", message: "offline" })) }));
vi.mock("next/server", () => ({ after: vi.fn() }));
const { lookupProfileExtras } = await import("@/lib/discord/profile");
const { after } = await import("next/server");
const { GET } = await import("@/app/api/[id]/profile/route");
const call = async (id = "983724520789655613") => {
  return GET(new Request(`https://cards.example/api/${id}/profile`), { params: Promise.resolve({ id }) });
};
const lookup = (profile: ProfileLookup["profile"], complete = true): ProfileLookup => ({ profile, complete, settled: Promise.resolve() });
beforeEach(() => { vi.mocked(lookupProfileExtras).mockReset(); vi.mocked(after).mockReset(); });
describe("profile JSON route", () => {
  it("rejects invalid IDs without querying the provider", async () => {
    expect((await call("nope")).status).toBe(400);
    expect(lookupProfileExtras).not.toHaveBeenCalled();
  });
  it("returns only normalized extras with SWR caching", async () => {
    vi.mocked(lookupProfileExtras).mockResolvedValue(lookup(profileExtras));
    const response = await call();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ profile: profileExtras });
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=30, stale-while-revalidate=3600");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(after).not.toHaveBeenCalled();
  });
  it("handles an empty or failed provider without caching absence for long", async () => {
    for (const failing of [false, true]) {
      if (failing) vi.mocked(lookupProfileExtras).mockRejectedValue(new Error("down"));
      else vi.mocked(lookupProfileExtras).mockResolvedValue(lookup(null, false));
      const response = await call();
      expect(await response.json()).toEqual({ profile: null });
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=5");
    }
  });
  it("does not let the edge serve an incomplete profile stale, and finishes the lookup after responding", async () => {
    vi.mocked(lookupProfileExtras).mockResolvedValue(lookup(profileExtras, false));
    const response = await call();
    expect(await response.json()).toEqual({ profile: profileExtras });
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=5");
    expect(after).toHaveBeenCalledTimes(1);
  });
});
