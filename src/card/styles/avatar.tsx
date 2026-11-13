import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import type { AvatarShape, RingStyle } from "@/lib/style-options";

/** Shape outlines in a 0–100 box. Regular shapes, so scaling about the centre is a uniform offset. */
export const SHAPE_PATHS: Record<AvatarShape, string> = {
  circle: "M50 0A50 50 0 1 1 50 100A50 50 0 1 1 50 0Z",
  squircle: "M30 0H70A30 30 0 0 1 100 30V70A30 30 0 0 1 70 100H30A30 30 0 0 1 0 70V30A30 30 0 0 1 30 0Z",
  square: "M14 0H86A14 14 0 0 1 100 14V86A14 14 0 0 1 86 100H14A14 14 0 0 1 0 86V14A14 14 0 0 1 14 0Z",
  hexagon: "M50 0L93.3 25V75L50 100L6.7 75V25Z",
  octagon: "M29.3 0H70.7L100 29.3V70.7L70.7 100H29.3L0 70.7V29.3Z",
};

/** Ring outlines drawn a few pixels outside the avatar: rounded corners grow so the offset stays even. */
const RING_PATHS = {
  squircle: "M33 0H67A33 33 0 0 1 100 33V67A33 33 0 0 1 67 100H33A33 33 0 0 1 0 67V33A33 33 0 0 1 33 0Z",
  square: "M19 0H81A19 19 0 0 1 100 19V81A19 19 0 0 1 81 100H19A19 19 0 0 1 0 81V19A19 19 0 0 1 19 0Z",
};

export type StatusPlacement = "dot" | "pill" | "text" | "ring" | "hidden";
export interface AvatarLook {
  shape: AvatarShape;
  /** Decorative ring after the decoration-aware rule; `none` when nothing is drawn. */
  ring: RingStyle;
  /** `soft` when a halo ring (glow/pulse) is toned down behind a visible decoration. */
  tone: "full" | "soft";
  /** Where the presence status is shown. */
  status: StatusPlacement;
  decorated: boolean;
}

/**
 * Decoration-aware ring rule (documented in docs/THEME-CONTRACT.md):
 * 1. A visible avatar decoration owns the space around the avatar. Line rings (status, accent, gradient,
 *    rainbow, dashed, double) are suppressed; halo rings (glow, pulse) stay as a soft, thinner halo.
 * 2. `status_style=ring` draws the presence ring in the ring slot and replaces the decorative ring. With a
 *    visible decoration it falls back to the dot so the status stays legible.
 * 3. `ring=status` needs a visible status: with `hide_status=true` no ring is drawn.
 */
export function resolveAvatarLook(options: Pick<CardOptions, "avatar_shape" | "ring" | "status_style" | "hide_status">, decorated: boolean): AvatarLook {
  const status: StatusPlacement = options.hide_status ? "hidden" : options.status_style === "ring" && decorated ? "dot" : options.status_style;
  let ring: RingStyle = status === "ring" ? "none" : options.ring;
  if (ring === "status" && status === "hidden") ring = "none";
  const halo = ring === "glow" || ring === "pulse";
  if (decorated && !halo) ring = "none";
  return { shape: options.avatar_shape, ring, tone: decorated && halo ? "soft" : "full", status, decorated };
}

const RAINBOW = ["#ff5f6d", "#ffc371", "#35ed7e", "#00b0f4", "#5865f2", "#ec48bd", "#ff5f6d"];
/** Gradient ids must be unique per document; the user id keeps neighbouring cards apart. */
const gradientId = (data: CardData, ring: string) => `sx-${ring}-${data.user.id}`;

/**
 * Ring drawn just outside the avatar box with an SVG stroke, so it follows every shape exactly.
 * Size it with `--sx-ring-w` (stroke, default 3px) and `--sx-ring-gap` (gap, default 3px) on any ancestor.
 * Place it as the first child of a `position:relative; isolation:isolate` avatar wrapper.
 */
export function AvatarRing({ data, look }: { data: CardData; look: AvatarLook }) {
  const presence = look.status === "ring";
  if (!presence && look.ring === "none") return null;
  const d = SHAPE_PATHS[look.shape];
  const kind = presence ? "presence" : look.ring;
  const colored = presence || look.ring === "status" ? ` sx-is-${data.status}` : "";
  const className = `sx-ring sx-ring-${kind}${colored}${look.tone === "soft" ? " sx-ring-soft" : ""}`;
  const gradient = look.ring === "gradient" || look.ring === "rainbow";
  const id = gradientId(data, look.ring);
  const stops = look.ring === "rainbow" ? RAINBOW : ["var(--accent)", "#8f5cf0", "#ec48bd"];
  const ringPath = look.shape === "squircle" || look.shape === "square" ? RING_PATHS[look.shape] : d;
  return <>
    {/* A band in the card background keeps the ring legible over banners, nameplates and images. */}
    {look.tone === "full" && <svg xmlns="http://www.w3.org/2000/svg" className="sx-ring sx-ring-back" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={ringPath} vectorEffect="non-scaling-stroke" /></svg>}
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {gradient && <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1">{stops.map((color, index) => <stop key={index} offset={`${(index / (stops.length - 1)) * 100}%`} style={{ stopColor: color }} />)}</linearGradient></defs>}
      {look.ring === "pulse" && <path className="sx-ripple" d={ringPath} vectorEffect="non-scaling-stroke" />}
      <path className={look.ring === "pulse" ? "sx-core" : undefined} d={ringPath} vectorEffect="non-scaling-stroke" pathLength={look.ring === "dashed" ? 84 : undefined} style={gradient ? { stroke: `url(#${id})` } : undefined} />
      {look.ring === "double" && <path className="sx-cut" d={ringPath} vectorEffect="non-scaling-stroke" />}
    </svg>
  </>;
}

const SHORT_STATUS: Record<CardData["status"], string> = { online: "Online", idle: "Idle", dnd: "DND", offline: "Offline" };
export const STATUS_LABELS: Record<CardData["status"], string> = { online: "Online", idle: "Idle", dnd: "Do not disturb", offline: "Offline" };

/**
 * The presence indicator inside the avatar wrapper. `dot` keeps the theme's `.status-dot` styling;
 * `pill` is a labelled chip on the avatar's lower edge; `text` and `ring` render nothing here
 * (place `<StatusText>` in the theme's copy; the ring comes from `<AvatarRing>`).
 */
export function StatusIndicator({ data, look }: { data: CardData; look: AvatarLook }) {
  if (look.status === "dot") return <span className={`status-dot ${data.status}`} title={data.status} aria-label={data.status} />;
  if (look.status === "pill") return <span className={`sx-status-pill sx-is-${data.status}`} title={STATUS_LABELS[data.status]}>{SHORT_STATUS[data.status]}</span>;
  if (look.status === "ring") return <span className="sx-sr" aria-label={STATUS_LABELS[data.status]} />;
  return null;
}

/** Coloured status label for `status_style=text`; renders nothing for every other value. */
export function StatusText({ data, options, separator = false }: { data: CardData; options: CardOptions; separator?: boolean }) {
  if (options.hide_status || options.status_style !== "text") return null;
  return <>{separator && <span className="sx-sep" aria-hidden="true"> · </span>}<span className={`sx-status-text sx-is-${data.status}`}>{STATUS_LABELS[data.status]}</span></>;
}

/** Classes for the avatar wrapper: `sx-shape-<shape>` (shape CSS targets its `.avatar` child). */
export const avatarShapeClass = (look: AvatarLook) => `sx-shape-${look.shape}${look.decorated ? " sx-decorated" : ""}`;
