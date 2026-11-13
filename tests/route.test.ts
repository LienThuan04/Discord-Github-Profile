import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/[id]/route";

afterEach(() => vi.unstubAllGlobals());
describe("SVG API boundary", () => {
  it("returns a themed 200 SVG for an invalid snowflake without fetching", async () => {
    const network = vi.fn(); vi.stubGlobal("fetch", network);
    const result = await GET(new Request("https://card.example/api/nope?mode=light"), { params: Promise.resolve({ id: "nope" }) });
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(result.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=30, stale-while-revalidate=3600");
    const body = await result.text();
    expect(body).toContain("Invalid Discord ID");
    expect(body).toContain("dgp-profile light");
    expect(network).not.toHaveBeenCalled();
  });
  it("explains how unmonitored users can join Lanyard", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: false, error: { code: "user_not_monitored", message: "Not monitored" } }), { status: 404 })));
    const result = await GET(new Request("https://card.example/api/983724520789655613"), { params: Promise.resolve({ id: "983724520789655613" }) });
    expect(result.status).toBe(200);
    expect(await result.text()).toContain("Join discord.gg/lanyard to show your presence");
  });
  it("turns network and malformed-payload failures into friendly cards", async () => {
    for (const network of [async () => { throw new Error("socket error"); }, async () => new Response(JSON.stringify({ success: true, data: {} }))]) {
      vi.stubGlobal("fetch", vi.fn(network));
      const result = await GET(new Request("https://card.example/api/983724520789655613"), { params: Promise.resolve({ id: "983724520789655613" }) });
      expect(result.status).toBe(200);
      expect(await result.text()).toContain("Presence unavailable");
    }
  });
});
