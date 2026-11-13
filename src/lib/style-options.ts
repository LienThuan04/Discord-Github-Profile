/**
 * Style axes shared by every card theme. Values are pure data so the query parser, the embed builder,
 * Studio and the card renderer agree on one list. The first value of each tuple is the default.
 * Rendering lives in `src/card/styles/`; see docs/THEME-CONTRACT.md ("Style axes").
 */
export const STYLE_VALUES = {
  avatar_shape: ["circle", "squircle", "square", "hexagon", "octagon"],
  ring: ["status", "none", "accent", "gradient", "rainbow", "glow", "pulse", "dashed", "double"],
  pattern: ["none", "dots", "grid", "diagonal", "waves", "stars", "circuit", "confetti", "bubbles", "aurora", "noise", "hex"],
  effect: ["none", "float", "shimmer", "glow", "scanline", "sparkle"],
  status_style: ["dot", "pill", "text", "ring"],
  eq_style: ["bars", "wave", "pulse", "dots", "line", "blocks", "mirror", "circle", "spectrum", "none"],
  font: ["default", "rounded", "mono", "serif", "condensed", "display"],
  border: ["subtle", "none", "accent", "gradient", "glow"],
} as const;

export type StyleParam = keyof typeof STYLE_VALUES;
export type StyleValue<P extends StyleParam> = (typeof STYLE_VALUES)[P][number];
export type AvatarShape = StyleValue<"avatar_shape">;
export type RingStyle = StyleValue<"ring">;
export type PatternStyle = StyleValue<"pattern">;
export type EffectStyle = StyleValue<"effect">;
export type StatusStyle = StyleValue<"status_style">;
export type EqStyle = StyleValue<"eq_style">;
export type FontStyle = StyleValue<"font">;
export type BorderStyle = StyleValue<"border">;
export type StyleOptions = { [P in StyleParam]: StyleValue<P> };

export const STYLE_PARAMS = Object.keys(STYLE_VALUES) as StyleParam[];
export const STYLE_DEFAULTS = Object.fromEntries(STYLE_PARAMS.map((name) => [name, STYLE_VALUES[name][0]])) as StyleOptions;

export const isStyleParam = (name: string): name is StyleParam => Object.hasOwn(STYLE_VALUES, name);

/** Human labels for Studio controls and docs. */
export const STYLE_PARAM_LABELS: Record<StyleParam, string> = {
  avatar_shape: "Avatar shape", ring: "Avatar ring", pattern: "Background pattern", effect: "Effect",
  status_style: "Status indicator", eq_style: "Equalizer", font: "Font", border: "Border",
};

const VALUE_LABELS: Partial<Record<string, string>> = {
  "ring:status": "Status color", "ring:none": "No ring", "ring:double": "Double line",
  "pattern:none": "No pattern", "effect:none": "No effect", "eq_style:none": "Hidden",
  "status_style:dot": "Dot", "status_style:pill": "Pill label", "status_style:text": "Text label", "status_style:ring": "Avatar ring",
  "font:default": "Theme font", "border:subtle": "Subtle", "border:none": "No border",
};

/** Friendly label for one style value, e.g. `styleValueLabel("ring", "none")` → "No ring". */
export function styleValueLabel(param: StyleParam, value: string): string {
  return VALUE_LABELS[`${param}:${value}`] ?? value.charAt(0).toUpperCase() + value.slice(1);
}
