import { Badges } from "../parts/identity";
import { ProfileEffect, profileLookCss, bannerTint, bannerScope as accentScope, resolveBanner as accentBanner } from "../parts/profile-look";
import { activityTimer } from "@/lib/discord/time";
import type { CardProps, ThemeDefinition } from "../types";
import { Avatar, DisplayName } from "../parts/identity";
import { isMissingImage } from "../parts/image-state";
import { currentPresence, identityParams, PresenceTimer, staticIdentity, summaryParams, themeCss, ThemeError, ThemeFooter, themeStyle } from "../parts/theme-kit";
import { allStyleParams, cardStyle, Equalizer, StatusText, StyleLayers } from "../styles";

export const activityTheme: ThemeDefinition = {
  usesProfile: true, name: "activity", label: "Activity", supportedParams: ["banner_source", "hide_effect", "hide_badges", ...identityParams.filter((p) => p !== "hide_decoration"), ...summaryParams, "hide_timestamps", ...allStyleParams],
  measure: (data, options, error) => {
    const p = currentPresence(data, options);
    const timer = !options.hide_timestamps && activityTimer(p.timestamps, data.now);
    return { width: options.width, height: error ? 284 : 84 + (p.kind === "idle" ? 154 : (p.image ? 192 : 0) + 112 + (timer ? 44 : 0)) + 42 };
  },
  Component: Activity,
};

function Activity(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, activityTheme.supportedParams);
  const { data, options, assets, error } = props;
  const tint = options.accent === "#5865f2" ? bannerTint(accentBanner(data, options, accentScope(["banner_source"])), data) : null;
  const p = currentPresence(data, options);
  const art = p.image ? assets(p.image) : null;
  return <div className={`dgp-activity ${options.mode} ${p.kind} ${className}`} style={themeStyle(data, { ...options, ...(tint ? { accent: tint } : {}) }, activityTheme.measure(data, options, error))}>
    <style>{activityCss + profileLookCss + css}</style><StyleLayers {...props} />
    {error ? <ThemeError {...props} /> : <><header className="activity-identity"><Avatar {...staticIdentity({ ...props, options: { ...options, hide_decoration: true } })} /><Badges {...props} /><div className="activity-identity-copy"><DisplayName {...props} /><span className="muted truncate">{data.user.legacyTag ?? `@${data.user.username}`}<StatusText {...props} separator /></span></div></header>
      {p.kind === "idle" ? <div className="activity-idle"><span className="idle-moon">☾</span><div className="activity-kicker">TAKING A BREATHER</div><strong>{p.name}</strong></div> : <>
        {p.image && <div className="activity-stage">{art && !isMissingImage(art) ? <><img className="stage-backdrop" src={art} alt="" /><img className="stage-art" src={art} alt={p.name} /></> : <div className="stage-fallback"><span>◉</span><strong className="truncate">{p.label}</strong></div>}<span className="stage-chip">{p.kind === "spotify" ? "♫ SPOTIFY" : "✦ NOW ACTIVE"}{(p.kind === "spotify" || (p.kind === "activity" && data.activities[0]?.type === 2)) && <Equalizer options={options} />}</span></div>}
        <div className="activity-feature-copy"><div className="activity-kicker truncate">{p.label}</div><h2 className="truncate">{p.name}</h2>{p.detail && <div className="truncate">{p.detail}</div>}{p.state && <div className="muted truncate">{p.state}</div>}</div><PresenceTimer {...props} timestamps={p.timestamps} />
      </>}
    </>}
    <div className="activity-bottom"><ThemeFooter /></div>
    {!error && <ProfileEffect {...props} width={options.width} />}
  </div>;
}

const activityCss = themeCss("dgp-activity") + `
.dgp-activity .stage-fallback{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;max-width:90%;color:white;text-transform:uppercase;font-size:11px;letter-spacing:2px}.dgp-activity .stage-fallback>span{display:grid;place-items:center;width:70px;height:70px;border-radius:22px;border:1px solid #ffffff60;background:#ffffff15;font-size:40px;line-height:1}.dgp-activity .stage-fallback>strong{max-width:100%}
.dgp-activity{background-image:radial-gradient(ellipse at 100% 20%,#5865f230,transparent 70%)}.dgp-activity .activity-identity{height:83px;padding:18px 22px;display:flex;align-items:center;gap:12px;--avatar-size:42px}.dgp-activity .activity-identity>.badges{flex:none;max-width:60px}.dgp-activity .activity-identity>.badges img{width:16px;height:16px}.dgp-activity .activity-identity-copy{min-width:0;flex:1}.dgp-activity .display-name{font-size:17px;line-height:22px}.dgp-activity .activity-identity-copy>span{display:block;font-size:10px}.dgp-activity .activity-identity-mark{font-size:24px;color:#ec48bd}.dgp-activity .status-dot{width:14px;height:14px;border-width:3px}.dgp-activity .avatar-wrap{--sx-ring-w:2px;--sx-ring-gap:2px}.dgp-activity .activity-stage{height:192px;position:relative;display:flex;align-items:center;justify-content:center;margin:0 20px;border-radius:20px;overflow:hidden;background:linear-gradient(135deg,#5865f2,#6e38ae,#ec48bd);isolation:isolate}.dgp-activity .stage-backdrop{position:absolute;inset:-20%;width:140%;height:140%;filter:blur(24px) brightness(.4) saturate(1.4);opacity:.8;z-index:-1}.dgp-activity .stage-art{width:140px;height:140px;object-fit:contain;border-radius:14px;box-shadow:0 12px 24px #0a0d3a66}.dgp-activity .stage-chip{position:absolute;bottom:10px;right:12px;background:#0a0d3acc;border:1px solid #ffffff30;border-radius:20px;color:#fff;font-size:8px;font-weight:800;letter-spacing:1px;padding:4px 8px}.dgp-activity .activity-feature-copy{height:112px;padding:14px 24px 8px;font-size:12px;line-height:19px;overflow:hidden}.dgp-activity .activity-kicker{font-size:9px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:var(--muted);line-height:18px}.dgp-activity .activity-feature-copy h2{font-size:22px;font-weight:900;letter-spacing:-.6px;line-height:30px;margin:0 0 2px}.dgp-activity .presence-timer{height:44px;padding:2px 24px 0;font-size:10px;color:var(--muted);line-height:16px}.dgp-activity.spotify .progress-fill{background:#23a55a}.dgp-activity .activity-bottom{padding:0 24px}.dgp-activity .activity-idle{height:154px;padding:8px 24px 20px;text-align:center;overflow:hidden}.dgp-activity .idle-moon{display:block;color:#c9a9ff;font-size:52px;line-height:60px}.dgp-activity .activity-idle strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:17px;line-height:24px;margin-top:4px;overflow-wrap:anywhere}.dgp-activity .theme-error{height:240px}
`;
