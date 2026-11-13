import { aboutFields, BannerFill, bannerScope, ProfileEffect, profileLookCss, profileParams, profileSurface, resolveBanner } from "../parts/profile-look";
import type { CSSProperties } from "react";
import { THEME_WIDTHS, type CardOptions } from "@/lib/options";
import type { CardProps, ThemeDefinition } from "../types";
import { Avatar, Badges, DisplayName, GuildTag, Platforms } from "../parts/identity";
import { isMissingImage } from "../parts/image-state";
import { smallAsset, statusLabel, themeCss } from "../parts/theme-kit";
import { allStyleParams, cardStyle, Equalizer, StyleLayers } from "../styles";
import { cardVars, customStatus, emojiUrl, presenceItems, reducedMotion, TimerLine, TYPE_GLYPHS } from "./presence-kit";

/**
 * README header range (600–1000, default 800), shared with `parseOptions()`. Values below the minimum can only
 * come from the generic 300–600 clamp (for example options parsed without `theme=banner`) and select the default.
 */
export const BANNER_WIDTH = THEME_WIDTHS.banner!;
export const BANNER_HEIGHT = 200;

export function bannerWidth(options: Pick<CardOptions, "width">): number {
  return options.width < BANNER_WIDTH.min ? BANNER_WIDTH.fallback : Math.min(BANNER_WIDTH.max, Math.round(options.width));
}

export function bannerLayout(options: Pick<CardOptions, "width">) {
  const width = bannerWidth(options);
  return { width, height: BANNER_HEIGHT, avatar: width >= 760 ? 120 : 96, name: width >= 760 ? 46 : 34, panel: Math.min(320, Math.max(204, Math.round(width * 0.34))) };
}

const platformLabels: Record<string, string> = { desktop: "desktop", web: "web", mobile: "mobile", embedded: "console", vr: "VR" };

export const bannerTheme: ThemeDefinition = {
  usesProfile: true, name: "banner", label: "Banner",
  supportedParams: ["theme", "mode", "accent", "bg", "radius", "width", "animated", "name_gradient", "force_gradient", "show_banner", "hide_decoration", "hide_nameplate", "hide_tag", "hide_badges", "hide_status", "hide_platforms", "hide_custom_status", "hide_activity", "hide_spotify", "hide_timestamps", "hide_kv", "idle_text", ...profileParams, ...allStyleParams],
  measure: (_data, options) => { const { width, height } = bannerLayout(options); return { width, height }; },
  Component: Banner,
};

function NowPanel(props: CardProps) {
  const { data, options, assets } = props;
  const item = presenceItems(data, options, 1)[0];
  if (!item) return <aside className="banner-now idle"><div className="now-kicker">☾ &#160;Taking a breather</div><strong className="now-idle">{options.idle_text}</strong><div className="now-foot">Discord · Lanyard</div></aside>;
  const art = item.image ? assets(smallAsset(item.image, 128)) : null;
  return <aside className={`banner-now ${item.kind}`}>
    <div className="now-kicker"><span className="truncate">{TYPE_GLYPHS[item.type] ?? "✦"} &#160;{item.title}</span>{item.type === 2 && <Equalizer options={options} />}</div>
    <div className="now-row">{art && !isMissingImage(art) ? <img className="now-art" width="58" height="58" src={art} alt={item.imageAlt} /> : <span className="now-art now-fallback">{TYPE_GLYPHS[item.type] ?? "✦"}</span>}
      <div className="now-copy"><strong className="truncate">{item.name}</strong>{item.lines.slice(0, 2).map((line, index) => <span className={`truncate${index ? " muted" : ""}`} key={index}>{line}</span>)}</div></div>
    <div className="now-timer">{item.timer ? <TimerLine timer={item.timer} animated={options.animated} /> : <span className="muted">{item.verb} right now</span>}</div>
  </aside>;
}

