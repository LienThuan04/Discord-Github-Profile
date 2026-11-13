import type { StyleOptions } from "@/lib/style-options";
import { FONT_STACKS } from "./fonts";

/**
 * CSS for the style axes. Only the rules for the active values are emitted, so a default card pays
 * a few hundred bytes. Every selector is scoped under `.sx-root` (the theme root) and every class or
 * keyframe uses the `sx-` prefix, so styles never collide with theme CSS or Studio.
 *
 * Motion: every `animation` lives inside `@media (prefers-reduced-motion: no-preference)` and is
 * omitted entirely when `animated=false`. Static frames are designed to look finished on their own.
 */
const R = ".sx-root";
export const STATUS_COLORS = { online: "#23a55a", idle: "#f0b232", dnd: "#f23f43", offline: "#80848e" } as const;
const STATUS_TEXT_LIGHT = { online: "#1a7f45", idle: "#a8740f", dnd: "#d22d33", offline: "#62666f" } as const;
const statusRules = (selector: (status: string) => string, property: string, palette: Record<string, string>) =>
  Object.entries(palette).map(([status, color]) => `${selector(status)}{${property}:${color}}`).join("");

const HEXAGON = "50% 0,93.3% 25%,93.3% 75%,50% 100%,6.7% 75%,6.7% 25%";
const OCTAGON = "29.3% 0,70.7% 0,100% 29.3%,100% 70.7%,70.7% 100%,29.3% 100%,0 70.7%,0 29.3%";
const SHAPE_CSS: Record<StyleOptions["avatar_shape"], string> = {
  circle: "",
  squircle: `${R} .sx-shape-squircle .avatar{border-radius:30%!important}${R} .sx-shape-squircle.sx-decorated .avatar{transform:scale(.88)}`,
  square: `${R} .sx-shape-square .avatar{border-radius:14%!important}${R} .sx-shape-square.sx-decorated .avatar{border-radius:22%!important;transform:scale(.82)}`,
  hexagon: `${R} .sx-shape-hexagon .avatar{border-radius:0!important;border:0!important;clip-path:polygon(${HEXAGON})}`,
  octagon: `${R} .sx-shape-octagon .avatar{border-radius:0!important;border:0!important;clip-path:polygon(${OCTAGON})}${R} .sx-shape-octagon.sx-decorated .avatar{transform:scale(.92)}`,
};

const RING_BASE = `${R} .sx-ring{position:absolute;z-index:-1;--sx-ro:calc(var(--sx-ring-gap,3px) + var(--sx-ring-w,3px) / 2);left:calc(-1 * var(--sx-ro));top:calc(-1 * var(--sx-ro));width:calc(100% + 2 * var(--sx-ro));height:calc(100% + 2 * var(--sx-ro));overflow:visible;pointer-events:none;display:block}`
  + `${R} .sx-ring path{fill:none;stroke:var(--accent);stroke-width:var(--sx-ring-w,3px);stroke-linejoin:round;stroke-linecap:round}`
  + statusRules((s) => `${R} .sx-ring.sx-is-${s} path`, "stroke", STATUS_COLORS)
  + `${R} .sx-ring.sx-ring-back path{stroke:var(--bg);stroke-width:calc(var(--sx-ring-w,3px) + 2 * var(--sx-ring-gap,3px))}`
  + `${R} .sx-ring-presence{--sx-ring-gap:1.5px}${R} .sx-ring-presence path{stroke-width:calc(var(--sx-ring-w,3px) * 1.35)}${R} .sx-ring-soft{opacity:.6}${R} .sx-ring-soft path{stroke-width:calc(var(--sx-ring-w,3px) * .7)}`;
