import { expect, it } from "vitest";
import { buildClock, type ClockReel } from "@/lib/discord/time";

const visible = (reel: ClockReel, seconds: number, after = 0) => reel.rows[Math.floor((reel.delaySeconds + after) / seconds) % reel.steps];
it.each([60_000, 72_000, 72_300, 3_600_000])("phases countdown reels at %i ms", (valueMs) => {
  const clock = buildClock({ direction: "down", valueMs })!;
  const time = `${visible(clock.minutes, 60)}:${visible(clock.tens, 10)}${visible(clock.ones, 1)}`;
  expect(time).toBe(clock.snapshot);
});
it("bounds reel allocation for hostile or extremely long timestamps", () => {
  expect(buildClock({ direction: "up", valueMs: 1000, limitMs: 1e15 })).toBeNull();
  expect(buildClock({ direction: "down", valueMs: Number.POSITIVE_INFINITY })).toBeNull();
});
