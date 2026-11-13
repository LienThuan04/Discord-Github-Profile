import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { normalize } from "@/lib/lanyard/normalize";
import { parseOptions } from "@/lib/options";
import { themes } from "@/card/theme-registry";
import { renderSvg } from "@/lib/svg/render";
import { PLACEHOLDER } from "@/lib/svg/assets";
import { STATUS_PATHS, StatusGlyph, statusGlyphKind } from "@/card/parts/status-glyph";
import { styleCss } from "@/card/styles/css";
import { demoUserPresence, FIXED_NOW } from "./fixtures";

describe("Discord status glyphs", () => {
  it("draws Discord's shapes: dot, crescent moon, do-not-disturb bar, ring and phone", () => {
    for (const status of ["online", "idle", "dnd", "offline"] as const) {
      const markup = renderToStaticMarkup(<StatusGlyph data={{ status, platforms: ["desktop"] }} />);
      expect(markup).toContain(`sd-${status}`);
      expect(markup).toContain(`d="${STATUS_PATHS[status]}"`);
      expect(markup).toContain('fill-rule="evenodd"');
      expect(markup).not.toMatch(/\bid=/);
    }
    // The idle crescent is not a full circle; dnd and offline cut a hole (second subpath).
    expect(STATUS_PATHS.idle).not.toBe(STATUS_PATHS.online);
    expect(STATUS_PATHS.dnd.match(/M/g)).toHaveLength(2);
    expect(STATUS_PATHS.offline.match(/M/g)).toHaveLength(2);
  });

  it("shows a phone only for users online solely on mobile", () => {
    expect(statusGlyphKind({ status: "online", platforms: ["mobile"] })).toBe("mobile");
    expect(statusGlyphKind({ status: "online", platforms: ["mobile", "desktop"] })).toBe("online");
    expect(statusGlyphKind({ status: "idle", platforms: ["mobile"] })).toBe("idle");
    expect(statusGlyphKind({ status: "online", platforms: [] })).toBe("online");
  });

  it("ships the glyph colours and cut-out background with every card's style sheet", () => {
    const css = styleCss({ style: parseOptions(), motion: true, equalizer: false });
    expect(renderToStaticMarkup(<StatusGlyph data={{ status: "idle", platforms: [] }} />)).toContain('fill="#f0b232"');
    expect(renderToStaticMarkup(<StatusGlyph data={{ status: "online", platforms: ["mobile"] }} />)).toContain('fill="#23a55a"');
    expect(css).toContain(".sx-root .status-dot{background:var(--bg)!important}");
  });

  it.each(Object.keys(themes))("renders an idle crescent instead of a plain dot in the %s theme", (name) => {
    const idle = normalize({ ...demoUserPresence, discord_status: "idle" }, { now: FIXED_NOW });
    const svg = renderSvg(idle, parseOptions({ theme: name }), () => PLACEHOLDER);
    // Themes that show presence through words or icons of their own (retro, neon, voice) have no glyph.
    if (["profile", "nitro", "member", "compact", "badge", "chat", "banner", "terminal", "polaroid", "wave"].includes(name)) expect(svg).toContain('class="status-glyph');
    if (svg.includes('class="status-glyph')) {
      expect(svg).toContain('class="status-glyph sd-idle"');
      expect(svg).not.toMatch(/class="status-glyph sd-(?:online|dnd|offline)/);
    }
  });
});
