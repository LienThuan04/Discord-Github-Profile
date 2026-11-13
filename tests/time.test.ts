import { describe, expect, it } from "vitest";
import {
  activityTimer,
  buildClock,
  formatClock,
  minuteLabel,
} from "@/lib/discord/time";

describe("formatClock", () => {
  it("formats minutes and seconds without padding by default", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(599.9)).toBe("9:59");
  });

  it("pads minutes when asked (Discord activity style)", () => {
    expect(formatClock(65, { padMinutes: true })).toBe("01:05");
    expect(formatClock(3599, { padMinutes: true })).toBe("59:59");
  });

  it("switches to h:mm:ss at one hour", () => {
    expect(formatClock(3600)).toBe("1:00:00");
    expect(formatClock(3600 + 62, { padMinutes: true })).toBe("1:01:02");
    expect(formatClock(10 * 3600 + 59 * 60 + 59)).toBe("10:59:59");
  });

  it("clamps negatives and non-finite values to zero", () => {
    expect(formatClock(-5)).toBe("0:00");
    expect(formatClock(Number.NaN)).toBe("0:00");
  });
});

describe("minuteLabel", () => {
  it("renders the part before the seconds", () => {
    expect(minuteLabel(0, false)).toBe("0");
    expect(minuteLabel(7, true)).toBe("07");
    expect(minuteLabel(60, true)).toBe("1:00");
    expect(minuteLabel(125, false)).toBe("2:05");
  });
});

describe("activityTimer", () => {
  const now = 1_000_000_000_000;

  it("returns null without timestamps", () => {
    expect(activityTimer(undefined, now)).toBeNull();
    expect(activityTimer({}, now)).toBeNull();
  });

  it("counts up from start only", () => {
    const t = activityTimer({ start: now - 90_000 }, now);
    expect(t).toEqual({ mode: "elapsed", elapsedMs: 90_000 });
  });

  it("counts down to end only", () => {
    const t = activityTimer({ end: now + 30_500 }, now);
    expect(t).toEqual({ mode: "remaining", remainingMs: 30_500 });
  });

  it("reports progress when both exist", () => {
    const t = activityTimer({ start: now - 60_000, end: now + 120_000 }, now);
    expect(t).toEqual({ mode: "progress", elapsedMs: 60_000, durationMs: 180_000 });
  });

  it("clamps progress into [0, duration]", () => {
    expect(activityTimer({ start: now + 5_000, end: now + 65_000 }, now)).toEqual({
      mode: "progress",
      elapsedMs: 0,
      durationMs: 60_000,
    });
    expect(activityTimer({ start: now - 90_000, end: now - 30_000 }, now)).toEqual({
      mode: "progress",
      elapsedMs: 60_000,
      durationMs: 60_000,
    });
  });

  it("never returns a negative elapsed or remaining time", () => {
    expect(activityTimer({ start: now + 10_000 }, now)).toEqual({ mode: "elapsed", elapsedMs: 0 });
    expect(activityTimer({ end: now - 10_000 }, now)).toEqual({ mode: "remaining", remainingMs: 0 });
  });

  it("falls back to elapsed time when end timestamp is zero or not after start", () => {
    expect(activityTimer({ start: now - 45_000, end: 0 }, now)).toEqual({ mode: "elapsed", elapsedMs: 45_000 });
    expect(activityTimer({ start: now - 45_000, end: now - 60_000 }, now)).toEqual({ mode: "elapsed", elapsedMs: 45_000 });
  });
});

describe("buildClock (count up, bounded)", () => {
  it("mirrors the Spotify snapshot math", () => {
    // 1:23.4 into a 3:30 track.
    const clock = buildClock({ direction: "up", valueMs: 83_400, limitMs: 210_000 });
    expect(clock).not.toBeNull();
    if (!clock) return;
    expect(clock.snapshot).toBe("1:23");
    expect(clock.final).toBe("3:30");
    expect(clock.runSeconds).toBeCloseTo(126.6, 5);
    expect(clock.minutes.rows).toEqual(["1", "2", "3", "4"]);
    expect(clock.minutes.steps).toBe(3);
    expect(clock.minutes.delaySeconds).toBeCloseTo(23.4, 5);
    expect(clock.minutes.widthCh).toBe(1);
    expect(clock.tens.rows).toEqual(["0", "1", "2", "3", "4", "5", "0"]);
    expect(clock.tens.delaySeconds).toBeCloseTo(23.4, 5);
    expect(clock.ones.rows).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]);
    expect(clock.ones.delaySeconds).toBeCloseTo(3.4, 5);
  });

  it("returns null once the limit is reached", () => {
    expect(buildClock({ direction: "up", valueMs: 210_000, limitMs: 210_000 })).toBeNull();
  });
});