const RING_CSS: Record<StyleOptions["ring"], string> = {
  status: "", none: "", accent: "", gradient: "",
  rainbow: "",
  glow: `${R} .sx-ring-glow{filter:drop-shadow(0 0 3px var(--accent)) drop-shadow(0 0 8px color-mix(in srgb,var(--accent) 70%,transparent))}${R} .sx-ring-glow path{stroke:color-mix(in srgb,var(--accent) 65%,#fff)}`,
  pulse: `${R} .sx-ring-pulse .sx-ripple{opacity:.45;stroke-width:calc(var(--sx-ring-w,3px) * .6)}`,
  dashed: `${R} .sx-ring-dashed path{stroke-dasharray:5 3.4;stroke-linecap:round}`,
  double: `${R} .sx-ring-double{--sx-ring-w:5px}${R} .sx-ring-double .sx-cut{stroke:var(--bg);stroke-width:1.6px}`,
};
const RING_MOTION: Partial<Record<StyleOptions["ring"], string>> = {
  rainbow: `${R} .sx-ring-rainbow{animation:sx-hue 6s linear infinite}`,
  pulse: `${R} .sx-ring-pulse .sx-ripple{transform-box:fill-box;transform-origin:center;animation:sx-ripple 2.4s ease-out infinite}${R} .sx-ring-pulse .sx-core{animation:sx-breathe 2.4s ease-in-out infinite}`,
  dashed: `${R} .sx-ring-dashed path{animation:sx-march 9s linear infinite}`,
  glow: `${R} .sx-ring-glow{animation:sx-breathe 3.2s ease-in-out infinite}`,
};

const STATUS_CSS: Record<StyleOptions["status_style"], string> = {
  dot: "",
  pill: `${R} .sx-status-pill{position:absolute;z-index:3;left:50%;bottom:-7px;transform:translateX(-50%);display:flex;align-items:center;height:17px;padding:0 6px;border:2px solid var(--bg);border-radius:10px;color:#0b0d24;font:800 8px/13px "Segoe UI",Arial,sans-serif;letter-spacing:.6px;text-transform:uppercase;white-space:nowrap}`
    + statusRules((s) => `${R} .sx-status-pill.sx-is-${s}`, "background", STATUS_COLORS),
  text: `${R} .sx-status-text{display:inline-block;flex:none;font-weight:800;white-space:nowrap}`
    + statusRules((s) => `${R} .sx-status-text.sx-is-${s}`, "color", { ...STATUS_COLORS, online: "#3ccf78", offline: "#a3a7b3" })
    + statusRules((s) => `${R}.sx-light .sx-status-text.sx-is-${s}`, "color", STATUS_TEXT_LIGHT),
  ring: "",
};

const PATTERN_BASE = `${R} .sx-pattern{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden;border-radius:inherit;--sx-p:color-mix(in srgb,var(--accent) 38%,transparent);--sx-p2:color-mix(in srgb,#ec48bd 30%,transparent)}${R}.sx-light .sx-pattern{--sx-p:color-mix(in srgb,var(--accent) 30%,transparent);--sx-p2:color-mix(in srgb,#ec48bd 24%,transparent)}${R} .sx-pattern svg{position:absolute;inset:0;width:100%;height:100%;display:block}`;
// Soft discs with a crisp rim, kept to the edges so text stays clear: [x%, y%, radius px].
const BUBBLES = ([[90, 14, 34], [70, 38, 11], [97, 55, 21], [7, 90, 27], [25, 74, 9], [60, 93, 16], [83, 80, 7], [42, 20, 6]] as const)
  .map(([x, y, r]) => `radial-gradient(circle at ${x}% ${y}%,var(--sx-b) 0 ${r - 1.5}px,var(--sx-p) ${r - 1}px ${r}px,transparent ${r + 0.6}px)`).join(",");
