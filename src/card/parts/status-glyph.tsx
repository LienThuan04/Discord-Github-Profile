import type { CardData } from "@/lib/lanyard/card-data";

/** Discord's presence colors. */
export const STATUS_COLORS = { online: "#23a55a", idle: "#f0b232", dnd: "#f23f43", offline: "#80848e" } as const;

export type StatusGlyphKind = CardData["status"] | "mobile";

/**
 * Discord-style presence shapes on a 10×10 grid, drawn as single even-odd paths (no SVG ids, so any number of
 * cards can share one document):
 * - online: a full circle
 * - idle: a crescent moon (the circle minus a circle offset to the top-left)
 * - dnd: a circle with a rounded horizontal bar cut out
 * - offline: a ring
 * - mobile: a phone, shown when the user is online only on mobile
 */
export const STATUS_PATHS: Record<StatusGlyphKind, string> = {
  online: "M5 0a5 5 0 1 1 0 10A5 5 0 1 1 5 0Z",
  idle: "M5.303 .009A5 5 0 1 1 .009 5.303 3.75 3.75 0 0 0 5.303 .009Z",
  dnd: "M5 0a5 5 0 1 1 0 10A5 5 0 1 1 5 0ZM2.5 3.75h5a1.25 1.25 0 0 1 0 2.5h-5a1.25 1.25 0 0 1 0-2.5Z",
  offline: "M5 0a5 5 0 1 1 0 10A5 5 0 1 1 5 0ZM5 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5Z",
  mobile: "M3.6 0h2.8A1.6 1.6 0 0 1 8 1.6v6.8A1.6 1.6 0 0 1 6.4 10H3.6A1.6 1.6 0 0 1 2 8.4V1.6A1.6 1.6 0 0 1 3.6 0ZM3.2 1.4h3.6v6.2H3.2Z",
};

/** The shape Discord shows: a phone for users online only on mobile, otherwise the status itself. */
export function statusGlyphKind(data: Pick<CardData, "status" | "platforms">): StatusGlyphKind {
  return data.status === "online" && data.platforms.includes("mobile") && !data.platforms.some((platform) => platform !== "mobile") ? "mobile" : data.status;
}

/** Fills its host (which sets the size) with the status shape in the status color. */
export function StatusGlyph({ data }: { data: Pick<CardData, "status" | "platforms"> }) {
  const kind = statusGlyphKind(data);
  return <svg xmlns="http://www.w3.org/2000/svg" className={`status-glyph sd-${kind}`} viewBox="0 0 10 10" aria-hidden="true"><path fill={STATUS_COLORS[kind === "mobile" ? "online" : kind]} fillRule="evenodd" d={STATUS_PATHS[kind]} /></svg>;
}

/**
 * Shared rules for every theme (appended through `styleCss`). Colors live on the path itself. Hosts keep their theme
 * size and border; the avatar dot paints the card background behind the glyph so the crescent and ring cut-outs read
 * like Discord's, and the old per-theme `:after` bar/moon hacks are switched off.
 */
export const statusGlyphCss = (root: string) => `${root} .status-glyph{display:block;width:100%;height:100%}`
  + `${root} .status-dot{background:var(--bg)!important}${root} .status-dot:after{content:none!important}`
  + `${root} .sd-host{background:none!important;box-shadow:none!important}`;
