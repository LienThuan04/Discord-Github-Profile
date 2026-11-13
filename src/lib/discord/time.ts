/**
 * Time math for activity timestamps and CSS snapshot clocks.
 *
 * The SVG card is a snapshot, so running clocks are drawn as CSS "digit reels": each digit is a
 * vertical strip of numbers that a `steps()` animation scrolls once per unit. A negative
 * `animation-delay` puts every reel at the right phase for the moment the image was rendered,
 * so the clock keeps counting after the image is served. The live card (JS) re-renders instead.
 */

import type { ActivityTimestamps } from "@/lib/lanyard/types";

export interface FormatClockOptions {
  /** Pad minutes to two digits below one hour (`05:09`). Discord does this for activities. */
  padMinutes?: boolean;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Label for the part of a clock before the seconds: `7`, `07`, `1:00`. */
export function minuteLabel(totalMinutes: number, padMinutes: boolean): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}:${pad2(minutes)}`;
  return padMinutes ? pad2(minutes) : String(minutes);
}

/** Formats seconds as `m:ss`, `mm:ss` or `h:mm:ss`. Fractions are floored. */
export function formatClock(seconds: number, options: FormatClockOptions = {}): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const totalMinutes = Math.floor(safe / 60);
  return `${minuteLabel(totalMinutes, options.padMinutes ?? false)}:${pad2(safe % 60)}`;
}

export type ActivityTimer =
  | { mode: "elapsed"; elapsedMs: number }
  | { mode: "remaining"; remainingMs: number }
  | { mode: "progress"; elapsedMs: number; durationMs: number };

/**
 * Interprets Discord activity timestamps the way the Discord client does:
 * start + end is a progress bar, end only counts down, start only counts up.
 */
export function activityTimer(
  timestamps: ActivityTimestamps | null | undefined,
  now: number,
): ActivityTimer | null {
  const start = typeof timestamps?.start === "number" ? timestamps.start : undefined;
  const end = typeof timestamps?.end === "number" ? timestamps.end : undefined;

  if (start !== undefined && end !== undefined && end > start) {
    const durationMs = end - start;
    const elapsedMs = Math.min(Math.max(now - start, 0), durationMs);
    return { mode: "progress", elapsedMs, durationMs };
  }
  if (start !== undefined) {
    return { mode: "elapsed", elapsedMs: Math.max(now - start, 0) };
  }
  if (end !== undefined) {
    return { mode: "remaining", remainingMs: Math.max(end - now, 0) };
  }
  return null;
}

/** One CSS digit reel. `rows.length === steps + 1`; the last row only exists for the wrap. */
export interface ClockReel {
  rows: string[];
  steps: number;
  /** Phase at render time, used as a negative `animation-delay`. */
  delaySeconds: number;
  /** Width of the reel window in `ch`. */
  widthCh: number;
}

export interface ClockSpec {
  /** Text for the moment of rendering (also used for accessibility). */
  snapshot: string;
  /** Text shown after the reels stop. */
  final: string;
  /** Seconds until the reels stop and `final` takes over. */
  runSeconds: number;
  minutes: ClockReel;
  tens: ClockReel;
  ones: ClockReel;
  /** Seconds per row for each reel. */
  stepSeconds: { minutes: 60; tens: 10; ones: 1 };
}

export interface BuildClockInput {
  direction: "up" | "down";
  /** Current value of the clock in ms (elapsed for `up`, remaining for `down`). */
  valueMs: number;
  /** For `up`: the value where the clock stops (e.g. track length). */
  limitMs?: number;
  /** For open-ended `up` clocks: how far ahead the reels reach. Default two hours. */
  horizonMs?: number;
  padMinutes?: boolean;
}

const DEFAULT_HORIZON_MS = 2 * 60 * 60 * 1000;
const mod = (a: number, n: number) => ((a % n) + n) % n;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function reel(rows: string[], delaySeconds: number, widthCh = 1): ClockReel {
  return { rows, steps: rows.length - 1, delaySeconds, widthCh };
}

/** Builds the reel data for a running clock, or `null` when nothing would move. */
export function buildClock(input: BuildClockInput): ClockSpec | null {
  if (!Number.isFinite(input.valueMs)) return null;
  const padMinutes = input.padMinutes ?? false;
  const fmt = (s: number) => formatClock(s, { padMinutes });
  const value = Math.max(input.valueMs, 0) / 1000;

  if (input.direction === "up") {
    const limit =
      input.limitMs !== undefined ? input.limitMs / 1000 : value + (input.horizonMs ?? DEFAULT_HORIZON_MS) / 1000;
    if (!(limit > value) || !Number.isFinite(limit) || limit - value > 86_400) return null;

    const firstMinute = Math.floor(value / 60);
    const lastMinute = Math.floor(limit / 60);
    const minuteRows = range(firstMinute, lastMinute + 1).map((m) => minuteLabel(m, padMinutes));
    const widthCh = Math.max(...minuteRows.slice(0, -1).map((r) => r.length));

    return {
      snapshot: fmt(value),
      final: fmt(limit),
      runSeconds: limit - value,
      minutes: reel(minuteRows, mod(value, 60), widthCh),
      tens: reel(["0", "1", "2", "3", "4", "5", "0"], mod(value, 60)),
      ones: reel(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"], mod(value, 10)),
      stepSeconds: { minutes: 60, tens: 10, ones: 1 },
    };
  }

  if (!(value > 0) || value > 86_400) return null;
  // At an exact second, stay on that digit until the countdown crosses the boundary.
  // Without the tiny phase offset, steps(end) selects the next lower digit immediately.
  const phase = (period: number) => mod(period - mod(value, period) - 0.000001, period);
  const firstMinute = Math.floor(value / 60);
  // Rows count down to 0; one spare row keeps the reel from wrapping before it is hidden.
  const minuteRows = [...range(0, firstMinute).reverse(), 0].map((m) => minuteLabel(m, padMinutes));
  const widthCh = Math.max(...minuteRows.slice(0, -1).map((r) => r.length));

  return {
    snapshot: fmt(value),
    final: fmt(0),
    runSeconds: value,
    minutes: reel(minuteRows, phase(60), widthCh),
    tens: reel(["5", "4", "3", "2", "1", "0", "5"], phase(60)),
    ones: reel(["9", "8", "7", "6", "5", "4", "3", "2", "1", "0", "9"], phase(10)),
    stepSeconds: { minutes: 60, tens: 10, ones: 1 },
  };
}

/** Progress as a percentage in [0, 100]. */
export function progressPercent(elapsedMs: number, durationMs: number): number {
  if (!(durationMs > 0)) return 0;
  return Math.min(Math.max((elapsedMs / durationMs) * 100, 0), 100);
}