const PATTERN_CSS: Record<StyleOptions["pattern"], string> = {
  none: "",
  dots: `${R} .sx-pattern-dots{background-image:radial-gradient(circle,var(--sx-p) 1.2px,transparent 1.7px);background-size:14px 14px;background-position:7px 7px}`,
  grid: `${R} .sx-pattern-grid{background-image:linear-gradient(var(--sx-p) 1px,transparent 1px),linear-gradient(90deg,var(--sx-p) 1px,transparent 1px);background-size:22px 22px;background-position:-1px -1px;opacity:.65;mask-image:radial-gradient(ellipse at 70% 0%,#000 20%,transparent 85%)}`,
  diagonal: `${R} .sx-pattern-diagonal{background-image:repeating-linear-gradient(135deg,var(--sx-p) 0 1.2px,transparent 1.2px 10px);opacity:.8}`,
  waves: `${R} .sx-pattern-waves path{fill:none;stroke:var(--sx-p);stroke-width:1.3}`,
  stars: `${R} .sx-pattern-stars .sx-s1{fill:color-mix(in srgb,var(--accent) 45%,#fff);opacity:.55}${R} .sx-pattern-stars .sx-s2{fill:color-mix(in srgb,var(--accent) 55%,#fff);opacity:.9}${R} .sx-pattern-stars .sx-s3{fill:#ec48bd;opacity:.7}${R}.sx-light .sx-pattern-stars .sx-s1{fill:var(--accent);opacity:.35}${R}.sx-light .sx-pattern-stars .sx-s2{fill:var(--accent);opacity:.7}${R}.sx-light .sx-pattern-stars .sx-s3{opacity:.5}`,
  circuit: `${R} .sx-pattern-circuit path{fill:none;stroke:var(--sx-p);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}${R} .sx-pattern-circuit circle{fill:var(--bg);stroke:var(--sx-p);stroke-width:1.2}`,
  confetti: `${R} .sx-pattern-confetti{opacity:.7}${R} .sx-pattern-confetti .c1{fill:var(--accent)}${R} .sx-pattern-confetti .c2{fill:#ec48bd}${R} .sx-pattern-confetti .c3{fill:#35ed7e}${R} .sx-pattern-confetti .c4{fill:#00b0f4}${R}.sx-light .sx-pattern-confetti{opacity:.55}`,
  bubbles: `${R} .sx-pattern-bubbles{--sx-b:color-mix(in srgb,var(--accent) 9%,transparent);background-image:${BUBBLES}}`,
  aurora: `${R} .sx-pattern-aurora i{position:absolute;inset:-30%;background:radial-gradient(ellipse 45% 35% at 25% 20%,color-mix(in srgb,var(--accent) 55%,transparent),transparent),radial-gradient(ellipse 40% 30% at 78% 30%,color-mix(in srgb,#ec48bd 42%,transparent),transparent),radial-gradient(ellipse 50% 30% at 55% 85%,color-mix(in srgb,#35ed7e 26%,transparent),transparent);filter:blur(6px)}${R}.sx-light .sx-pattern-aurora i{opacity:.6}`,
  noise: `${R} .sx-pattern-noise{opacity:.17}${R}.sx-light .sx-pattern-noise{opacity:.24;mix-blend-mode:multiply}`,
  hex: `${R} .sx-pattern-hex path{fill:none;stroke:var(--sx-p);stroke-width:1.1}${R} .sx-pattern-hex{mask-image:linear-gradient(160deg,#000 10%,transparent 90%)}`,
};
const PATTERN_MOTION: Partial<Record<StyleOptions["pattern"], string>> = {
  stars: `${R} .sx-pattern-stars .sx-s2{animation:sx-blink 3.6s ease-in-out infinite}${R} .sx-pattern-stars .sx-s3{animation:sx-blink 5s ease-in-out -2s infinite}`,
  aurora: `${R} .sx-pattern-aurora i{animation:sx-drift 18s ease-in-out infinite alternate}`,
  bubbles: `${R} .sx-pattern-bubbles{animation:sx-rise 14s ease-in-out infinite alternate}`,
};

