import { Badges } from "../parts/identity";
import { BannerFill, bannerScope, ProfileEffect, profileLookCss, profileParams, profileSurface, resolveBanner } from "../parts/profile-look";
import type { CSSProperties, ReactNode } from "react";
import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import type { CardError, CardProps, ThemeDefinition } from "../types";
import { isMissingImage } from "../parts/image-state";
import { smallAsset, statusLabel, themeCss } from "../parts/theme-kit";
import { cardStyle, Equalizer, StyleLayers } from "../styles";
import { ago, cardVars, customStatus, presenceItems, reducedMotion, snapshotClock, staticEmojiUrl, TimerLine, type PresenceItem } from "./presence-kit";

const STATUS_BAR = 40;
const CLOCK = 116;
const GAP = 8;
const PEEK = 12;
const DOCK = 66;
const verbs: Record<number, string> = { 0: "is playing", 1: "is streaming", 2: "is listening to", 3: "is watching", 5: "is competing in" };

interface Note { key: string; kind: "spotify" | "activity" | "status"; body: number; progress: boolean; item?: PresenceItem }

function notes(data: CardData, options: CardOptions): Note[] {
  const list: Note[] = presenceItems(data, options).map((item) => ({ key: item.key, kind: item.kind, item, body: item.kind === "spotify" ? 1 : 1 + Math.min(1, item.lines.length), progress: item.timer?.mode === "progress" }));
  // The custom status (or the idle line) is always the newest-looking bubble at the bottom of the stack.
  if (customStatus(data, options) || !list.length) list.push({ key: "status", kind: "status", body: 1, progress: false });
  return list;
}

const noteHeight = (note: Note) => 24 + 16 + 20 + note.body * 18 + (note.progress ? 24 : 0);

export function mobileLayout(data: CardData, options: CardOptions, error?: CardError) {
  const width = Math.min(400, Math.max(320, Math.round(options.width)));
  const list = error ? [{ key: "error", kind: "status", body: 2, progress: false } as Note] : notes(data, options);
  const stack = list.reduce((sum, note) => sum + noteHeight(note), 0) + (list.length - 1) * GAP + PEEK;
  return { width, list, height: STATUS_BAR + CLOCK + stack + DOCK };
}

export const mobileTheme: ThemeDefinition = {
  usesProfile: true, name: "mobile", label: "Mobile",
  supportedParams: ["hide_badges", "theme", "mode", "accent", "bg", "width", "animated", "show_banner", "hide_nameplate", "hide_kv", "hide_status", "hide_custom_status", "hide_activity", "hide_spotify", "hide_timestamps", "max_activities", "idle_text", "pattern", "effect", "border", "font", "eq_style", ...profileParams, "tz"],
  measure: (data, options, error) => { const { width, height } = mobileLayout(data, options, error); return { width, height }; },
  Component: Mobile,
};

function Bubble({ icon, badge, time, title, children, className = "", height }: { icon: ReactNode; badge: string; time: ReactNode; title: ReactNode; children: ReactNode; className?: string; height: number }) {
  return <section className={`mobile-note ${className}`} style={{ height }}>
    <div className="note-icon">{icon}<span className="note-badge">{badge}</span></div>
    <div className="note-copy"><div className="note-head"><span>DISCORD</span><time>{time}</time></div><div className="note-title truncate">{title}</div>{children}</div>
  </section>;
}

