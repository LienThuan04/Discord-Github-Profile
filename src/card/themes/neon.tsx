import { Badges } from "../parts/identity";
import { BannerFill, bannerScope, ProfileEffect, profileLookCss, profileParams, profileSurface, resolveBanner } from "../parts/profile-look";
import type { CSSProperties } from "react";
import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import type { CardError, CardProps, ThemeDefinition } from "../types";
import { Avatar, DisplayName, GuildTag } from "../parts/identity";
import { isMissingImage } from "../parts/image-state";
import { smallAsset, statusLabel, themeCss } from "../parts/theme-kit";
import { allStyleParams, cardStyle, Equalizer, SHAPE_PATHS, StatusText, StyleLayers } from "../styles";
import { cardVars, customStatus, emojiUrl, itemColor, presenceItems, reducedMotion, TimerLine, TYPE_GLYPHS, type PresenceItem } from "./presence-kit";

const PAD = 22;
const HEADER = 96;
const RULE = 30;
const SIGN = 30;
const GAP = 10;
const IDLE = 50;
const FOOTER = 46;

function boxHeight(item: PresenceItem): number {
  const copy = 14 + 22 + Math.min(2, item.lines.length) * 17;
  return 22 + Math.max(54, copy) + (item.timer ? (item.timer.mode === "progress" ? 30 : 22) : 0);
}

export function neonLayout(data: CardData, options: CardOptions, error?: CardError) {
  if (error) return { items: [] as PresenceItem[], sign: false, height: PAD + HEADER + RULE + 112 + FOOTER };
  const items = presenceItems(data, options);
  const sign = Boolean(customStatus(data, options));
  const sections = [sign ? SIGN : 0, ...items.map(boxHeight), items.length ? 0 : IDLE].filter(Boolean);
  return { items, sign, height: PAD + HEADER + RULE + sections.reduce((sum, n) => sum + n, 0) + Math.max(0, sections.length - 1) * GAP + FOOTER };
}

export const neonTheme: ThemeDefinition = {
  usesProfile: true, name: "neon", label: "Neon",
  supportedParams: ["hide_badges", "theme", "mode", "accent", "bg", "radius", "width", "animated", "name_gradient", "force_gradient", "hide_decoration", "hide_status", "hide_tag", "hide_custom_status", "hide_activity", "hide_spotify", "hide_timestamps", "max_activities", "idle_text", "show_banner", "hide_kv", "hide_nameplate", ...profileParams, ...allStyleParams],
  measure: (data, options, error) => ({ width: options.width, height: neonLayout(data, options, error).height }),
  Component: Neon,
};

function NeonBox({ item, ...props }: CardProps & { item: PresenceItem }) {
  const art = item.image ? props.assets(smallAsset(item.image, 128)) : null;
  return <section className={`neon-box ${item.kind}`} style={{ height: boxHeight(item), "--glow": itemColor(item) } as CSSProperties}>
    <div className="neon-row">
      {art && !isMissingImage(art) ? <img className="neon-art" width="54" height="54" src={art} alt={item.imageAlt} /> : <span className="neon-art neon-glyph">{TYPE_GLYPHS[item.type] ?? "✦"}</span>}
      <div className="neon-copy"><span className="neon-kicker"><span className="truncate">{item.title}</span>{item.type === 2 && <Equalizer options={props.options} />}</span><strong className="truncate">{item.name}</strong>{item.lines.slice(0, 2).map((line, index) => <span className={`truncate${index ? " muted" : ""}`} key={index}>{line}</span>)}</div>
    </div>
    {item.timer && <div className={`neon-timer ${item.timer.mode}`}><TimerLine timer={item.timer} animated={props.options.animated} /></div>}
  </section>;
}

