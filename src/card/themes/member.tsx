import { Badges } from "../parts/identity";
import { ProfileEffect, profileLookCss } from "../parts/profile-look";
import { BannerFill, bannerScope, profileSurface, resolveBanner } from "../parts/profile-look";
import type { CardProps, ThemeDefinition } from "../types";
import { Avatar, DisplayName, GuildTag } from "../parts/identity";
import { identityParams, summaryParams, staticIdentity, Summary, themeCss, themeStyle } from "../parts/theme-kit";
import { allStyleParams, cardStyle, StyleLayers } from "../styles";

export const memberTheme: ThemeDefinition = {
  usesProfile: true, name: "member", label: "Member", supportedParams: ["banner_source", "hide_effect", "hide_badges", ...identityParams, ...summaryParams, "hide_nameplate", "hide_tag", "banner_source", ...allStyleParams],
  measure: (_data, options) => ({ width: Math.min(420, Math.max(360, options.width)), height: 96 }),
  Component: Member,
};

function Member(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, memberTheme.supportedParams);
  const { data, options, error } = props;
  const scope = bannerScope(memberTheme.supportedParams, { nameplateFirst: true });
  const art = resolveBanner(data, options, scope);
  return <div className={`dgp-member ${options.mode} ${className}`} style={{ ...themeStyle(data, options, memberTheme.measure(data, options)), ...(error ? {} : profileSurface(data, options, scope)) }}>
    <style>{memberCss + profileLookCss + css}</style>{!error && <BannerFill {...props} options={{ ...options, animated: false }} art={art} className="member-nameplate" />}<div className="member-wash" /><StyleLayers {...props} />
    {error ? <div className="member-error"><strong className="truncate">{error.title}</strong><span className="truncate">{error.message}</span></div> : <><Avatar {...staticIdentity(props)} /><div className="member-copy"><div className="member-name"><DisplayName {...props} /><GuildTag {...props} /></div><div className="member-meta"><Badges {...props} /><Summary {...props} /></div></div></>}
    {!error && <ProfileEffect {...props} width={Math.min(420, Math.max(360, options.width))} />}
  </div>;
}

const memberCss = themeCss("dgp-member") + `
.dgp-member{--avatar-size:56px;display:flex;align-items:center;gap:16px;padding:18px 20px;background-image:linear-gradient(110deg,#5865f230,#884cc52b 55%,#ec48bd38)}.dgp-member .member-nameplate{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}.dgp-member .member-wash{position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,#0a0d3af2 0%,#0a0d3add 48%,#15154450)}.dgp-member.light .member-wash{background:linear-gradient(90deg,#f1f0fffa 0%,#f1f0ffeb 56%,#f1f0ff80)}.dgp-member .member-meta{display:flex;align-items:center;gap:8px}.dgp-member .member-meta .summary{min-width:0;flex:1}.dgp-member .member-meta .badges{height:18px;max-width:60px;flex:none}.dgp-member .member-meta .badges img{width:16px;height:16px}.dgp-member .member-copy{flex:1;min-width:0}.dgp-member .member-name{display:flex;align-items:center;gap:8px;margin-bottom:6px}.dgp-member .name-line{flex:1;min-width:0}.dgp-member .display-name{font-size:19px;line-height:24px}.dgp-member .summary{font-size:11px;height:20px}.dgp-member .member-error{min-width:0;display:flex;flex-direction:column;gap:6px}.dgp-member .member-error strong{font-size:18px}.dgp-member .member-error>span{font-size:12px;color:var(--muted)}
.dgp-member:has(>.pf-banner) .member-wash{display:none}.dgp-member:has(>.pf-banner){--ink:#fff;--muted:#fff;text-shadow:0 1px 3px #18102f}
`;
