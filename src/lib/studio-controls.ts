import type { CardOptions, OptionName } from "./options";
const controls = [
  ["hide_effect", "Profile effect"], ["hide_frame", "Profile frame"], ["banner_source", "Profile banner"],
  ["hide_decoration", "Avatar decoration"], ["hide_nameplate", "Nameplate"], ["hide_tag", "Guild tag"],
  ["hide_badges", "Badges"], ["hide_status", "Status"], ["hide_platforms", "Platforms"],
  ["hide_custom_status", "Custom status"], ["hide_activity", "Activity"], ["hide_spotify", "Spotify"],
  ["hide_timestamps", "Timestamps"], ["hide_kv", "About / KV"],
] as const satisfies readonly (readonly [OptionName, string])[];
export function displaySwitches(supported: readonly OptionName[]) {
  return controls.filter(([name]) => supported.includes(name)).map(([name, label]) => ({ name, label }));
}
export function switchChecked(name: OptionName, options: CardOptions): boolean {
  return name === "banner_source" ? options.banner_source !== "none" : !options[name];
}
export function switchValue(name: OptionName, checked: boolean): string {
  return name === "banner_source" ? checked ? "auto" : "none" : String(!checked);
}
export function effectReplayKey(id: string, theme: string, hidden: boolean, replay: number): string {
  return `${id}:${theme}:${hidden}:${replay}`;
}