function Neon(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, neonTheme.supportedParams);
  const { data, options, assets, error } = props;
  // The neon tube is this theme's take on the default ring; an explicit ring or status ring replaces it.
  const tube = options.ring === "status" && options.status_style !== "ring";
  const layout = neonLayout(data, options, error);
  const status = customStatus(data, options);
  const emoji = emojiUrl(status?.emoji, options.animated);
  const scope = bannerScope(neonTheme.supportedParams);
  const art = resolveBanner(data, options, scope);
  const decorated = !options.hide_decoration && Boolean(data.user.decoration);
  return <div className={`dgp-neon ${options.mode}${options.animated ? " motion" : ""}${decorated ? " decorated" : ""} ${className}`} style={{ ...cardVars(data, options, { width: options.width, height: layout.height }, { dark: "#08061f", light: "#f8f5ff" }), ...(error ? {} : profileSurface(data, options, scope)) }}>
    <style>{neonCss + profileLookCss + css}</style>{!error && <BannerFill {...props} art={art} className="neon-profile-art" />}
    <div className="neon-haze" /><div className="neon-floor" /><StyleLayers {...props} />
    {error ? <>
      <header className="neon-header"><span className="neon-error-mark">!</span><div className="neon-id"><h1 className="display-name truncate">{error.title}</h1><span className="neon-user truncate">signal lost</span></div></header>
      <div className="neon-rule" /><p className="neon-error">{error.message}</p>
    </> : <>
      <header className="neon-header">
        <div className="neon-avatar">{tube && <svg xmlns="http://www.w3.org/2000/svg" className="neon-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={SHAPE_PATHS[options.avatar_shape]} vectorEffect="non-scaling-stroke" /></svg>}<Avatar {...props} options={tube ? { ...options, ring: "none" } : options} /></div>
        <div className="neon-id">
          <DisplayName {...props} />
          <div className="neon-meta"><span className="neon-user truncate">{data.user.legacyTag ?? `@${data.user.username}`}<StatusText {...props} separator /></span><GuildTag {...props} /><Badges {...props} /></div>
          {!options.hide_status && options.status_style !== "text" && <span className={`neon-tube ${data.status}`}><i />{statusLabel(data)}</span>}
        </div>
      </header>
      <div className="neon-rule" />
      <div className="neon-sections">
        {layout.sign && status && <div className="neon-sign"><span className="neon-chevron">»</span>{status.emoji && (emoji ? <img width="18" height="18" src={assets(emoji.url, "image", emoji.fallback)} alt={status.emoji.name} /> : <span>{status.emoji.name}</span>)}<span className="truncate">{status.text}</span></div>}
        {layout.items.map((item) => <NeonBox {...props} item={item} key={item.key} />)}
        {!layout.items.length && <div className="neon-idle"><span>☾</span><span className="truncate">{options.idle_text}</span></div>}
      </div>
    </>}
    {!error && <ProfileEffect {...props} width={options.width} />}
    <footer className="neon-footer"><span>◢ DISCORD</span><span className="neon-footer-mid">{"// LIVE SIGNAL"}</span><span>LANYARD ◣</span></footer>
  </div>;
}

