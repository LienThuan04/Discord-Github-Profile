import { expect, it } from "vitest";
import { displaySwitches, switchChecked, switchDisabled, switchValue, effectReplayKey } from "@/lib/studio-controls";
import { parseOptions } from "@/lib/options";
import { serializeOptions, withOption } from "@/lib/embed";
import { themes } from "@/card/theme-registry";
import { profileLookCss } from "@/card/parts/profile-look";

/** Switches that are off on a default card; every other switch starts on. */
const OFF_BY_DEFAULT = (theme: string) => new Set([theme === "wave" || theme === "member" ? "profile_banner" : "nameplate_background", ...(theme === "wave" ? ["hide_platforms"] : [])]);

it("round trips each supported display switch through URLs", () => {
  for (const theme of Object.values(themes)) for (const control of displaySwitches(theme.supportedParams)) {
    const options = parseOptions({ theme: theme.name });
    const defaultOn = !OFF_BY_DEFAULT(theme.name).has(control.id);
    expect(switchChecked(control.id, options)).toBe(defaultOn);
    const changed = withOption(options, control.name, switchValue(control.id, !defaultOn, options));
    expect(switchChecked(control.id, changed)).toBe(!defaultOn);
    expect(serializeOptions(changed).has(control.name)).toBe(true);
    const restored = withOption(changed, control.name, switchValue(control.id, defaultOn, options));
    expect(switchChecked(control.id, restored)).toBe(defaultOn);
    expect(serializeOptions(restored).has(control.name)).toBe(false);
  }
});
it("offers an opt-in nameplate background that replaces the profile banner", () => {
  const ids = (name: keyof typeof themes) => displaySwitches(themes[name]!.supportedParams).map((control) => control.id);
  expect(ids("profile")).toContain("nameplate_background");
  expect(ids("nitro")).toContain("nameplate_background");
  for (const theme of Object.values(themes)) {
    const supported = theme.supportedParams;
    expect(displaySwitches(supported).some((control) => control.id === "nameplate_background")).toBe(supported.includes("banner_source") && supported.includes("hide_nameplate"));
  }
  const options = parseOptions({ theme: "profile" });
  expect(switchChecked("nameplate_background", options)).toBe(false);
  const nameplate = withOption(options, "banner_source", switchValue("nameplate_background", true));
  expect(nameplate.banner_source).toBe("nameplate");
  expect(serializeOptions(nameplate).get("banner_source")).toBe("nameplate");
  expect(switchChecked("profile_banner", nameplate)).toBe(false);
  expect(switchChecked("profile_banner", withOption(nameplate, "banner_source", switchValue("profile_banner", true)))).toBe(true);
  expect(switchDisabled("nameplate_background", options)).toBe(false);
  expect(switchDisabled("nameplate_background", withOption(options, "hide_nameplate", "true"))).toBe(true);
  expect(switchDisabled("hide_effect", options)).toBe(false);
});
it("restarts on theme, ID, effect re-enabling and manual replay", () => {
  expect(withOption(parseOptions(), "theme", "nitro").theme).toBe("nitro");
  const key = effectReplayKey("1", "profile", false, 0);
  expect(effectReplayKey("1", "nitro", false, 0)).not.toBe(key);
  expect(effectReplayKey("2", "profile", false, 0)).not.toBe(key);
  expect(effectReplayKey("1", "profile", true, 0)).not.toBe(key);
  expect(effectReplayKey("1", "profile", false, 1)).not.toBe(key);
});
it("fetches profile data for all themes and paints effects without opacity or masks", () => {
  expect(Object.values(themes).every((theme) => theme.usesProfile)).toBe(true);
  const effect = /\.pf-effect\{([^}]+)\}/.exec(profileLookCss)![1];
  expect(effect).not.toMatch(/opacity|mask/);
});
