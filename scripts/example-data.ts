import { parseOptions, type CardOptions, type QueryInput } from "../src/lib/options";
import { demoUserPresence, gamePresence, gradientNamePresence, offlinePresence, plainUserPresence, spotifyPresence, streamingPresence, watchingPresence } from "../tests/fixtures";
import { FIXED_NOW } from "../tests/fixtures";
import { frameCardData, profileCardData } from "../tests/fixtures/profile-extras";
import { normalize } from "../src/lib/lanyard/normalize";
import { STYLE_VALUES } from "../src/lib/style-options";
import { themes } from "../src/card/theme-registry";
import type { CardData } from "../src/lib/lanyard/card-data";

export const exampleFixtures = { demo: demoUserPresence, game: { ...gamePresence, kv: { ...gamePresence.kv, bio: "Placeholder bio for a synthetic Discord profile. Building things together." } }, spotify: spotifyPresence, streaming: streamingPresence, watching: watchingPresence, plain: plainUserPresence, gradient: gradientNamePresence, offline: offlinePresence };
export const exampleModes = ["dark", "light"] as const;
export const showcases = [
  ["nitro", "game"], ["activity", "spotify"], ["activity", "streaming"], ["glass", "spotify"], ["profile", "streaming"],
] as const;

/** Parse with the selected theme so width defaults and clamps match production. */
export function exampleOptions(theme: string, mode: "dark" | "light", extra: QueryInput = {}): CardOptions {
  return parseOptions({ ...extra, theme, mode });
}

/** Frozen view models shared by the gallery, fixture matrix and artifact validation. */
export function exampleCardFixtures(): Record<string, CardData> {
  const profile = profileCardData();
  const frame = frameCardData();
  const extras = { ...profile, profile: { ...profile.profile!, bannerUrl: null, themeColors: null, frame: frame.profile!.frame } };
  return {
    ...Object.fromEntries(Object.entries(exampleFixtures).map(([name, presence]) => [name, normalize(presence, { now: FIXED_NOW })])),
    profile, frame, extras,
    gallery: { ...normalize(spotifyPresence, { now: FIXED_NOW }), kv: profile.kv, profile: extras.profile },
  };
}

export interface ExampleDefinition {
  file: string;
  theme: string;
  mode: "dark" | "light";
  fixture: string;
  query?: QueryInput;
}

/** Keep established README filenames while publishing every theme/extras/mode combination. */
export function exampleDefinitions(): ExampleDefinition[] {
  const definitions: ExampleDefinition[] = [];
  for (const theme of Object.keys(themes)) for (const mode of exampleModes) {
    definitions.push({ file: `${theme}-${mode}.svg`, theme, mode, fixture: "demo" });
    definitions.push({ file: `${theme}-extras-${mode}.svg`, theme, mode, fixture: "extras" });
  }
  for (const [theme, fixture] of showcases) for (const mode of exampleModes) definitions.push({ file: `${theme}-${fixture}-${mode}.svg`, theme, mode, fixture });
  const controls = { ...STYLE_VALUES, banner_source: ["auto", "profile", "nameplate", "accent", "none"], hide_effect: ["false", "true"], hide_frame: ["false", "true"] };
  for (const [axis, values] of Object.entries(controls)) for (const value of values) {
    definitions.push({
      file: `styles/${axis}-${value}.svg`, theme: "profile", mode: "dark", fixture: "gallery",
      query: { hide_decoration: "true", hide_effect: "true", hide_frame: "true", [axis]: value },
    });
  }
  return definitions;
}

export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