function Mobile(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, mobileTheme.supportedParams);
  const { data, options, assets, error } = props;
  const layout = mobileLayout(data, options, error);
  const clock = snapshotClock(data.now, options.tz);
  const scope = bannerScope(mobileTheme.supportedParams);
  const art = resolveBanner(data, options, scope);
  const avatar = assets(smallAsset(data.user.avatar.static, 64));
  const avatarIcon = <img className="note-avatar" width="38" height="38" src={avatar} alt="" />;
  const name = data.user.displayName;
  const status = customStatus(data, options);
  const emoji = staticEmojiUrl(status?.emoji);
  return <div className={`dgp-mobile ${options.mode} ${className}`} style={{ ...cardVars(data, options, layout, { dark: "#0c0f3c", light: "#efeefe" }, { radius: false }), ...(error ? {} : profileSurface(data, options, scope)) } as CSSProperties}>
    <style>{mobileCss + profileLookCss + css}</style>
    <BannerFill {...props} art={art} className="mobile-wall-art" />{art.kind !== "none" && <div className={`mobile-wall ${art.kind !== "accent" ? "profile-wall" : ""}`} />}<StyleLayers {...props} />
    <header className="mobile-status-bar"><span>{clock.time}</span><span className="mobile-island" /><span className="mobile-icons"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="11" viewBox="0 0 17 11" aria-hidden="true"><rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor" /><rect x="4.5" y="5" width="3" height="6" rx="1" fill="currentColor" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" /><rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" /></svg><svg xmlns="http://www.w3.org/2000/svg" width="15" height="11" viewBox="0 0 15 11" aria-hidden="true"><path d="M7.5 2.2c2.2 0 4.2.8 5.7 2.2l1.1-1.2A10 10 0 0 0 7.5.6 10 10 0 0 0 .7 3.2l1.1 1.2a8.3 8.3 0 0 1 5.7-2.2Zm0 3.2c1.3 0 2.5.5 3.4 1.3L12 5.5a6.6 6.6 0 0 0-9 0l1.1 1.2a5 5 0 0 1 3.4-1.3Zm0 3.1c.5 0 1 .2 1.2.5L7.5 10.6 6.3 9a1.6 1.6 0 0 1 1.2-.5Z" fill="currentColor" /></svg><span className="mobile-battery"><i /></span></span></header>
    <div className="mobile-clock"><div className="mobile-date">{clock.date}</div><div className="mobile-time sx-float">{clock.time}{clock.zone && <small>{clock.zone}</small>}</div></div>
    <div className="mobile-stack">
      {error ? <Bubble icon={<span className="note-glyph error">!</span>} badge="!" time="now" title={error.title} height={noteHeight(layout.list[0]!)} className="last"><div className="note-body note-error">{error.message}</div></Bubble>
        : layout.list.map((note, index) => {
          const last = index === layout.list.length - 1 ? " last" : "";
          const height = noteHeight(note);
          const item = note.item;
          if (!item) return <Bubble key={note.key} className={`status${last}`} height={height} icon={<>{avatarIcon}{!options.hide_status && <i className={`note-dot ${data.status}`} />}</>} badge="✦" time="now" title={name}>
            <div className="note-body">{status ? <>{status.emoji && (emoji ? <img width="16" height="16" src={assets(emoji)} alt={status.emoji.name} /> : <span>{status.emoji.name}</span>)}<span className="truncate">{status.text ? `“${status.text}”` : "updated their status"}</span></> : <span className="truncate">{options.hide_status ? options.idle_text : `is ${statusLabel(data).toLowerCase()} · ${options.idle_text}`}</span>}</div>
          </Bubble>;
          const art = item.image ? assets(smallAsset(item.image, 64)) : null;
          const icon = art && !isMissingImage(art) ? <img className="note-art" width="38" height="38" src={art} alt={item.imageAlt} /> : avatarIcon;
          if (item.kind === "spotify") return <Bubble key={note.key} className={`spotify${last}`} height={height} icon={icon} badge="♫" time={<><Equalizer options={options} />now playing</>} title={item.name}>
            <div className="note-body muted truncate">{item.lines.join(" — ")}</div>{item.timer?.mode === "progress" && <div className="note-progress"><TimerLine timer={item.timer} animated={options.animated} /></div>}
          </Bubble>;
          return <Bubble key={note.key} className={`activity${last}`} height={height} icon={icon} badge={item.type === 1 ? "●" : item.type === 2 ? "♫" : "▶"} time={item.type === 2 ? <><Equalizer options={options} />{ago(data.now, item.timestamps?.start)}</> : ago(data.now, item.timestamps?.start)} title={<>{name} <span className="note-verb">{verbs[item.type] ?? "is on"}</span></>}>
            <div className="note-body truncate"><strong>{item.name}</strong></div>{item.lines[0] && <div className="note-body muted truncate">{item.lines[0]}</div>}{note.progress && item.timer && <div className="note-progress"><TimerLine timer={item.timer} animated={options.animated} /></div>}
          </Bubble>;
        })}
    </div>
    {!error && <ProfileEffect {...props} width={layout.width} />}
    <footer className="mobile-dock"><span className="mobile-round"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="18" viewBox="0 0 14 18" aria-hidden="true"><path d="M3 1h8v4l-2 3v9H5V8L3 5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg></span><Badges {...props} /><span className="mobile-home" /><span className="mobile-round"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="15" viewBox="0 0 18 15" aria-hidden="true"><path d="M2 4h3l1.5-2h5L13 4h3v9H2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="9" cy="8.5" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg></span></footer>
  </div>;
}

