import { beforeEach, describe, expect, it, vi } from "vitest";
import { profileExtras } from "./fixtures/profile-extras";
vi.mock("@/lib/discord/profile", () => ({ fetchProfileExtras: vi.fn() }));
const { fetchProfileExtras } = await import("@/lib/discord/profile");
const { GET } = await import("@/app/api/[id]/profile/route");
const call = async (id = "983724520789655613") => {
  return GET(new Request(`https://cards.example/api/${id}/profile`), { params: Promise.resolve({ id }) });
};
beforeEach(() => { vi.mocked(fetchProfileExtras).mockReset(); });
describe("profile JSON route", () => {
  it("rejects invalid IDs without querying the provider", async () => {
    expect((await call("nope")).status).toBe(400);
    expect(fetchProfileExtras).not.toHaveBeenCalled();
  });
  it("returns only normalized extras with SWR caching", async () => {
    vi.mocked(fetchProfileExtras).mockResolvedValue(profileExtras);
    const response = await call();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ profile: profileExtras });
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=30, stale-while-revalidate=3600");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
  it("handles an empty or failed provider without caching absence for long", async () => {
    for (const failing of [false, true]) {
      if (failing) vi.mocked(fetchProfileExtras).mockRejectedValue(new Error("down"));
      else vi.mocked(fetchProfileExtras).mockResolvedValue(null);
      const response = await call();
      expect(await response.json()).toEqual({ profile: null });
      expect(response.headers.get("Cache-Control")).toContain("s-maxage=5");
    }
  });
});
