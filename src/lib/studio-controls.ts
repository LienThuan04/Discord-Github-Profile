import { THEME_DEFAULTS, type CardOptions, type OptionName } from "./options";

/**
 * One "Show on card" switch. `id` identifies the switch; `name` is the query parameter it writes. Several
 * switches may share a parameter: "Profile banner" and "Nameplate background" both drive `banner_source`.
 */
interface Control {
  id: string;
  name: OptionName;
  label: string;
  /** Extra parameters the theme must support for the switch to apply. */
  requires?: readonly OptionName[];
  checked: (options: CardOptions) => boolean;
  value: (checked: boolean, options?: CardOptions) => string;
  disabled?: (options: CardOptions) => boolean;
}

const hide = (name: OptionName & `hide_${string}`, label: string): Control => ({
  id: name, name, label,
  checked: (options) => !options[name],
  value: (checked) => String(!checked),
});

const controls: readonly Control[] = [
  hide("hide_effect", "Profile effect"), hide("hide_frame", "Profile frame"),
  {
    id: "profile_banner", name: "banner_source", label: "Profile banner",
    checked: (options) => options.banner_source === "auto" || options.banner_source === "profile",
    value: (checked, options) => checked ? "auto" : options && THEME_DEFAULTS[options.theme]?.banner_source === "nameplate" ? "nameplate" : "none",
  },
  {
    // Nameplate-first themes enable this through THEME_DEFAULTS; other themes opt in.
    id: "nameplate_background", name: "banner_source", label: "Nameplate background", requires: ["hide_nameplate"],
    checked: (options) => options.banner_source === "nameplate",
    value: (checked) => checked ? "nameplate" : "auto",
    disabled: (options) => options.hide_nameplate,
  },
  hide("hide_decoration", "Avatar decoration"), hide("hide_nameplate", "Nameplate"), hide("hide_tag", "Guild tag"),
  hide("hide_badges", "Badges"), hide("hide_status", "Status"), hide("hide_platforms", "Platforms"),
  hide("hide_custom_status", "Custom status"), hide("hide_activity", "Activity"), hide("hide_spotify", "Spotify"),
  hide("hide_timestamps", "Timestamps"), hide("hide_kv", "About / KV"),
];

const byId = new Map(controls.map((control) => [control.id, control]));
const control = (id: string) => {
  const found = byId.get(id);
  if (!found) throw new Error(`Unknown display switch: ${id}`);
  return found;
};

/** The switches the theme supports, in display order. */
export function displaySwitches(supported: readonly OptionName[]) {
  return controls
    .filter(({ name, requires = [] }) => supported.includes(name) && requires.every((param) => supported.includes(param)))
    .map(({ id, name, label }) => ({ id, name, label }));
}
export function switchChecked(id: string, options: CardOptions): boolean {
  return control(id).checked(options);
}
/** The query value that puts the switch in the `checked` state. */
export function switchValue(id: string, checked: boolean, options?: CardOptions): string {
  return control(id).value(checked, options);
}
export function switchDisabled(id: string, options: CardOptions): boolean {
  return control(id).disabled?.(options) ?? false;
}
export function effectReplayKey(id: string, theme: string, hidden: boolean, replay: number): string {
  return `${id}:${theme}:${hidden}:${replay}`;
}