function Banner(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, bannerTheme.supportedParams);
  const { data, options, assets, error } = props;
  const layout = bannerLayout(options);
  const scope = bannerScope(bannerTheme.supportedParams);
  const art = resolveBanner(data, options, scope);
  const about = aboutFields(data, options);
  const status = customStatus(data, options);
  const emoji = emojiUrl(status?.emoji, options.animated);
  // Without a custom status the line falls back to KV profile text, then platforms; the panel owns idle_text.
  const tagline = (!options.hide_kv && (about.bio || [about.pronouns, about.location].filter(Boolean).join(" · "))) || (!options.hide_platforms && data.platforms.length ? `Active on ${data.platforms.map((p) => platformLabels[p]).join(", ")}` : "");
  return <div className={`dgp-banner ${options.mode}${options.animated ? " motion" : ""} ${className}`} style={{ ...cardVars(data, options, layout, { dark: "#0a0d3a", light: "#f4f3ff" }), "--avatar-size": `${layout.avatar}px`, "--name-size": `${layout.name}px`, "--panel-w": `${layout.panel}px`, ...(error ? {} : profileSurface(data, options, scope)) } as CSSProperties}>
    <style>{bannerCss + profileLookCss + css}</style>
    {art.kind !== "none" && <div className="banner-mesh" />}<BannerFill {...props} art={art} className="banner-art" /><div className="banner-wash" /><span className="banner-ring" /><span className="banner-ring two" /><StyleLayers {...props} />
    {error ? <div className="banner-error"><div className="banner-eyebrow">◈ &#160;DISCORD PRESENCE</div><h1 className="truncate">{error.title}</h1><p>{error.message}</p></div> : <>
      <div className="banner-identity"><Avatar {...props} /></div>
      <div className="banner-copy">
        <div className="banner-eyebrow truncate">◈ &#160;DISCORD{options.hide_status ? "" : ` · ${statusLabel(data).toUpperCase()}`}</div>
        <DisplayName {...props} />
        <div className="banner-meta"><span className="truncate">{data.user.legacyTag ?? `@${data.user.username}`}</span><GuildTag {...props} /><Badges {...props} /><Platforms {...props} /></div>
        {status ? <div className="banner-status">{status.emoji && (emoji ? <img width="20" height="20" src={assets(emoji.url, "image", emoji.fallback)} alt={status.emoji.name} /> : <span>{status.emoji.name}</span>)}<span className="truncate">{status.text}</span></div> : tagline && <div className="banner-status muted"><span className="truncate">{tagline}</span></div>}
      </div>
      <NowPanel {...props} /><ProfileEffect {...props} width={layout.width} />
    </>}
  </div>;
}

