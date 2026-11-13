/**
 * Small helpers shared by the Phase 6 themes (chat, banner, terminal, neon, retro, polaroid, mobile, voice).
 * Everything here is pure: layout numbers come from data/options only, never from DOM or wall-clock time.
 */
import type { CSSProperties } from "react";
import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import { activityTimer, formatClock, type ActivityTimer } from "@/lib/discord/time";
import type { CardSize } from "../types";
import { Clock, Progress } from "../parts/clock";
import { DEFAULT_TIME_ZONE, isUtcZone, parseTimeZone, zonedParts } from "@/lib/timezone";

export const STATUS_COLORS = { online: "#23a55a", idle: "#f0b232", dnd: "#f23f43", offline: "#80848e" } as const;

export const clampWidth = (width: number, min: number, max: number): number => Math.min(max, Math.max(min, Math.round(width)));

export function accentColor(data: CardData, options: CardOptions): string {
  return options.accent === "#5865f2" ? data.kv.accent ?? options.accent : options.accent;
}

/**
 * Root variables. Each theme supplies its own default canvas for both modes; `bg` always wins.
 * Themes with a fixed silhouette (pixel frame, photo, phone) pass `radius: false` and ignore the option.
 */
export function cardVars(data: CardData, options: CardOptions, size: CardSize, canvas: { dark: string; light: string }, { radius = true } = {}): CSSProperties {
  return { width: size.width, height: size.height, "--accent": accentColor(data, options), "--bg": options.bg ?? canvas[options.mode], ...(radius ? { "--radius": `${options.radius}px` } : {}) } as CSSProperties;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Snapshot time in the card's `tz` (default UTC). A server-rendered image cannot know the viewer's zone, so the
 * owner picks one. `zone` is "UTC" for UTC-like zones (shown as a suffix) and empty for a named local zone.
 */
export function snapshotClock(now: number, tz: string = DEFAULT_TIME_ZONE): { time: string; date: string; stamp: string; zone: string } {
  const zone = parseTimeZone(tz) ?? DEFAULT_TIME_ZONE;
  const d = zonedParts(now, zone);
  return {
    time: `${pad2(d.hour)}:${pad2(d.minute)}`,
    date: `${WEEKDAYS[d.weekday]}, ${MONTHS[d.month - 1]} ${d.day}`,
    stamp: `'${pad2(d.year % 100)} ${pad2(d.month)} ${pad2(d.day)}`,
    zone: isUtcZone(zone) ? "UTC" : "",
  };
}

/** "now", "2m", "1h", "3d" relative to the snapshot. */
export function ago(now: number, start: number | undefined): string {
  if (start === undefined || now - start < 60_000) return "now";
  const minutes = Math.floor((now - start) / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

export interface PresenceItem {
  key: string;
  kind: "spotify" | "activity";
  /** Discord activity type; Spotify is 2. */
  type: number;
  /** "Listening to Spotify", "Playing", "Live on Twitch" … */
  title: string;
  verb: string;
  name: string;
  /** Up to three secondary lines (details, state, party). */
  lines: string[];
  image: string | null;
  imageAlt: string;
  smallImage: string | null;
  timestamps: { start?: number; end?: number } | null;
  timer: ActivityTimer | null;
  buttons: string[];
}

/** Spotify first (when shown), then up to `max_activities` activities, after every hide control. */
export function presenceItems(data: CardData, options: CardOptions, limit = options.max_activities): PresenceItem[] {
  const items: PresenceItem[] = [];
  const timerFor = (timestamps: PresenceItem["timestamps"]) => options.hide_timestamps ? null : activityTimer(timestamps, data.now);
  if (!options.hide_spotify && data.spotify) {
    const s = data.spotify;
    items.push({ key: "spotify", kind: "spotify", type: 2, title: "Listening to Spotify", verb: "Listening to", name: s.song, lines: [s.artist, s.album].filter(Boolean), image: s.albumArt, imageAlt: s.album, smallImage: null, timestamps: s.timestamps, timer: timerFor(s.timestamps), buttons: [] });
  }
  if (!options.hide_activity) for (const a of data.activities.slice(0, limit)) {
    items.push({ key: a.key, kind: "activity", type: a.type, title: a.title, verb: a.verb, name: a.name, lines: [a.details, a.state, a.party].filter((line): line is string => Boolean(line)), image: a.largeImage?.url ?? a.appIcon, imageAlt: a.largeImage?.text ?? a.name, smallImage: a.smallImage?.url ?? null, timestamps: a.timestamps, timer: timerFor(a.timestamps), buttons: a.buttons });
  }
  return items;
}

/** Custom status text/emoji after hide controls; null when nothing should show. */
export function customStatus(data: CardData, options: CardOptions) {
  const status = !options.hide_custom_status ? data.customStatus : null;
  return status && (status.text || status.emoji) ? status : null;
}

/** Static emoji URL (custom GIF → PNG) for small, still compositions. */
export function staticEmojiUrl(emoji: { url: string | null; custom: boolean } | null | undefined): string | null {
  if (!emoji?.url) return null;
  return emoji.custom ? emoji.url.replace(/\.gif(?=\?|$)/, ".png") : emoji.url;
}

export function emojiUrl(emoji: { url: string | null; custom: boolean } | null | undefined, animated: boolean): { url: string; fallback?: string } | null {
  if (!emoji?.url) return null;
  if (!emoji.custom) return { url: emoji.url };
  const still = staticEmojiUrl(emoji)!;
  return { url: animated ? emoji.url : still, fallback: still };
}

export const TYPE_GLYPHS: Readonly<Record<number, string>> = { 0: "▶", 1: "●", 2: "♫", 3: "◉", 5: "✦" };

/** Embed colour per activity kind: Spotify green, live purple, watching red, else the accent. */
export function itemColor(item: PresenceItem): string {
  if (item.kind === "spotify") return "#1ed760";
  if (item.type === 1) return "#9b5cff";
  if (item.type === 3) return "#f23f43";
  return "var(--accent)";
}

/** Timer copy using the shared snapshot clock: elapsed counts up, end-only counts down, both is a progress bar. */
export function TimerLine({ timer, animated, progressBar = true, suffix = true }: { timer: ActivityTimer; animated: boolean; progressBar?: boolean; suffix?: boolean }) {
  if (timer.mode === "progress") return <div className="timer-progress">{progressBar && <Progress elapsedMs={timer.elapsedMs} durationMs={timer.durationMs} animated={animated} />}<div className="time-labels"><Clock direction="up" valueMs={timer.elapsedMs} limitMs={timer.durationMs} animated={animated} /><span>{formatClock(timer.durationMs / 1000)}</span></div></div>;
  return <span className="timer-text"><Clock direction={timer.mode === "elapsed" ? "up" : "down"} valueMs={timer.mode === "elapsed" ? timer.elapsedMs : timer.remainingMs} padMinutes animated={animated} />{suffix && (timer.mode === "elapsed" ? " elapsed" : " left")}</span>;
}

/**
 * Reduced-motion users see the resting frame of decorative animations. Clock reels and progress bars are
 * deliberately excluded: they encode the snapshot time and must keep their phase.
 */
export function reducedMotion(selectors: string[]): string {
  return `@media (prefers-reduced-motion:reduce){${selectors.join(",")}{animation:none!important}}`;
}
