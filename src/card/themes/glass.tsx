import type { CardProps, ThemeDefinition } from "../types";
import { Avatar, DisplayName, GuildTag, Badges, Platforms } from "../parts/identity";
import { Backdrop, ContentSections, fullParams, sectionsLayout, themeCss, ThemeError, ThemeFooter, themeStyle } from "../parts/theme-kit";
import { allStyleParams, cardStyle, StatusText, StyleLayers } from "../styles";
import { bannerScope, ProfileEffect, profileLookCss, profileSurface, resolveBanner } from "../parts/profile-look";

export const glassTheme: ThemeDefinition = {
  name: "glass", label: "Glass", supportedParams: [...fullParams, ...allStyleParams], usesProfile: true,
  measure: (data, options, error) => ({ width: options.width, height: error ? 274 : 167 + sectionsLayout(data, options).height + 42 + 24 }),
  Component: Glass,
};

function Glass(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, glassTheme.supportedParams);
  const { data, options, error } = props;
  const size = glassTheme.measure(data, options, error);
  const scope = bannerScope(glassTheme.supportedParams);
  const art = resolveBanner(data, options, scope);
  const surface = error ? {} : profileSurface(data, options, scope);
  return <div className={`dgp-glass ${options.mode}${"--pf-a" in surface ? " themed" : ""} ${className}`} style={{ ...themeStyle(data, options, size), ...surface }}>
    <style>{glassCss + profileLookCss + css}</style><Backdrop {...props} art={art} /><div className="glass-tint" /><div className="glass-reflection" /><StyleLayers {...props} />
    {error ? <div className="glass-inner"><ThemeError {...props} /><ThemeFooter /></div> : <div className="glass-inner">
      <header className="glass-header"><div className="glass-eyebrow"><span>◈ &nbsp; DISCORD</span><span>STAY CONNECTED</span></div><div className="glass-identity"><Avatar {...props} /><div className="glass-copy"><DisplayName {...props} /><div className="glass-username truncate">{data.user.legacyTag ?? `@${data.user.username}`}<StatusText {...props} separator /></div><div className="glass-chips"><GuildTag {...props} /><Badges {...props} /></div></div></div><Platforms {...props} /></header>
      <ContentSections {...props} /><ThemeFooter />
    </div>}
    {!error && <ProfileEffect {...props} width={size.width} />}
  </div>;
}

const glassCss = themeCss("dgp-glass") + `
.dgp-glass:after{content:"";position:absolute;z-index:-1;inset:0;background:radial-gradient(ellipse at 100% 0%,#a898ff25,transparent 55%),radial-gradient(ellipse at 0% 100%,#ec48bd18,transparent 55%);pointer-events:none}
.dgp-glass{--panel:#232653b8;--line:#d7d6ff35;padding:0 22px 24px;background-image:linear-gradient(145deg,#5865f233,#ec48bd22)}.dgp-glass.light{--panel:#ffffffba;--line:#7470af35}.dgp-glass>.backdrop-art{filter:blur(24px) saturate(1.25);transform:scale(1.25);opacity:.6}.dgp-glass>.backdrop-art.pf-color,.dgp-glass>.backdrop-art.pf-theme{transform:none;}.dgp-glass.themed .glass-tint{background:linear-gradient(135deg,color-mix(in srgb,var(--bg) 70%,transparent),color-mix(in srgb,var(--bg) 88%,transparent))}.dgp-glass .glass-tint{position:absolute;inset:0;z-index:-1;background:linear-gradient(135deg,#0a0d3ab8,#10143ee8)}.dgp-glass.light .glass-tint{background:linear-gradient(135deg,#f6f4ffcf,#e8e8f9e8)}.dgp-glass .glass-reflection{position:absolute;inset:0;z-index:-1;background:linear-gradient(125deg,#ffffff22,transparent 35%);border-radius:inherit;border-top:1px solid #ffffff66;pointer-events:none}.dgp-glass .glass-header{height:165px;padding-top:18px}.dgp-glass .glass-eyebrow{height:28px;display:flex;align-items:flex-start;justify-content:space-between;font-size:8px;font-weight:800;letter-spacing:1.3px;color:var(--muted)}.dgp-glass .glass-identity{--avatar-size:64px;display:flex;align-items:center;gap:16px;height:88px}.dgp-glass .glass-copy{min-width:0;flex:1}.dgp-glass .display-name{font-size:23px;line-height:30px}.dgp-glass .glass-username{font-size:11px;color:var(--muted);height:20px}.dgp-glass .glass-chips{display:flex;align-items:center;gap:6px;height:26px;overflow:hidden}.dgp-glass .activity-block,.dgp-glass .custom-status,.dgp-glass .idle-state{backdrop-filter:blur(16px);border:1px solid var(--line);box-shadow:inset 0 1px #ffffff12}.dgp-glass .glass-inner{position:relative}.dgp-glass .glass-inner>.theme-error{height:205px}.dgp-glass .theme-footer{height:42px}
.dgp-glass:has(>.pf-banner)>.glass-tint,.dgp-glass:has(>.pf-banner)>.glass-reflection{display:none}.dgp-glass>.backdrop-art.pf-banner{filter:none;transform:none;opacity:1}.dgp-glass:has(>.pf-banner){--ink:#fff;--muted:#fff;text-shadow:0 1px 3px #18102f}.dgp-glass.light:has(>.pf-banner){--panel:#ffffffed}.dgp-glass.light .content-sections{color:#20204a;--muted:#56577d;text-shadow:none}
`;
