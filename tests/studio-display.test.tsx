import { expect, it } from "vitest";
import { displaySwitches, switchChecked, switchValue, effectReplayKey } from "@/lib/studio-controls";
import { parseOptions } from "@/lib/options";
import { serializeOptions, withOption } from "@/lib/embed";
import { themes } from "@/card/theme-registry";
import { profileLookCss } from "@/card/parts/profile-look";

it("round trips each supported display switch through URLs", () => {
  for (const theme of Object.values(themes)) for (const control of displaySwitches(theme.supportedParams)) {
    const options = parseOptions({ theme: theme.name });
    const next = withOption(options, control.name, switchValue(control.name, false));
    expect(switchChecked(control.name, next)).toBe(false);
    expect(serializeOptions(next).has(control.name)).toBe(true);
    expect(switchChecked(control.name, withOption(next, control.name, switchValue(control.name, true)))).toBe(true);
  }
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