const EFFECT_BASE = `${R} .sx-fx{position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden;border-radius:inherit}`;
const EFFECT_CSS: Record<StyleOptions["effect"], string> = {
  none: "", float: "",
  shimmer: `${R} .sx-fx-shimmer{--sx-sheen:rgba(255,255,255,.16);background:linear-gradient(112deg,transparent 30%,var(--sx-sheen) 44%,rgba(255,255,255,.04) 50%,var(--sx-sheen) 56%,transparent 70%) no-repeat;background-size:260% 100%;background-position:70% 0}${R}.sx-light .sx-fx-shimmer{--sx-sheen:rgba(255,255,255,.7)}`,
  glow: `${R} .sx-fx-glow{background:radial-gradient(ellipse 70% 55% at 0% 0%,color-mix(in srgb,var(--accent) 26%,transparent),transparent),radial-gradient(ellipse 60% 45% at 100% 100%,color-mix(in srgb,#ec48bd 18%,transparent),transparent);box-shadow:inset 0 0 26px color-mix(in srgb,var(--accent) 34%,transparent)}${R}.sx-light .sx-fx-glow{opacity:.75}`,
  scanline: `${R} .sx-fx-scanline{background:repeating-linear-gradient(to bottom,rgba(0,0,0,.2) 0 1px,transparent 1px 3px)}${R}.sx-light .sx-fx-scanline{background:repeating-linear-gradient(to bottom,rgba(24,26,80,.07) 0 1px,transparent 1px 3px)}${R} .sx-fx-scanline i{position:absolute;left:0;right:0;top:18%;height:56px;background:linear-gradient(transparent,color-mix(in srgb,var(--accent) 14%,transparent),transparent)}`,
  sparkle: `${R} .sx-fx-sparkle i{position:absolute;font-style:normal;line-height:1;transform:translate(-50%,-50%);color:color-mix(in srgb,var(--accent) 40%,#fff);opacity:.95;text-shadow:0 0 8px var(--accent),0 0 2px #fff}${R} .sx-fx-sparkle i:nth-child(3n){color:#ec48bd}${R}.sx-light .sx-fx-sparkle i{color:var(--accent);text-shadow:none}${R}.sx-light .sx-fx-sparkle i:nth-child(3n){color:#c42f97}`,
};
const EFFECT_MOTION: Partial<Record<StyleOptions["effect"], string>> = {
  float: `${R}.sx-fx-float .avatar-wrap,${R}.sx-fx-float .sx-float{animation:sx-float 5.5s ease-in-out infinite}`,
  shimmer: `${R} .sx-fx-shimmer{animation:sx-shimmer 7s ease-in-out infinite}`,
  glow: `${R} .sx-fx-glow{animation:sx-breathe 4.5s ease-in-out infinite}`,
  scanline: `${R} .sx-fx-scanline i{animation:sx-scan 6s linear infinite}`,
  sparkle: `${R} .sx-fx-sparkle i{animation:sx-twinkle 2.8s ease-in-out infinite}${R} .sx-fx-sparkle i:nth-child(2n){animation-duration:3.7s;animation-delay:-1.2s}${R} .sx-fx-sparkle i:nth-child(3n){animation-delay:-2s}`,
};

const BORDER_CSS: Record<StyleOptions["border"], string> = {
  subtle: "",
  none: `${R}.sx-border-none{border-color:transparent!important}`,
  accent: `${R}.sx-border-accent{border-color:var(--accent)!important}${R} .sx-frame-accent{box-shadow:inset 0 0 0 1px var(--accent)}`,
  gradient: `${R}.sx-border-gradient{border-color:transparent!important}${R} .sx-frame-gradient{padding:2px;background:linear-gradient(135deg,var(--accent),#8f5cf0 50%,#ec48bd);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}`,
  glow: `${R}.sx-border-glow{border-color:var(--accent)!important}${R} .sx-frame-glow{box-shadow:inset 0 0 0 1px var(--accent),inset 0 0 14px color-mix(in srgb,var(--accent) 60%,transparent)}`,
};
const FRAME_BASE = `${R} .sx-frame{position:absolute;inset:0;z-index:6;pointer-events:none;border-radius:inherit}`;

function fontCss(font: StyleOptions["font"]): string {
  if (font === "default") return "";
  const stack = FONT_STACKS[font];
  if (font === "display") return `${R}.sx-font-display :is(.display-name,h1,h2,h3,strong){font-family:${stack}!important;font-weight:900!important;letter-spacing:-.02em}${R}.sx-font-display .display-name{text-transform:uppercase}`;
  return `${R}.sx-font-${font},${R}.sx-font-${font} *{font-family:${stack}!important${font === "condensed" ? ";font-stretch:condensed" : ""}}`;
}

