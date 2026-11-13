import type { CSSProperties, ReactNode } from "react";
import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import type { PatternStyle } from "@/lib/style-options";

type LayerProps = { data: CardData; options: CardOptions };
const SVG_NS = "http://www.w3.org/2000/svg";

/** A full-size inline SVG that tiles one `<pattern>`; ids carry the user id to stay unique per document. */
function Tiled({ id, width, height, children }: { id: string; width: number; height: number; children: ReactNode }) {
  return <svg xmlns={SVG_NS} aria-hidden="true"><defs><pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse">{children}</pattern></defs><rect width="100%" height="100%" fill={`url(#${id})`} /></svg>;
}

const STARS: [number, number, number, 1 | 2 | 3][] = [
  [6, 14, 1.3, 1], [18, 62, 1.1, 1], [27, 28, 5, 2], [34, 84, 1.4, 3], [44, 10, 1, 1], [52, 48, 1.2, 1], [61, 22, 1.5, 3],
  [66, 74, 4.2, 2], [74, 40, 1.1, 1], [83, 12, 6, 2], [88, 58, 1.4, 1], [94, 88, 1.2, 3], [12, 92, 4, 2], [48, 96, 1.1, 1],
  [97, 30, 1, 1], [38, 54, 0.9, 3], [9, 40, 1, 1], [22, 6, 0.9, 3], [56, 66, 1.2, 1], [79, 92, 1, 1], [71, 4, 1.1, 1],
  [92, 44, 3.4, 2], [3, 76, 1.2, 3], [42, 34, 1, 1], [30, 70, 0.9, 1], [58, 86, 3, 2], [85, 76, 0.9, 1], [16, 22, 0.8, 1],
];
const starPath = (s: number) => `M0 ${-s}Q0 0 ${s} 0Q0 0 0 ${s}Q0 0 ${-s} 0Q0 0 0 ${-s}Z`;

function patternContent(pattern: PatternStyle, id: string): ReactNode {
  switch (pattern) {
    case "waves": return <Tiled id={id} width={48} height={18}><path d="M0 9C8 3 16 3 24 9S40 15 48 9" /></Tiled>;
    case "hex": return <Tiled id={id} width={20.78} height={36}><path d="M10.39 0L20.78 6V18L10.39 24L0 18V6Z M10.39 24V36" /></Tiled>;
    case "circuit": return <Tiled id={id} width={64} height={64}><path d="M0 16H18L26 24V36.8M48 0V10L54 16H64M37 33L48 44V64M10 0V3.8M10 64V56L16 50H18.8" /><circle cx="26" cy="40" r="3.2" /><circle cx="10" cy="7" r="3.2" /><circle cx="22" cy="50" r="3.2" /><circle cx="34.7" cy="30.7" r="3.2" /></Tiled>;
    case "confetti": return <Tiled id={id} width={96} height={80}>
      <rect className="c1" x="8" y="10" width="7" height="2.6" rx="1.2" transform="rotate(28 11 11)" /><circle className="c2" cx="38" cy="18" r="1.8" /><rect className="c3" x="62" y="6" width="6" height="2.4" rx="1.2" transform="rotate(-36 65 7)" />
      <path className="c4" d="M84 26l3.6 1.4-3 2.6z" /><rect className="c2" x="20" y="44" width="7" height="2.6" rx="1.2" transform="rotate(-18 23 45)" /><circle className="c1" cx="54" cy="40" r="1.5" />
      <rect className="c4" x="76" y="56" width="6" height="2.4" rx="1.2" transform="rotate(52 79 57)" /><path className="c3" d="M44 66l3.4 1.6-3.2 2.2z" /><circle className="c3" cx="6" cy="70" r="1.4" /><rect className="c1" x="88" y="72" width="5" height="2.2" rx="1.1" transform="rotate(-60 90 73)" />
    </Tiled>;
    case "stars": return <svg xmlns={SVG_NS} aria-hidden="true">{STARS.map(([x, y, size, tone], index) => tone === 2
      ? <svg key={index} x={`${x}%`} y={`${y}%`} overflow="visible"><path className="sx-s2" d={starPath(size * 1.4)} /></svg>
      : <circle key={index} className={`sx-s${tone}`} cx={`${x}%`} cy={`${y}%`} r={size * 1.3} />)}</svg>;
    case "noise": return <svg xmlns={SVG_NS} aria-hidden="true"><filter id={id} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves={2} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter><rect width="100%" height="100%" filter={`url(#${id})`} /></svg>;
    case "aurora": return <i />;
    default: return null;
  }
}

/** Background pattern behind the content (z-index -1 inside the isolated theme root). */
export function PatternLayer({ data, options }: LayerProps) {
  if (options.pattern === "none") return null;
  return <div className={`sx-pattern sx-pattern-${options.pattern}`} aria-hidden="true">{patternContent(options.pattern, `sx-pt-${options.pattern}-${data.user.id}`)}</div>;
}

const SPARKLES: [number, number, number][] = [[6, 8, 14], [93, 6, 18], [86, 30, 10], [4, 52, 11], [96, 64, 13], [62, 96, 10], [38, 5, 9], [3, 92, 12]];

/** Overlay effects above the content. `float` needs no layer: it animates `.avatar-wrap` / `.sx-float`. */
export function EffectLayer({ options }: LayerProps) {
  switch (options.effect) {
    case "shimmer": case "glow": return <div className={`sx-fx sx-fx-${options.effect}`} aria-hidden="true" />;
    case "scanline": return <div className="sx-fx sx-fx-scanline" aria-hidden="true"><i /></div>;
    case "sparkle": return <div className="sx-fx sx-fx-sparkle" aria-hidden="true">{SPARKLES.map(([left, top, size], index) => <i key={index} style={{ left: `${left}%`, top: `${top}%`, fontSize: size } as CSSProperties}>✦</i>)}</div>;
    default: return null;
  }
}

/** Painted frame for `border=accent|gradient|glow`, drawn above content inside the root's border box. */
export function BorderFrame({ options }: Pick<LayerProps, "options">) {
  return options.border === "accent" || options.border === "gradient" || options.border === "glow" ? <span className={`sx-frame sx-frame-${options.border}`} aria-hidden="true" /> : null;
}

/** Pattern + effect + frame in one element list. Place it as the first child of the theme root. */
export function StyleLayers(props: LayerProps) {
  return <><PatternLayer {...props} /><EffectLayer {...props} /><BorderFrame {...props} /></>;
}