const neonCss = themeCss("dgp-neon") + `
.dgp-neon{--ink:#f4f0ff;--muted:#a9a3d6;--cyan:#2de2ff;--pink:#ff3fc8;--line:#2de2ff40;--glow-strength:1;padding:${PAD}px ${PAD}px 0;border:1px solid #2de2ff55;box-shadow:inset 0 0 24px #2de2ff1f,inset 0 0 2px #2de2ff80;font-family:"Segoe UI",Arial,sans-serif}
.dgp-neon.light{--ink:#1c1240;--muted:#5d557f;--cyan:#008fbf;--pink:#d1189e;--line:#008fbf38;--glow-strength:.45;border-color:#d1189e55;box-shadow:inset 0 0 24px #d1189e14,inset 0 0 2px #d1189e60}
.dgp-neon>.neon-profile-art{z-index:-3;}
.dgp-neon .neon-haze{position:absolute;inset:0;z-index:-2;background:radial-gradient(ellipse at 0% 0%,color-mix(in srgb,var(--accent) 40%,transparent),transparent 55%),radial-gradient(ellipse at 100% 30%,#ff3fc833,transparent 50%)}.dgp-neon.light .neon-haze{opacity:.55}
.dgp-neon .neon-floor{position:absolute;left:-20%;right:-20%;bottom:0;height:130px;z-index:-1;background-image:linear-gradient(var(--pink) 1px,transparent 1px),linear-gradient(90deg,var(--pink) 1px,transparent 1px);background-size:34px 18px;transform:perspective(220px) rotateX(58deg);transform-origin:bottom;opacity:.28;mask-image:linear-gradient(transparent,#000 70%)}
.dgp-neon.motion .neon-floor{animation:dgp-neon-floor 2.4s linear infinite}.dgp-neon.light .neon-floor{opacity:.22}
.dgp-neon .neon-header{height:${HEADER}px;display:flex;align-items:center;gap:18px}
.dgp-neon .neon-avatar{position:relative;flex:none;width:76px;height:76px;--avatar-size:76px}
.dgp-neon .neon-ring{position:absolute;z-index:-1;left:-7px;top:-7px;width:calc(100% + 14px);height:calc(100% + 14px);overflow:visible;filter:drop-shadow(0 0 calc(4px * var(--glow-strength)) var(--cyan)) drop-shadow(0 0 calc(10px * var(--glow-strength)) var(--pink))}.dgp-neon .neon-ring path{fill:none;stroke:var(--cyan);stroke-width:2.5px}
.dgp-neon.decorated .neon-ring{opacity:.75}.dgp-neon.decorated .neon-ring path{stroke-width:1.5px}
.dgp-neon.motion .neon-ring{animation:dgp-neon-hum 3.2s ease-in-out infinite alternate}
.dgp-neon .avatar{border:3px solid var(--bg)}.dgp-neon .status-dot{width:20px;height:20px;border-width:4px;box-shadow:0 0 10px currentColor}.dgp-neon .status-dot.online{color:#23a55a}.dgp-neon .status-dot.idle{color:#f0b232}.dgp-neon .status-dot.dnd{color:#f23f43}
.dgp-neon .neon-id{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}
.dgp-neon .name-line{height:34px}.dgp-neon .display-name{font-family:"Segoe UI","Arial Rounded MT Bold",Arial,sans-serif;font-size:27px;line-height:34px;font-weight:800;letter-spacing:.5px;color:#fff;filter:drop-shadow(0 0 calc(6px * var(--glow-strength)) var(--pink)) drop-shadow(0 0 calc(14px * var(--glow-strength)) var(--pink))}
.dgp-neon.light .display-name{color:#3a0b5c}.dgp-neon.light .display-name[style*="background-image"]{filter:drop-shadow(0 0 1px #fff) drop-shadow(0 0 6px #ff3fc84d)}
.dgp-neon.motion .name-line{animation:dgp-neon-flicker 7s linear infinite}
.dgp-neon .neon-meta{height:20px;display:flex;align-items:center;gap:8px;min-width:0}.dgp-neon .neon-user{color:var(--cyan);font-size:12px;letter-spacing:.4px;text-shadow:0 0 calc(8px * var(--glow-strength)) var(--cyan)}
.dgp-neon .guild-tag{border-color:var(--line);color:var(--cyan);height:18px;font-size:10px}
.dgp-neon .neon-tube{align-self:flex-start;height:20px;display:inline-flex;align-items:center;gap:6px;padding:0 9px;border-radius:12px;border:1.5px solid currentColor;font-size:9px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;box-shadow:0 0 calc(8px * var(--glow-strength)) currentColor,inset 0 0 calc(5px * var(--glow-strength)) color-mix(in srgb,currentColor 55%,transparent);text-shadow:0 0 calc(6px * var(--glow-strength)) currentColor}
.dgp-neon .neon-tube.online,.dgp-neon .neon-tube.idle,.dgp-neon .neon-tube.dnd,.dgp-neon .neon-tube.offline{background:color-mix(in srgb,var(--bg) 80%,transparent)}.dgp-neon .neon-tube i{width:6px;height:6px;border-radius:50%;background:currentColor}.dgp-neon .neon-tube.online{color:#3dff8f}.dgp-neon .neon-tube.idle{color:#ffc53d}.dgp-neon .neon-tube.dnd{color:#ff4d6d}.dgp-neon .neon-tube.offline{color:#a7abc9}
.dgp-neon.light .neon-tube.online{color:#0f9a4a}.dgp-neon.light .neon-tube.idle{color:#b67600}.dgp-neon.light .neon-tube.dnd{color:#d42a45}.dgp-neon.light .neon-tube.offline{color:#6a6e8a}
.dgp-neon .neon-rule{height:2px;margin:14px 0;background:linear-gradient(90deg,var(--cyan),var(--pink) 60%,transparent);box-shadow:0 0 calc(10px * var(--glow-strength)) var(--pink)}
.dgp-neon .neon-sections{display:flex;flex-direction:column;gap:${GAP}px}
.dgp-neon .neon-sign{height:${SIGN}px;display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:var(--ink);text-shadow:0 0 calc(10px * var(--glow-strength)) var(--pink)}.dgp-neon .neon-sign img{flex:none;object-fit:contain}.dgp-neon .neon-chevron{color:var(--pink);font-weight:900;font-size:18px}
.dgp-neon .neon-box{--glow:var(--accent);padding:11px 12px;border-radius:min(var(--radius),14px);border:1.5px solid var(--glow);background:color-mix(in srgb,var(--bg) 70%,transparent);box-shadow:0 0 calc(12px * var(--glow-strength)) color-mix(in srgb,var(--glow) 70%,transparent),inset 0 0 calc(14px * var(--glow-strength)) color-mix(in srgb,var(--glow) 30%,transparent);overflow:hidden}
.dgp-neon .neon-row{display:flex;gap:12px;align-items:flex-start}.dgp-neon .neon-art{flex:none;width:54px;height:54px;border-radius:10px;box-shadow:0 0 0 1.5px var(--glow),0 0 calc(12px * var(--glow-strength)) var(--glow)}
.dgp-neon .neon-glyph{display:grid;place-items:center;font-size:24px;color:var(--glow);background:color-mix(in srgb,var(--glow) 12%,transparent);text-shadow:0 0 10px var(--glow)}
.dgp-neon .neon-copy{min-width:0;flex:1;display:flex;flex-direction:column;font-size:12px;line-height:17px}.dgp-neon .neon-kicker{display:flex;align-items:center;gap:6px;min-width:0;height:14px;line-height:14px;font-size:9px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--glow);text-shadow:0 0 calc(8px * var(--glow-strength)) var(--glow)}.dgp-neon .neon-copy strong{height:22px;line-height:22px;font-size:15px}
.dgp-neon.light .neon-box.spotify{--glow:#0f9a4a!important}
.dgp-neon .neon-timer{margin-top:6px;font-size:10px;line-height:16px;color:var(--muted);font-variant-numeric:tabular-nums}.dgp-neon .neon-timer.progress{padding-top:2px}.dgp-neon .neon-timer .time-labels{margin-top:4px}
.dgp-neon .progress-track{height:3px;background:var(--line)}.dgp-neon .progress-fill{height:3px;background:var(--glow);box-shadow:0 0 8px var(--glow)}
.dgp-neon .neon-idle{height:${IDLE}px;display:flex;align-items:center;gap:12px;padding:0 14px;border:1.5px dashed var(--line);border-radius:min(var(--radius),14px);color:var(--muted);font-size:13px}.dgp-neon .neon-idle>span:first-child{color:var(--cyan);font-size:22px;text-shadow:0 0 12px var(--cyan)}
.dgp-neon .neon-footer{position:absolute;left:${PAD}px;right:${PAD}px;bottom:0;height:${FOOTER}px;display:flex;align-items:center;justify-content:space-between;font-size:9px;font-weight:800;letter-spacing:2px;color:var(--cyan);text-shadow:0 0 calc(8px * var(--glow-strength)) var(--cyan)}.dgp-neon .neon-footer-mid{color:var(--pink);text-shadow:0 0 calc(8px * var(--glow-strength)) var(--pink)}
.dgp-neon .neon-error-mark{flex:none;display:grid;place-items:center;width:76px;height:76px;border-radius:50%;border:2px solid #ff4d6d;color:#ff4d6d;font-size:38px;font-weight:900;box-shadow:0 0 18px #ff4d6d}.dgp-neon .neon-error{margin:0;height:112px;font-size:13px;line-height:20px;color:var(--muted);overflow:hidden}
@keyframes dgp-neon-floor{to{background-position:0 18px}}
@keyframes dgp-neon-hum{to{opacity:.7}}
@keyframes dgp-neon-flicker{0%,18%,22%,62%,64%,100%{opacity:1}20%,63%{opacity:.55}}
${reducedMotion([".dgp-neon .neon-floor", ".dgp-neon .neon-ring", ".dgp-neon .name-line", ".dgp-neon .name-effect"])}
.dgp-neon:has(>.pf-banner)>.neon-haze{display:none}.dgp-neon:has(>.pf-banner) .neon-id{--muted:#fff;text-shadow:0 1px 3px #18102f}
`;