const EQ_BASE = `${R} .sx-eq{display:inline-flex;flex:none;vertical-align:middle;position:relative;top:-1px;height:12px;margin-left:6px;color:inherit;overflow:hidden}${R} .sx-eq i{display:block;flex:none;font-style:normal;background:currentColor}${R} .sx-eq svg{display:block;flex:none;overflow:visible}${R} .summary>.sx-eq{margin-left:0}`;
const EQ_CSS: Record<StyleOptions["eq_style"], string> = {
  none: "",
  bars: `${R} .sx-eq-bars{width:15px;gap:1px;align-items:flex-end;justify-content:space-between}${R} .sx-eq-bars i{width:3px;height:100%;border-radius:1px 1px 0 0;transform-origin:50% 100%;transform:scaleY(var(--h))}`,
  mirror: `${R} .sx-eq-mirror{width:22px;align-items:center;justify-content:space-between}${R} .sx-eq-mirror i{width:2px;height:100%;border-radius:2px;transform:scaleY(var(--h))}`,
  spectrum: `${R} .sx-eq-spectrum{width:30px;align-items:flex-end;justify-content:space-between}${R} .sx-eq-spectrum i{width:1.5px;height:100%;border-radius:1px 1px 0 0;transform-origin:50% 100%;transform:scaleY(var(--h));background:linear-gradient(to top,currentColor,var(--accent) 65%,#ec48bd)}`,
  dots: `${R} .sx-eq-dots{width:15px;align-items:flex-end;justify-content:space-between}${R} .sx-eq-dots i{width:3px;height:var(--px);background:repeating-linear-gradient(to top,currentColor 0 2px,transparent 2px 3px)}`,
  blocks: `${R} .sx-eq-blocks{width:16px;gap:2px;align-items:flex-end}${R} .sx-eq-blocks i{width:4px;height:var(--px);background:repeating-linear-gradient(to top,currentColor 0 3px,transparent 3px 4px)}`,
  pulse: `${R} .sx-eq-pulse{width:20px;align-items:center;justify-content:space-between}${R} .sx-eq-pulse i{width:5px;height:5px;border-radius:50%;transform:scale(var(--h));opacity:var(--a)}`,
  wave: `${R} .sx-eq-wave{width:26px}${R} .sx-eq-wave svg{width:52px;height:12px}${R} .sx-eq-wave path{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round}${R} .sx-eq-wave .sx-echo{opacity:.4}`,
  line: `${R} .sx-eq-line{width:26px;mask-image:linear-gradient(90deg,transparent,#000 25%,#000 75%,transparent)}${R} .sx-eq-line svg{width:52px;height:12px}${R} .sx-eq-line path{fill:none;stroke:currentColor;stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round}`,
  circle: `${R} .sx-eq-circle{width:12px}${R} .sx-eq-circle svg{width:12px;height:12px}${R} .sx-eq-circle .sx-track{fill:none;stroke:currentColor;stroke-width:1.4;opacity:.3}${R} .sx-eq-circle .sx-arc{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-dasharray:9 4.2;transform-origin:6px 6px}${R} .sx-eq-circle .sx-core{fill:currentColor;transform-origin:6px 6px}`,
};
const EQ_MOTION: Partial<Record<StyleOptions["eq_style"], string>> = {
  bars: `${R} .sx-eq-bars i{animation:sx-eq var(--t) ease-in-out var(--o) infinite alternate}`,
  mirror: `${R} .sx-eq-mirror i{animation:sx-eq var(--t) ease-in-out var(--o) infinite alternate}`,
  spectrum: `${R} .sx-eq-spectrum i{animation:sx-eq var(--t) ease-in-out var(--o) infinite alternate}`,
  dots: `${R} .sx-eq-dots i{animation:sx-eq-dots var(--t) steps(3,jump-none) var(--o) infinite alternate}`,
  blocks: `${R} .sx-eq-blocks i{animation:sx-eq-blocks var(--t) steps(3,jump-none) var(--o) infinite alternate}`,
  pulse: `${R} .sx-eq-pulse i{animation:sx-dot 1.2s ease-in-out var(--o) infinite}`,
  wave: `${R} .sx-eq-wave svg{animation:sx-scroll 1.6s linear infinite}${R} .sx-eq-wave .sx-echo{animation:sx-breathe 1.6s ease-in-out infinite}`,
  line: `${R} .sx-eq-line svg{animation:sx-scroll 1.8s linear infinite}`,
  circle: `${R} .sx-eq-circle .sx-arc{animation:sx-spin 1.6s linear infinite}${R} .sx-eq-circle .sx-core{animation:sx-dot 1.6s ease-in-out infinite}`,
};

