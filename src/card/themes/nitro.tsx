import type { ThemeDefinition, CardProps } from "../types";
import { Avatar, DisplayName, GuildTag, Badges, Platforms } from "../parts/identity";
import { Backdrop, ContentSections, fullParams, sectionsLayout, ThemeError, ThemeFooter, themeCss, themeStyle } from "../parts/theme-kit";
import { allStyleParams, cardStyle, StatusText, StyleLayers } from "../styles";
import { bannerScope, ProfileEffect, profileLookCss, profileSurface, resolveBanner } from "../parts/profile-look";

export const nitroTheme: ThemeDefinition = {
  name: "nitro", label: "Nitro", supportedParams: [...fullParams, ...allStyleParams], usesProfile: true,
  measure: (data, options, error) => ({ width: options.width, height: error ? 290 : 276 + sectionsLayout(data, options).height + 42 + 24 }),
  Component: Nitro,
};

function Nitro(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, nitroTheme.supportedParams);
  const { data, options, error } = props;
  const size = nitroTheme.measure(data, options, error);
  const scope = bannerScope(nitroTheme.supportedParams);
  const art = resolveBanner(data, options, scope);
  const surface = error ? {} : profileSurface(data, options, scope);
  return <div className={`dgp-nitro ${options.mode}${options.animated ? " motion" : ""}${"--pf-a" in surface ? " themed" : ""} ${className}`} style={{ ...themeStyle(data, options, size), ...surface }}>
    <style>{nitroCss + profileLookCss + css}</style><div className="nitro-mesh" /><div className="nitro-orbit" /><StyleLayers {...props} />
    {error ? <><div className="nitro-eyebrow">✦ &nbsp; DISCORD / NITRO</div><ThemeError {...props} /></> : <>
      <header className="nitro-hero"><Backdrop {...props} art={art} /><div className="nitro-eyebrow"><span>✦ &nbsp; MADE TO STAND OUT</span><span className="nitro-label">NITRO</span></div>
        <div className="nitro-avatar"><Avatar {...props} /><span className="nitro-spark">✧</span></div>
        <DisplayName {...props} /><div className="nitro-username truncate">{data.user.legacyTag ?? `@${data.user.username}`}<StatusText {...props} separator /></div>
        <div className="nitro-chips"><GuildTag {...props} /><Badges {...props} /></div><Platforms {...props} />
      </header>
      <div className="nitro-content"><ContentSections {...props} /><ThemeFooter /></div>
      <ProfileEffect {...props} width={size.width} />
    </>}
  </div>;
}

const nitroCss = themeCss("dgp-nitro") + `
.dgp-nitro{--panel:#151843e8}.dgp-nitro.light{--panel:#fffffff0}
.dgp-nitro .nitro-mesh{position:absolute;z-index:-1;inset:-30%;background:radial-gradient(ellipse at 20% 20%,#5865f299,transparent 48%),radial-gradient(ellipse at 85% 40%,#ec48bd77,transparent 44%),radial-gradient(ellipse at 50% 90%,#7947dccc,transparent 46%);transform:rotate(-8deg)}
.dgp-nitro.motion .nitro-mesh{animation:dgp-nitro-mesh 16s ease-in-out infinite alternate}.dgp-nitro.light .nitro-mesh{opacity:.4}
.dgp-nitro .nitro-orbit{position:absolute;z-index:-1;top:65px;right:-95px;width:270px;height:270px;border:1px solid #c6b5ff30;border-radius:50%;transform:rotate(-25deg)}.dgp-nitro .nitro-orbit:after{content:"";position:absolute;inset:25px;border:1px solid #c6b5ff25;border-radius:50%}
.dgp-nitro .nitro-hero{height:274px;position:relative;padding:22px 24px 0;isolation:isolate}.dgp-nitro .nitro-hero .backdrop-art:not(.pf-banner){opacity:.12;mix-blend-mode:luminosity;mask-image:linear-gradient(#000,transparent)}
.dgp-nitro .nitro-hero .backdrop-art.pf-banner{inset:0;height:146px;}.dgp-nitro .nitro-hero .backdrop-art.pf-image,.dgp-nitro .nitro-hero .backdrop-art.pf-kv{}.dgp-nitro.light .nitro-hero .backdrop-art.pf-banner{}.dgp-nitro .nitro-hero .backdrop-art.pf-nameplate{inset:0;height:146px;}
.dgp-nitro.themed .nitro-mesh{background:radial-gradient(ellipse at 20% 20%,color-mix(in srgb,var(--pf-a) 60%,transparent),transparent 48%),radial-gradient(ellipse at 85% 40%,color-mix(in srgb,var(--pf-b) 50%,transparent),transparent 44%),radial-gradient(ellipse at 50% 90%,color-mix(in srgb,var(--pf-b) 70%,transparent),transparent 46%)}
.dgp-nitro .nitro-eyebrow{height:22px;display:flex;align-items:center;justify-content:space-between;font-size:8px;font-weight:800;letter-spacing:1.4px;color:var(--muted)}.dgp-nitro>.nitro-eyebrow{padding:24px;height:42px}.dgp-nitro .nitro-label{color:#fff;border:1px solid #c3bcff60;border-radius:20px;padding:3px 8px;letter-spacing:1px;background:#5865f2}
.dgp-nitro .nitro-avatar{--avatar-size:80px;position:relative;width:80px;margin:14px 0 12px}.dgp-nitro .nitro-avatar:before{content:"";position:absolute;inset:-2px;border-radius:50%;box-shadow:0 0 26px #be6dff99,0 0 8px #b1a1ff66}.dgp-nitro .nitro-avatar .sx-ring{filter:drop-shadow(0 0 6px #be6dffaa)}.dgp-nitro .nitro-spark{position:absolute;left:102px;top:10px;font-size:48px;line-height:1;color:#ec48bd}
.dgp-nitro .display-name{font-family:"Arial Black","Segoe UI",sans-serif!important;font-size:clamp(24px,8vw,34px);line-height:40px;text-transform:uppercase;letter-spacing:-1.2px}.dgp-nitro .nitro-username{color:var(--muted);font-size:11px;height:22px}.dgp-nitro .nitro-chips{display:flex;gap:8px;align-items:center;height:26px;overflow:hidden}.dgp-nitro .nitro-content{padding:0 24px 24px}.dgp-nitro .activity-block{border:1px solid transparent;background:linear-gradient(var(--panel),var(--panel)) padding-box,linear-gradient(120deg,#7884ff,#a37cf1,#ec48bd88) border-box}.dgp-nitro .custom-status{background:var(--panel)}
@keyframes dgp-nitro-mesh{to{transform:translate(7%,5%) rotate(14deg) scale(1.08)}}
.dgp-nitro .nitro-hero:has(.pf-banner) .nitro-eyebrow{color:#fff;text-shadow:0 1px 3px #18102f}.dgp-nitro .nitro-hero .pf-banner{z-index:-1}.dgp-nitro .nitro-username,.dgp-nitro .nitro-chips{position:relative}.dgp-nitro .nitro-label{position:absolute;right:24px;top:153px}.dgp-nitro.light .nitro-hero .display-name,.dgp-nitro.light .nitro-username{color:#20204a;text-shadow:none}
`;