describe("buildClock (count up, open ended)", () => {
  it("uses a horizon and switches to hours inside the minute reel", () => {
    const clock = buildClock({
      direction: "up",
      valueMs: 58 * 60_000 + 10_000,
      horizonMs: 3 * 60_000,
      padMinutes: true,
    });
    expect(clock).not.toBeNull();
    if (!clock) return;
    expect(clock.snapshot).toBe("58:10");
    expect(clock.minutes.rows).toEqual(["58", "59", "1:00", "1:01", "1:02"]);
    expect(clock.minutes.widthCh).toBe(4);
    expect(clock.final).toBe("1:01:10");
    expect(clock.runSeconds).toBeCloseTo(180, 5);
  });
});

describe("buildClock (count down)", () => {
  it("runs reels backwards with matching phases", () => {
    // 2:05.5 left.
    const clock = buildClock({ direction: "down", valueMs: 125_500 });
    expect(clock).not.toBeNull();
    if (!clock) return;
    expect(clock.snapshot).toBe("2:05");
    expect(clock.final).toBe("0:00");
    expect(clock.runSeconds).toBeCloseTo(125.5, 5);
    // The last row is a never-shown spare so the reel never wraps while running.
    expect(clock.minutes.rows).toEqual(["2", "1", "0", "0"]);
    expect(clock.minutes.steps).toBe(3);
    expect(clock.ones.rows).toEqual(["9", "8", "7", "6", "5", "4", "3", "2", "1", "0", "9"]);
    expect(clock.tens.rows).toEqual(["5", "4", "3", "2", "1", "0", "5"]);
    // After `delay` seconds of phase the reel shows the snapshot digit.
    expect(Math.floor(clock.ones.delaySeconds)).toBe(9 - 5);
    expect(Math.floor(clock.tens.delaySeconds / 10)).toBe(5 - 0);
    expect(Math.floor(clock.minutes.delaySeconds / 60)).toBe(0);
  });

  it("returns null at zero", () => {
    expect(buildClock({ direction: "down", valueMs: 0 })).toBeNull();
  });
});

/** Simulates what the CSS reels display at time `t` seconds after render. */
function displayAt(clock: NonNullable<ReturnType<typeof buildClock>>, t: number): string {
  const row = (reel: typeof clock.ones, stepSeconds: number) => {
    const period = reel.steps * stepSeconds;
    const phase = (((reel.delaySeconds + t) % period) + period) % period;
    return reel.rows[Math.floor(phase / stepSeconds)];
  };
  return `${row(clock.minutes, 60)}:${row(clock.tens, 10)}${row(clock.ones, 1)}`;
}

describe("buildClock simulation", () => {
  it("count up stays in sync with formatClock", () => {
    const start = 83_400;
    const clock = buildClock({ direction: "up", valueMs: start, limitMs: 400_000 });
    if (!clock) throw new Error("clock expected");
    for (const t of [0, 0.7, 1.2, 7.3, 36.7, 37.1, 99.9, 200.5]) {
      expect(displayAt(clock, t)).toBe(formatClock(start / 1000 + t));
    }
  });

  it("count down stays in sync with formatClock", () => {
    const start = 125_500;
    const clock = buildClock({ direction: "down", valueMs: start });
    if (!clock) throw new Error("clock expected");
    for (const t of [0, 0.4, 0.6, 5.7, 6.2, 65.4, 66, 120.1]) {
      expect(displayAt(clock, t)).toBe(formatClock(start / 1000 - t));
    }
  });
});
