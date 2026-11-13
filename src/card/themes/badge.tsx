import { cardBadges } from "../parts/profile-look";
import { Badges } from "../parts/identity";
import { ProfileEffect, profileLookCss, bannerTint, bannerScope as accentScope, resolveBanner as accentBanner } from "../parts/profile-look";
import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import type { CardProps, ThemeDefinition } from "../types";
import { currentPresence, smallAsset, statusLabel, themeStyle } from "../parts/theme-kit";
import { cardStyle, StyleLayers, surfaceStyleParams } from "../styles";
import { StatusGlyph } from "../parts/status-glyph";

/** Courier New has a fixed .6em advance; combining marks occupy no extra column. */
export function badgeColumns(text: string): number {
  return Array.from(text.normalize("NFC")).reduce((n, c) => n + (/\p{Mark}|\u200d|\ufe0f/u.test(c) ? 0 : /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7af\uf900-\ufaff\uff01-\uff60]|\p{Extended_Pictographic}/u.test(c) ? 2 : 1), 0);
}

export function badgeLayout(data: CardData, options: CardOptions, error?: CardProps["error"]) {
  const raw = error?.title ?? currentPresence(data, options).text;
  const points = Array.from(raw.normalize("NFC"));
  const text = points.length > 48 ? points.slice(0, 47).join("") + "…" : raw;
  // Default Discord avatars are omitted. Custom avatars add an optional identity cue.
  const avatar = !error && data.user.avatar.static.includes("/avatars/") && !data.user.avatar.static.includes("/embed/");
  return { text, avatar, width: Math.ceil(badgeColumns(text) * 7.2) + 24 + (options.hide_status ? 0 : 18) + (avatar ? 26 : 0) + (!error ? Math.min(3, cardBadges(data, options).length) * 20 : 0), height: 32 };
}

export const badgeTheme: ThemeDefinition = {
  usesProfile: true, name: "badge", label: "Badge", supportedParams: ["banner_source", "hide_effect", "hide_badges", "theme", "mode", "accent", "bg", "radius", "hide_status", "hide_activity", "hide_spotify", "hide_custom_status", "idle_text", ...surfaceStyleParams],
  measure: (data, options, error) => { const { width, height } = badgeLayout(data, options, error); return { width, height }; },
  Component: Badge,
};

function Badge(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, badgeTheme.supportedParams);
  const { data, options, assets, error } = props;
  const tint = options.accent === "#5865f2" ? bannerTint(accentBanner(data, options, accentScope(["banner_source"])), data) : null;
  const layout = badgeLayout(data, options, error);
  return <div className={`dgp-badge ${options.mode} ${className}`} style={themeStyle(data, { ...options, ...(tint ? { accent: tint } : {}) }, layout)} title={error?.message}>
    <style>{badgeCss + profileLookCss + css}</style><StyleLayers {...props} />{layout.avatar && <img className="badge-avatar sx-float" width="20" height="20" src={assets(smallAsset(data.user.avatar.static, 32))} alt="" />}
    {!options.hide_status && <span className={`badge-dot sd-host ${error ? "offline" : data.status}`} aria-label={statusLabel(data)}><StatusGlyph data={error ? { status: "offline", platforms: [] } : data} /></span>}{!error && <Badges {...props} />}<span className="badge-text">{layout.text}</span>
    {!error && <ProfileEffect {...props} width={layout.width} />}
  </div>;
}

const badgeCss = `
.dgp-badge{border-color:var(--accent)!important}
.dgp-badge{position:relative;display:inline-flex;align-items:center;gap:8px;box-sizing:border-box;overflow:hidden;padding:0 11px;border:1px solid #747cf14a;border-radius:min(var(--radius),16px);background:linear-gradient(110deg,#5865f226,#ec48bd15),var(--bg);color:#eeedff;font:12px/1 "Courier New",monospace;white-space:nowrap;vertical-align:middle}.dgp-badge.light{color:#252454;border-color:#5865f250}.dgp-badge .badge-avatar{flex:none;border-radius:50%;object-fit:cover;width:20px;height:20px;margin-left:-5px;margin-right:-3px}.dgp-badge .badge-dot{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:0 0 0 3px #5865f21a}.dgp-badge .online{background:#23a55a}.dgp-badge .idle{background:#f0b232}.dgp-badge .dnd{background:#f23f43}.dgp-badge .offline{background:#80848e}.dgp-badge .badge-text{overflow:hidden;text-overflow:ellipsis;min-width:0}
.dgp-badge .badges{display:flex;gap:4px;max-width:60px;overflow:hidden;flex:none}.dgp-badge .badges img{width:16px;height:16px;object-fit:contain}
.dgp-badge .badge-text{background:#111338;border-radius:2px;box-shadow:0 0 0 2px #111338}.dgp-badge.light .badge-text{background:#f6f5ff;box-shadow:0 0 0 2px #f6f5ff}
`;
