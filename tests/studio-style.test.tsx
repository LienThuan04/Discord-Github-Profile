import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { CardStudio } from "@/components/studio/CardStudio";
import { DEMO_ID, parseCardOptions } from "@/lib/embed";
import { STYLE_PARAM_LABELS, STYLE_PARAMS, STYLE_VALUES } from "@/lib/style-options";
import { demoUserPresence, FIXED_NOW } from "./fixtures";

const render = (query: Record<string, string>) => renderToStaticMarkup(<CardStudio initialId={DEMO_ID} initialOptions={parseCardOptions(query)} initial={demoUserPresence} initialError={null} initialNow={FIXED_NOW} configuredSiteUrl="https://cards.example" />);
const selected = (markup: string, id: string) => new RegExp(`<select id="${id}"[^>]*>(?:(?!</select>).)*<option value="([a-z]+)" selected=""`).exec(markup)?.[1];

describe("Studio style group", () => {
  it("offers app-aware wave color, custom picker/hex and ignored application IDs", () => {
    const automatic = render({ theme: "wave" });
    expect(automatic).toContain("Auto: match the running app");
    expect(automatic).toContain('id="option-ignore_app_id"');
    expect(automatic).not.toContain('id="option-wave-color-picker"');
    const custom = render({ theme: "wave", wave_color: "f5e663" });
    expect(custom).toContain('id="option-wave-color-picker" type="color" value="#f5e663"');
    expect(custom).toContain('for="option-wave_color"');
    expect(custom).toContain('id="option-wave_color"');
    expect(render({ theme: "profile" })).not.toContain('id="option-wave-color-mode"');
  });
  it("shows every supported axis as a labelled control with a hint where useful", () => {
    const markup = render({});
    expect(markup).toContain('aria-labelledby="style-title"');
    expect(markup).toContain("Style it your way");
    expect(markup).toContain(`<legend>${STYLE_PARAM_LABELS.avatar_shape}</legend>`);
    for (const shape of STYLE_VALUES.avatar_shape) expect(markup).toMatch(new RegExp(`type="radio" name="option-avatar_shape" (?:checked="" )?value="${shape}"`));
    for (const param of STYLE_PARAMS.filter((name) => name !== "avatar_shape")) {
      expect(markup).toContain(`<label class="`);
      expect(markup).toMatch(new RegExp(`for="option-${param}"><span>${STYLE_PARAM_LABELS[param]}</span><select id="option-${param}"`));
      for (const value of STYLE_VALUES[param]) expect(markup).toContain(`<option value="${value}"`);
    }
    expect(markup).toContain('aria-describedby="hint-ring"');
    expect(markup).toContain('id="hint-ring"');
    expect(markup).toContain("04</span> Take it with you");
  });
  it("reflects the URL state in the controls", () => {
    const markup = render({ ring: "rainbow", pattern: "hex", effect: "sparkle", status_style: "pill", eq_style: "wave", font: "mono", border: "glow", avatar_shape: "octagon" });
    expect(selected(markup, "option-ring")).toBe("rainbow");
    expect(selected(markup, "option-pattern")).toBe("hex");
    expect(selected(markup, "option-font")).toBe("mono");
    expect(selected(markup, "option-border")).toBe("glow");
    expect(markup).toContain('checked="" value="octagon"');
    expect(markup).not.toContain('checked="" value="circle"');
    expect(markup).toContain("ring=rainbow&amp;pattern=hex&amp;effect=sparkle&amp;status_style=pill&amp;eq_style=wave&amp;font=mono&amp;border=glow");
  });
  it("shows only the axes the selected theme supports", () => {
    const markup = render({ theme: "badge", ring: "rainbow", pattern: "dots" });
    for (const param of ["pattern", "effect", "border"]) expect(markup).toContain(`id="option-${param}"`);
    for (const param of ["ring", "font", "eq_style", "status_style"]) expect(markup).not.toContain(`id="option-${param}"`);
    expect(markup).not.toContain("option-avatar_shape");
    expect(markup).toContain("3 controls");
    expect(markup).not.toContain("ring=rainbow");
  });
});
