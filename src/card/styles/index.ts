/**
 * Shared style system: eight optional axes any theme can adopt with a few lines.
 *
 * | axis           | renders through                                   |
 * |----------------|---------------------------------------------------|
 * | `avatar_shape` | shared `Avatar` part (or `avatarShapeClass`)      |
 * | `ring`         | `AvatarRing` (inside the shared `Avatar`)         |
 * | `status_style` | `StatusIndicator` (in `Avatar`) + `StatusText`    |
 * | `pattern`      | `PatternLayer` (in `StyleLayers`)                 |
 * | `effect`       | `EffectLayer` (in `StyleLayers`); `float` animates `.avatar-wrap` / `.sx-float` |
 * | `border`       | root class + `BorderFrame` (in `StyleLayers`)     |
 * | `font`         | root class (system font stacks only)              |
 * | `eq_style`     | `Equalizer` next to Spotify / "Listening to" titles |
 *
 * Adopting it in a theme:
 *
 * ```tsx
 * import { cardStyle, StyleLayers, StatusText, Equalizer, allStyleParams } from "../styles";
 *
 * export const myTheme: ThemeDefinition = {
 *   name: "my", label: "My", usesProfile: false, supportedParams: [...identityParams, ...allStyleParams], measure, Component: My,
 * };
 * function My(raw: CardProps) {
 *   const { props, className, css } = cardStyle(raw, myTheme.supportedParams); // unsupported axes → defaults
 *   const { data, options } = props;
 *   return <div className={`dgp-my ${options.mode} ${className}`} style={...}>
 *     <style>{myCss + css}</style>
 *     <StyleLayers {...props} />                      // pattern (behind), effect + border frame (above)
 *     <Avatar {...props} />                           // shape, ring and status indicator are built in
 *     <span>@{data.user.username}<StatusText {...props} separator /></span>
 *     {data.spotify && <h2>Listening to Spotify<Equalizer options={options} /></h2>}
 *   </div>;
 * }
 * ```
 *
 * Contract (see docs/THEME-CONTRACT.md, "Style axes"):
 * - Style axes never change `measure()`. Everything is absolutely positioned, inline at a fixed size or a paint.
 * - The root needs `position:relative` and `overflow:hidden`; `cardStyle` adds `isolation:isolate` via `.sx-root`.
 * - No external requests: CSS gradients, inline SVG and system fonts only. Animations sit inside
 *   `@media (prefers-reduced-motion: no-preference)` and are not emitted at all when `animated=false`.
 * - Decoration-aware ring rule: see `resolveAvatarLook()`.
 * - Avatar size hooks: `--sx-ring-w` (stroke, 3px) and `--sx-ring-gap` (3px) may be set by the theme.
 */
import type { OptionName } from "@/lib/options";
import { STYLE_DEFAULTS, STYLE_PARAMS, type StyleOptions } from "@/lib/style-options";
import type { CardProps } from "../types";
import { styleCss } from "./css";
import { hasListening } from "./equalizer";

export { STYLE_DEFAULTS, STYLE_PARAMS, STYLE_PARAM_LABELS, STYLE_VALUES, isStyleParam, styleValueLabel } from "@/lib/style-options";
export type { AvatarShape, BorderStyle, EffectStyle, EqStyle, FontStyle, PatternStyle, RingStyle, StatusStyle, StyleOptions, StyleParam } from "@/lib/style-options";
export { AvatarRing, StatusIndicator, StatusText, SHAPE_PATHS, STATUS_LABELS, avatarShapeClass, resolveAvatarLook, type AvatarLook, type StatusPlacement } from "./avatar";
export { Equalizer, hasListening, isListeningActivity } from "./equalizer";
export { BorderFrame, EffectLayer, PatternLayer, StyleLayers } from "./layers";
export { FONT_STACKS } from "./fonts";
export { STATUS_COLORS, styleCss, type StyleCssInput } from "./css";

/** Every style axis. */
export const allStyleParams = [...STYLE_PARAMS] as const satisfies readonly OptionName[];
/** Axes for cards without an avatar or music title (pills, banners without identity art). */
export const surfaceStyleParams = ["pattern", "effect", "border"] as const satisfies readonly OptionName[];

export interface CardStyle {
  /** Props whose unsupported style axes are reset to defaults. Pass these to every part. */
  props: CardProps;
  /** Root classes: `sx-root`, `sx-light` and one class per non-default font/border/effect. */
  className: string;
  /** The minimal stylesheet for the active values. Append it to the theme CSS in one `<style>`. */
  css: string;
}

/**
 * One call per theme render. Resets axes the theme does not declare in `supportedParams` (hand-written
 * URLs cannot switch on an axis the theme did not opt into) and returns the root classes and CSS.
 */
export function cardStyle(raw: CardProps, supported: readonly OptionName[]): CardStyle {
  const allowed = new Set<string>(supported);
  const reset: Partial<StyleOptions> = {};
  for (const name of STYLE_PARAMS) if (!allowed.has(name) && raw.options[name] !== STYLE_DEFAULTS[name]) Object.assign(reset, { [name]: STYLE_DEFAULTS[name] });
  const props: CardProps = Object.keys(reset).length ? { ...raw, options: { ...raw.options, ...reset } } : raw;
  const { options, data } = props;
  const classes = ["sx-root", options.mode === "light" ? "sx-light" : "", options.font !== "default" ? `sx-font sx-font-${options.font}` : "", options.border !== "subtle" ? `sx-border-${options.border}` : "", options.effect !== "none" ? `sx-fx-${options.effect}` : ""];
  return {
    props,
    className: classes.filter(Boolean).join(" "),
    css: styleCss({ style: options, motion: options.animated, equalizer: hasListening(data, options) }),
  };
}
