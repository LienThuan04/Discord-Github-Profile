/**
 * Theme contract: pure Component(CardProps) + deterministic measure(data, options, error?).
 * Each theme owns scoped CSS and metadata (name, label, supportedParams, usesProfile).
 * All images MUST use props.assets(url, kind?); never fetch or use hooks in components.
 * SVG supplies data URIs; live supplies directAssets and a freshly normalized snapshot.
 * Add themes in src/card/themes/, register here and test both modes and measured bounds.
 * See docs/THEME-CONTRACT.md for exact types and extension steps.
 */
import type { ThemeDefinition } from "./types";
import { createElement } from "react";
import { filterApplications } from "@/lib/lanyard/filter";
import { withProfileFrame } from "./parts/profile-frame";
import { profileTheme } from "./themes/profile";
import { nitroTheme } from "./themes/nitro";
import { memberTheme } from "./themes/member";
import { compactTheme } from "./themes/compact";
import { activityTheme } from "./themes/activity";
import { glassTheme } from "./themes/glass";
import { badgeTheme } from "./themes/badge";
import { chatTheme } from "./themes/chat";
import { bannerTheme } from "./themes/banner";
import { terminalTheme } from "./themes/terminal";
import { neonTheme } from "./themes/neon";
import { retroTheme } from "./themes/retro";
import { polaroidTheme } from "./themes/polaroid";
import { mobileTheme } from "./themes/mobile";
import { voiceTheme } from "./themes/voice";
import { waveTheme } from "./themes/wave";

const bodies = { profile: profileTheme, nitro: nitroTheme, member: memberTheme, compact: compactTheme, activity: activityTheme, glass: glassTheme, badge: badgeTheme, chat: chatTheme, banner: bannerTheme, terminal: terminalTheme, neon: neonTheme, retro: retroTheme, polaroid: polaroidTheme, mobile: mobileTheme, voice: voiceTheme, wave: waveTheme };
/** Keep filtering outside frame measurement too: ignored applications never affect either target's geometry. */
function withActivityFilter(theme: ThemeDefinition): ThemeDefinition {
  return { ...theme, supportedParams: [...new Set([...theme.supportedParams, "ignore_app_id" as const])],
    measure: (data, options, error) => theme.measure(filterApplications(data, options), options, error),
    Component: function FilteredCard(props) { return createElement(theme.Component, { ...props, data: filterApplications(props.data, props.options) }); },
  };
}
export const themes: Readonly<Record<string, ThemeDefinition>> = Object.fromEntries(Object.entries(bodies).map(([name, body]) => [name, withActivityFilter(withProfileFrame(body))]));
export function getTheme(name: string): ThemeDefinition { return themes[Object.hasOwn(themes, name) ? name : "profile"]!; }