const bannerCss = themeCss("dgp-banner") + `
.dgp-banner{--ink:#ffffff;--muted:#c4c7ef;--panel:#0c0f3dcc;--line:#ffffff26;display:flex;align-items:center;gap:24px;padding:0 28px;font-family:"Segoe UI",Arial,sans-serif}
.dgp-banner.light{--ink:#191b45;--muted:#4e5280;--panel:#ffffffd9;--line:#2a2f7a24}
.dgp-banner .banner-mesh{position:absolute;inset:0;z-index:-3;background:radial-gradient(ellipse at 12% 30%,color-mix(in srgb,var(--accent) 85%,transparent),transparent 55%),radial-gradient(ellipse at 62% 120%,#ec48bdb0,transparent 50%),radial-gradient(ellipse at 95% 0%,#7c4ddbc0,transparent 55%),var(--plate,var(--bg))}
.dgp-banner.motion .banner-mesh{background-size:140% 140%;animation:dgp-banner-mesh 18s ease-in-out infinite alternate}
.dgp-banner .banner-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
.dgp-banner .banner-wash{position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,color-mix(in srgb,var(--bg) 88%,transparent) 0%,color-mix(in srgb,var(--bg) 62%,transparent) 55%,color-mix(in srgb,var(--bg) 30%,transparent) 100%)}
.dgp-banner.light .banner-wash{background:linear-gradient(90deg,color-mix(in srgb,var(--bg) 94%,transparent) 0%,color-mix(in srgb,var(--bg) 78%,transparent) 55%,color-mix(in srgb,var(--bg) 40%,transparent) 100%)}
.dgp-banner .banner-ring{position:absolute;z-index:-1;right:calc(var(--panel-w) - 40px);top:-120px;width:260px;height:260px;border:1px solid #ffffff2e;border-radius:50%;pointer-events:none}.dgp-banner .banner-ring.two{width:180px;height:180px;top:-80px;right:calc(var(--panel-w));border-color:#ffffff1f}.dgp-banner.light .banner-ring{border-color:#3b3f9a1f}
.dgp-banner .banner-identity{flex:none;width:var(--avatar-size);height:var(--avatar-size)}
.dgp-banner .avatar{border:4px solid color-mix(in srgb,var(--bg) 70%,transparent)}.dgp-banner .status-dot{width:30px;height:30px;border-width:6px;right:2px;bottom:2px}.dgp-banner .status-dot.dnd:after{width:10px;height:3px;left:4px;top:7px}
.dgp-banner .banner-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
.dgp-banner .banner-eyebrow{height:18px;font-size:10px;font-weight:800;letter-spacing:2.2px;color:var(--muted)}
.dgp-banner .name-line{height:56px}.dgp-banner .display-name{font-family:"Segoe UI Black","Arial Black","Segoe UI",sans-serif;font-size:var(--name-size);line-height:56px;font-weight:900;letter-spacing:-1.6px}.dgp-banner .bot-chip{font-size:11px}
.dgp-banner:not(.light) .display-name:not([style*="background-image"]){text-shadow:0 2px 18px #0a0d3a80}
.dgp-banner .banner-meta{height:26px;display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden;color:var(--muted);font-size:13px}.dgp-banner .banner-meta>span.truncate{flex:0 0 auto;max-width:60%}.dgp-banner .guild-tag{flex:none;background:var(--panel)}.dgp-banner .badges{flex:0 1 auto;min-width:0;flex-wrap:wrap;height:20px}.dgp-banner .platforms{flex:0 2 auto;min-width:0;flex-wrap:wrap;height:26px;gap:0 6px}.dgp-banner .platforms>span>span{display:none}
.dgp-banner .banner-status{height:28px;display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600}.dgp-banner .banner-status img{flex:none;object-fit:contain}.dgp-banner .banner-status.muted{font-weight:400;font-style:italic}
.dgp-banner .banner-now{flex:none;width:var(--panel-w);height:144px;padding:12px 14px;border-radius:min(var(--radius),18px);background:var(--panel);border:1px solid var(--line);backdrop-filter:blur(10px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 40px #0a0d3a40}
.dgp-banner .now-kicker{display:flex;align-items:center;gap:8px;min-width:0;height:18px;line-height:18px;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--accent)}.dgp-banner:not(.light) .now-kicker{color:color-mix(in srgb,var(--accent) 50%,#fff)}.dgp-banner .banner-now.spotify .now-kicker{color:#1ed760}.dgp-banner.light .banner-now.spotify .now-kicker{color:#118a3e}
.dgp-banner .now-row{height:66px;margin-top:6px;display:flex;gap:12px;align-items:center}.dgp-banner .now-art{flex:none;width:58px;height:58px;border-radius:10px}.dgp-banner .now-fallback{display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),#ec48bd);color:#fff;font-size:24px}
.dgp-banner .now-copy{min-width:0;flex:1;display:flex;flex-direction:column;font-size:12px;line-height:17px}.dgp-banner .now-copy strong{font-size:14px;line-height:20px}
.dgp-banner .now-timer{margin-top:auto;height:30px;font-size:11px;line-height:16px;color:var(--muted);font-variant-numeric:tabular-nums;display:flex;flex-direction:column;justify-content:flex-end}.dgp-banner .timer-progress .time-labels{margin-top:4px}.dgp-banner .banner-now.spotify .progress-fill{background:#1ed760}
.dgp-banner .banner-now.idle{justify-content:center;gap:6px}.dgp-banner .now-idle{font-size:17px;line-height:23px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}.dgp-banner .now-foot{font-size:9px;letter-spacing:1.4px;color:var(--muted);text-transform:uppercase}
.dgp-banner .banner-error{min-width:0}.dgp-banner .banner-error h1{margin:4px 0;font-size:36px;line-height:44px;font-weight:900;letter-spacing:-1px}.dgp-banner .banner-error p{margin:0;color:var(--muted);font-size:14px;line-height:20px;max-width:560px}
@keyframes dgp-banner-mesh{to{background-position:100% 60%}}
${reducedMotion([".dgp-banner .banner-mesh", ".dgp-banner .name-effect"])}
.dgp-banner:has(>.pf-banner)>.banner-wash{display:none}.dgp-banner:has(>.pf-banner) .banner-copy{--ink:#fff;--muted:#fff;color:#fff;text-shadow:0 1px 3px #18102f}.dgp-banner:has(>.pf-banner) .banner-copy .guild-tag{background:#18102fcc;border-color:#ffffff2e;color:#fff;text-shadow:none}
`;
