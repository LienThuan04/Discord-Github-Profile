import type { CSSProperties } from "react";
import type { ActivityView, CardData } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import type { EqStyle } from "@/lib/style-options";

/** True for Discord "Listening to" activities (type 2), which get the equalizer like Spotify does. */
export const isListeningActivity = (activity: Pick<ActivityView, "type">) => activity.type === 2;

/** Whether the card can show an equalizer: visible Spotify or a visible "Listening to" activity. */
export function hasListening(data: CardData, options: CardOptions): boolean {
  return Boolean((!options.hide_spotify && data.spotify) || (!options.hide_activity && data.activities.slice(0, options.max_activities).some(isListeningActivity)));
}

// Deterministic per-bar heights (static frame), durations and phase offsets: no randomness.
const H = [0.55, 0.95, 0.4, 0.8, 0.65, 1, 0.45, 0.75, 0.9, 0.35, 0.7, 0.5, 0.85, 0.6];
const T = [0.82, 1.04, 0.7, 0.94, 0.76, 1.12, 0.88, 0.66, 0.98, 0.74, 1.06, 0.8, 0.9, 0.72];
const bar = (i: number, extra: CSSProperties = {}) => ({ "--h": H[i % H.length], "--t": `${T[i % T.length]}s`, "--o": `-${((i * 0.37) % 1).toFixed(2)}s`, ...extra }) as CSSProperties;
const bars = (count: number, extra?: (i: number) => CSSProperties) => Array.from({ length: count }, (_, i) => <i key={i} style={bar(i, extra?.(i))} />);

const WAVE = "M0 6C3.25 1 9.75 1 13 6S22.75 11 26 6S35.75 1 39 6S48.75 11 52 6";
const LINE = "M0 6H6L8 3L10 9L12 1L14 11L16 6H26H32L34 3L36 9L38 1L40 11L42 6H52";

/**
 * Small animated equalizer (about 12px tall, 12–30px wide) for Spotify and "Listening to" titles.
 * It inherits `color`, never changes layout height, and freezes on a designed static frame when
 * `animated=false` or the viewer prefers reduced motion. `eq_style=none` renders nothing.
 */
export function Equalizer({ options, className = "" }: { options: Pick<CardOptions, "eq_style">; className?: string }) {
  const style: EqStyle = options.eq_style;
  if (style === "none") return null;
  const classes = `sx-eq sx-eq-${style}${className ? ` ${className}` : ""}`;
  let content;
  switch (style) {
    case "bars": content = bars(4); break;
    case "mirror": content = bars(7); break;
    case "spectrum": content = bars(12); break;
    case "dots": content = bars(4, (i) => ({ "--px": `${[6, 12, 3, 9][i]}px` }) as CSSProperties); break;
    case "blocks": content = bars(3, (i) => ({ "--px": `${[8, 12, 4][i]}px` }) as CSSProperties); break;
    case "pulse": content = bars(3, (i) => ({ "--h": [0.7, 1, 0.7][i], "--a": [0.6, 1, 0.6][i], "--o": `-${(1.2 - i * 0.2).toFixed(1)}s` }) as CSSProperties); break;
    case "wave": content = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 12"><path className="sx-echo" d={WAVE} transform="translate(0 1.5)" /><path d={WAVE} /></svg>; break;
    case "line": content = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 12"><path d={LINE} /></svg>; break;
    case "circle": content = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><circle className="sx-track" cx="6" cy="6" r="5" /><circle className="sx-arc" cx="6" cy="6" r="5" /><circle className="sx-core" cx="6" cy="6" r="1.8" /></svg>; break;
  }
  return <span className={classes} aria-hidden="true">{content}</span>;
}
