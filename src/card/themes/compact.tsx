import { Badges } from "../parts/identity";
import { ProfileEffect, profileLookCss, bannerTint, bannerScope as accentScope, resolveBanner as accentBanner } from "../parts/profile-look";
import type { CardProps, ThemeDefinition } from "../types";
import { Avatar, DisplayName } from "../parts/identity";
import { identityParams, summaryParams, staticIdentity, Summary, themeCss, themeStyle } from "../parts/theme-kit";
import { allStyleParams, cardStyle, StyleLayers } from "../styles";

export const compactTheme: ThemeDefinition = {
  usesProfile: true, name: "compact", label: "Compact", supportedParams: ["banner_source", "hide_effect", "hide_badges", ...identityParams.filter((p) => p !== "hide_decoration"), ...summaryParams, ...allStyleParams],
  measure: (_data, options) => ({ width: options.width, height: 68 }),
  Component: Compact,
};

function Compact(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, compactTheme.supportedParams);
  const { data, options, error } = props;
  const tint = options.accent === "#5865f2" ? bannerTint(accentBanner(data, options, accentScope(["banner_source"])), data) : null;
  return <div className={`dgp-compact ${options.mode} ${className}`} style={themeStyle(data, { ...options, ...(tint ? { accent: tint } : {}) }, compactTheme.measure(data, options))}>
    <style>{compactCss + profileLookCss + css}</style><StyleLayers {...props} /><span className="compact-rail" />
    {error ? <div className="compact-copy"><strong className="truncate">{error.title}</strong><div className="summary truncate">{error.message}</div></div> : <><Avatar {...staticIdentity({ ...props, options: { ...options, hide_decoration: true } })} /><div className="compact-copy"><DisplayName {...props} /><div className="compact-meta"><Badges {...props} /><Summary {...props} /></div></div></>}
    {!error && <ProfileEffect {...props} width={options.width} />}
  </div>;
}

const compactCss = themeCss("dgp-compact") + `
.dgp-compact .compact-copy>strong{display:block;font-size:17px}
.dgp-compact{--avatar-size:42px;display:flex;align-items:center;gap:12px;padding:12px 18px;background-image:radial-gradient(ellipse at 100% 0%,#5865f22b,transparent 70%)}.dgp-compact .compact-rail{position:absolute;left:0;top:16px;bottom:16px;width:3px;border-radius:4px;background:linear-gradient(var(--accent),#ec48bd)}.dgp-compact .compact-copy{min-width:0;flex:1}.dgp-compact .display-name{font-size:17px;line-height:22px;letter-spacing:-.3px}.dgp-compact .summary{height:19px;margin-top:2px;font-size:11px}.dgp-compact .summary img{width:16px;height:16px}.dgp-compact .status-dot{width:14px;height:14px;border-width:3px}.dgp-compact .status-dot.dnd:after{width:4px;left:2px;top:3px}.dgp-compact .avatar-wrap{--sx-ring-w:2px;--sx-ring-gap:2px}
.dgp-compact .compact-meta{display:flex;align-items:center;gap:8px}.dgp-compact .compact-meta .summary{flex:1;margin-top:0}.dgp-compact .compact-meta .badges{flex:none;height:18px}.dgp-compact .compact-meta .badges img{width:16px;height:16px}.dgp-compact .badges{max-width:64px}.dgp-compact .name-line{min-width:0;flex:1}
`;