const mobileCss = themeCss("dgp-mobile") + `
.dgp-mobile{--ink:#ffffff;--muted:#d5d6f5;--note:#1a1d4fc2;--line:#ffffff24;border-radius:38px;border:2px solid #ffffff1c;font-family:"Segoe UI",-apple-system,Arial,sans-serif}
.dgp-mobile.light{--ink:#1a1b3d;--muted:#545778;--note:#ffffffc9;--line:#ffffffa0;border-color:#1a1b3d1c}
.dgp-mobile .mobile-wall{position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at 20% 15%,color-mix(in srgb,var(--accent) 80%,transparent),transparent 55%),radial-gradient(ellipse at 90% 55%,#ec48bd99,transparent 50%),radial-gradient(ellipse at 15% 95%,#7c4ddbaa,transparent 55%),linear-gradient(180deg,transparent 40%,color-mix(in srgb,var(--bg) 70%,transparent))}
.dgp-mobile.light .mobile-wall{background:radial-gradient(ellipse at 20% 15%,color-mix(in srgb,var(--accent) 38%,transparent),transparent 55%),radial-gradient(ellipse at 90% 55%,#ec48bd40,transparent 50%),radial-gradient(ellipse at 15% 95%,#7c4ddb38,transparent 55%)}
.dgp-mobile .mobile-wall-art{position:absolute;inset:0;width:100%;height:100%;z-index:-2;}.dgp-mobile.light .mobile-wall-art{}
.dgp-mobile .mobile-wall.profile-wall{background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--bg) 50%,transparent))}.dgp-mobile .mobile-wall-art.pf-color,.dgp-mobile .mobile-wall-art.pf-theme{}
.dgp-mobile .mobile-status-bar{height:${STATUS_BAR}px;display:flex;align-items:center;justify-content:space-between;padding:4px 26px 0 30px;font-size:13px;font-weight:700}
.dgp-mobile .mobile-island{width:94px;height:26px;border-radius:14px;background:#05050d;box-shadow:inset 0 0 0 1px #ffffff10}
.dgp-mobile .mobile-icons{display:flex;gap:5px;align-items:center}.dgp-mobile .mobile-battery{width:24px;height:12px;border:1.5px solid currentColor;border-radius:4px;padding:1.5px;opacity:.95}.dgp-mobile .mobile-battery i{display:block;width:72%;height:100%;border-radius:1.5px;background:currentColor}
.dgp-mobile .mobile-clock{height:${CLOCK}px;text-align:center;padding-top:8px}
.dgp-mobile .mobile-date{font-size:15px;font-weight:600;line-height:20px;opacity:.92}
.dgp-mobile .mobile-time{position:relative;display:inline-block;font-size:72px;line-height:80px;font-weight:600;letter-spacing:-2px;font-variant-numeric:tabular-nums;text-shadow:0 2px 20px #0a0d3a40}.dgp-mobile.light .mobile-time{color:#2b2d7a;text-shadow:none}
.dgp-mobile .mobile-time small{position:absolute;right:-28px;top:16px;font-size:10px;line-height:1;font-weight:700;letter-spacing:1px;opacity:.6}
.dgp-mobile .mobile-stack{position:relative;padding:0 12px;display:flex;flex-direction:column;gap:${GAP}px}
.dgp-mobile .mobile-note{position:relative;display:flex;gap:12px;padding:12px 14px;border-radius:22px;background:var(--note);backdrop-filter:blur(18px);box-shadow:0 6px 20px #0a0d3a2e}
.dgp-mobile .mobile-note.last:before,.dgp-mobile .mobile-note.last:after{content:"";position:absolute;left:12px;right:12px;top:100%;height:6px;border-radius:0 0 14px 14px;background:var(--note);opacity:.62}.dgp-mobile .mobile-note.last:after{left:26px;right:26px;top:calc(100% + 6px);opacity:.34}
.dgp-mobile .note-icon{position:relative;flex:none;width:38px;height:38px;margin-top:2px}.dgp-mobile .note-avatar,.dgp-mobile .note-art{width:38px;height:38px;border-radius:10px;background:color-mix(in srgb,var(--accent) 40%,transparent)}.dgp-mobile .note-avatar{border-radius:50%}
.dgp-mobile .note-badge{position:absolute;right:-5px;bottom:-5px;width:18px;height:18px;display:grid;place-items:center;border-radius:6px;background:var(--accent);color:#fff;font-size:9px;line-height:1;box-shadow:0 0 0 2px color-mix(in srgb,var(--bg) 60%,transparent)}.dgp-mobile .spotify .note-badge{background:#1ed760;color:#08240f}
.dgp-mobile .note-dot{position:absolute;left:-3px;top:-3px;width:12px;height:12px;border-radius:50%;border:2px solid color-mix(in srgb,var(--bg) 85%,#fff)}
.dgp-mobile .note-glyph{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#f23f43;color:#fff;font-weight:900;font-size:20px}
.dgp-mobile .note-copy{min-width:0;flex:1}
.dgp-mobile .note-head{height:16px;display:flex;justify-content:space-between;gap:8px;font-size:10px;font-weight:700;letter-spacing:.8px;color:var(--muted)}.dgp-mobile .note-head time{display:flex;align-items:center;gap:6px;font-weight:500;letter-spacing:0;white-space:nowrap}.dgp-mobile .spotify .note-head time{color:#1ed760}.dgp-mobile.light .spotify .note-head time{color:#118a3e}
.dgp-mobile .note-title{height:20px;line-height:20px;font-size:14px;font-weight:700}.dgp-mobile .note-verb{font-weight:400;color:var(--muted)}
.dgp-mobile .note-body{height:18px;line-height:18px;font-size:13px;display:flex;align-items:center;gap:5px;min-width:0}.dgp-mobile .note-body.truncate{display:block}.dgp-mobile .note-body img{flex:none;object-fit:contain}.dgp-mobile .note-body strong{font-weight:600}
.dgp-mobile .note-error{height:36px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--muted)}
.dgp-mobile .note-progress{height:24px;padding-top:6px;font-size:10px;line-height:14px;color:var(--muted);font-variant-numeric:tabular-nums}.dgp-mobile .note-progress .time-labels{margin-top:2px}.dgp-mobile .progress-track{height:4px;background:var(--line)}.dgp-mobile.light .progress-track{background:#1a1b3d1f}.dgp-mobile .progress-fill{background:var(--ink)}.dgp-mobile .spotify .progress-fill{background:#1ed760}
.dgp-mobile .mobile-dock{position:absolute;left:0;right:0;bottom:0;height:${DOCK}px;display:flex;align-items:center;justify-content:space-between;padding:0 40px 8px}
.dgp-mobile .mobile-round{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#0a0d3a59;backdrop-filter:blur(10px)}.dgp-mobile.light .mobile-round{background:#ffffff8c}
.dgp-mobile .mobile-home{position:absolute;left:50%;bottom:9px;width:128px;height:5px;margin-left:-64px;border-radius:3px;background:var(--ink);opacity:.85}
${reducedMotion([".dgp-mobile .name-effect"])}
.dgp-mobile:has(>.pf-banner)>.mobile-wall{display:none}.dgp-mobile:has(>.pf-banner) .mobile-clock,.dgp-mobile:has(>.pf-banner) .mobile-status-bar{color:#fff;text-shadow:0 1px 3px #18102f}
`;