const KEYFRAMES: Record<string, string> = {
  "sx-hue": "@keyframes sx-hue{to{filter:hue-rotate(360deg)}}",
  "sx-ripple": "@keyframes sx-ripple{0%{transform:scale(1);opacity:.55}100%{transform:scale(1.22);opacity:0}}",
  "sx-breathe": "@keyframes sx-breathe{0%,100%{opacity:1}50%{opacity:.55}}",
  "sx-march": "@keyframes sx-march{to{stroke-dashoffset:-84}}",
  "sx-twinkle": "@keyframes sx-twinkle{0%,100%{opacity:.95;transform:translate(-50%,-50%) scale(1)}50%{opacity:.3;transform:translate(-50%,-50%) scale(.6) rotate(45deg)}}",
  "sx-blink": "@keyframes sx-blink{0%,100%{opacity:1}50%{opacity:.25}}",
  "sx-drift": "@keyframes sx-drift{to{transform:translate(8%,6%) rotate(6deg)}}",
  "sx-rise": "@keyframes sx-rise{to{transform:translateY(-10px)}}",
  "sx-float": "@keyframes sx-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}",
  "sx-shimmer": "@keyframes sx-shimmer{0%{background-position:110% 0}60%,100%{background-position:-10% 0}}",
  "sx-scan": "@keyframes sx-scan{from{top:-60px}to{top:100%}}",
  "sx-eq": "@keyframes sx-eq{from{transform:scaleY(.18)}to{transform:scaleY(1)}}",
  "sx-eq-dots": "@keyframes sx-eq-dots{from{height:3px}to{height:12px}}",
  "sx-eq-blocks": "@keyframes sx-eq-blocks{from{height:4px}to{height:12px}}",
  "sx-dot": "@keyframes sx-dot{0%,100%{transform:scale(.55);opacity:.4}50%{transform:scale(1.15);opacity:1}}",
  "sx-scroll": "@keyframes sx-scroll{to{transform:translateX(-50%)}}",
  "sx-spin": "@keyframes sx-spin{to{transform:rotate(1turn)}}",
};

export interface StyleCssInput {
  style: StyleOptions;
  /** False when `animated=false`: no animation rule or keyframe is emitted at all. */
  motion: boolean;
  /** Emit equalizer rules (the card shows Spotify or a "Listening to" activity). */
  equalizer: boolean;
}

/** The minimal stylesheet for the active style values. Empty string parts are skipped. */
export function styleCss({ style, motion, equalizer }: StyleCssInput): string {
  const ringOn = style.ring !== "none" || style.status_style === "ring";
  const eq = equalizer && style.eq_style !== "none";
  const parts = [
    `${R}{isolation:isolate}`,
    SHAPE_CSS[style.avatar_shape],
    ringOn ? RING_BASE + RING_CSS[style.ring] : "",
    STATUS_CSS[style.status_style],
    style.pattern !== "none" ? PATTERN_BASE + PATTERN_CSS[style.pattern] : "",
    style.effect !== "none" && style.effect !== "float" ? EFFECT_BASE + EFFECT_CSS[style.effect] : "",
    style.border !== "subtle" ? (style.border === "none" ? "" : FRAME_BASE) + BORDER_CSS[style.border] : "",
    fontCss(style.font),
    eq ? EQ_BASE + EQ_CSS[style.eq_style] : "",
  ];
  if (motion) {
    const moving = [ringOn ? RING_MOTION[style.ring] : "", PATTERN_MOTION[style.pattern], EFFECT_MOTION[style.effect], eq ? EQ_MOTION[style.eq_style] : ""].filter(Boolean).join("");
    if (moving) {
      const frames = Object.entries(KEYFRAMES).filter(([name]) => moving.includes(`${name} `)).map(([, rule]) => rule).join("");
      parts.push(`@media (prefers-reduced-motion:no-preference){${moving}}${frames}`);
    }
  }
  return parts.filter(Boolean).join("\n");
}
