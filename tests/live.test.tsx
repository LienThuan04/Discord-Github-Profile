import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { LiveCard, LivePresence, cardError } from "@/live/LiveCard";
import { parseCardOptions, DEMO_ID } from "@/lib/embed";
import { themes } from "@/card/theme-registry";
import { demoUserPresence, FIXED_NOW, spotifyPresence } from "./fixtures";
import type { PresenceSnapshot } from "@/lib/lanyard/socket";

const snapshot: PresenceSnapshot = { data: demoUserPresence, status: "live", lastUpdate: FIXED_NOW, error: null };
describe("live card", () => {
  it("renders URL assets and the animated nameplate through target=live", () => {
    const html = renderToString(<LiveCard id={DEMO_ID} options={parseCardOptions()} snapshot={snapshot} initialNow={FIXED_NOW} />);
    expect(html).toContain("<video"); expect(html).toContain("asset.webm"); expect(html).toContain("LiênThuận");
    expect(html).not.toContain("data:image");
  });
  it("respects animated=false", () => {
    const html = renderToString(<LiveCard id={DEMO_ID} options={parseCardOptions({ animated: "false" })} snapshot={snapshot} initialNow={FIXED_NOW} />);
    expect(html).not.toContain("<video"); expect(html).toContain("static.png");
  });
  it("normalizes the supplied timestamp for clocks with no implicit render-time clock", () => {
    const now = vi.spyOn(Date, "now").mockImplementation(() => { throw new Error("Clock must be explicit"); });
    try {
      const html = renderToString(<LiveCard id={DEMO_ID} options={parseCardOptions({ animated: "false" })} snapshot={{ ...snapshot, data: spotifyPresence }} initialNow={FIXED_NOW} />);
      expect(html).toContain("1:23"); expect(html).toContain("Never Gonna Give You Up");
    } finally { now.mockRestore(); }
  });
  it.each(Object.values(themes).map((theme) => [theme.name]))("renders registered theme %s and its error state", (theme) => {
    const options = parseCardOptions({ theme });
    expect(renderToString(<LiveCard id={DEMO_ID} options={options} snapshot={snapshot} initialNow={FIXED_NOW} />)).toContain("dgp-");
    const error = renderToString(<LiveCard id={DEMO_ID} options={options} snapshot={{ ...snapshot, data: null, error: "not_monitored" }} initialNow={FIXED_NOW} />);
    expect(error).toContain("Join discord.gg/lanyard");
  });
  it("renders invalid IDs as a themed error without throwing from the avatar builder", () => {
    expect(renderToString(<LivePresence id="bad" options={parseCardOptions()} initial={null} initialError="invalid_id" initialNow={FIXED_NOW} />)).toContain("Invalid Discord ID");
  });
  it("keeps a useful snapshot during a network error and offers friendly empty states", () => {
    expect(cardError("unavailable", true)).toBeUndefined();
    expect(cardError("unavailable", false)?.title).toBe("Presence unavailable");
    expect(cardError(null, false)?.title).toBe("Finding your presence");
  });
});
