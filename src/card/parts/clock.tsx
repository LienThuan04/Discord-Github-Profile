import type { CSSProperties } from "react";
import { buildClock, formatClock, progressPercent, type BuildClockInput, type ClockReel } from "@/lib/discord/time";

function Reel({ reel, seconds }: { reel: ClockReel; seconds: number }) {
  return <span className="clock-window" style={{ width: `${reel.widthCh}ch` }}><span className="clock-reel" style={{ "--rows": reel.steps, animationDuration: `${reel.steps * seconds}s`, animationTimingFunction: `steps(${reel.steps}, end)`, animationDelay: `-${reel.delaySeconds}s` } as CSSProperties}>{reel.rows.map((row, i) => <span key={i}>{row}</span>)}</span></span>;
}

export function Clock({ animated, ...input }: BuildClockInput & { animated: boolean }) {
  const clock = animated ? buildClock(input) : null;
  if (!clock) return <span>{formatClock(input.valueMs / 1000, { padMinutes: input.padMinutes })}</span>;
  return <span className="clock" role="timer" aria-label={clock.snapshot} style={{ "--run": `${clock.runSeconds}s` } as CSSProperties}>
    <span className="clock-running" aria-hidden="true"><Reel reel={clock.minutes} seconds={60} /><span>:</span><Reel reel={clock.tens} seconds={10} /><Reel reel={clock.ones} seconds={1} /></span>
    <span className="clock-final" aria-hidden="true">{clock.final}</span>
  </span>;
}

export function Progress({ elapsedMs, durationMs, animated }: { elapsedMs: number; durationMs: number; animated: boolean }) {
  return <div className="progress-track"><div className="progress-fill" style={{ width: `${progressPercent(elapsedMs, durationMs)}%`, ...(animated && durationMs > elapsedMs ? { animationName: "dgp-progress", animationDuration: `${durationMs / 1000}s`, animationDelay: `-${elapsedMs / 1000}s`, animationTimingFunction: "linear", animationFillMode: "forwards" } : {}) }} /></div>;
}
