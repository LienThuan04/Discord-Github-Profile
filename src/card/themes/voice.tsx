import { Badges } from "../parts/identity";
import { BannerFill, bannerScope, ProfileEffect, profileLookCss, profileParams, profileSurface, resolveBanner } from "../parts/profile-look";
import type { CSSProperties } from "react";
import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import type { CardProps, ThemeDefinition } from "../types";
import { Avatar, DisplayName, Platforms } from "../parts/identity";
import { isMissingImage } from "../parts/image-state";
import { smallAsset, statusLabel, themeCss } from "../parts/theme-kit";
import { cardStyle, Equalizer, SHAPE_PATHS, StyleLayers } from "../styles";
import { cardVars, customStatus, presenceItems, reducedMotion, staticEmojiUrl, TimerLine, TYPE_GLYPHS } from "./presence-kit";

/** A 5:3 voice tile. The avatar scales with the tile so every width keeps the same composition. */
export function voiceLayout(options: Pick<CardOptions, "width">) {
  const width = Math.round(options.width);
  const height = Math.round(width * 0.6);
  return { width, height, avatar: Math.round(height * 0.4) };
}

/** "Speaking" means visibly active: online, or doing something while not offline. */
export function voiceSpeaking(data: CardData, options: CardOptions): boolean {
  if (data.status === "offline") return false;
  return data.status === "online" || presenceItems(data, options, 1).length > 0;
}

export const voiceTheme: ThemeDefinition = {
  usesProfile: true, name: "voice", label: "Voice",
  supportedParams: ["hide_badges", "theme", "mode", "accent", "bg", "radius", "width", "animated", "name_gradient", "force_gradient", "hide_decoration", "hide_status", "hide_platforms", "hide_custom_status", "hide_activity", "hide_spotify", "hide_timestamps", "idle_text", "avatar_shape", "pattern", "effect", "border", "font", "eq_style", "show_banner", "hide_kv", "hide_nameplate", ...profileParams],
  measure: (_data, options) => { const { width, height } = voiceLayout(options); return { width, height }; },
  Component: Voice,
};

const icons = {
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z M6 11a6 6 0 0 0 12 0 M12 17v4",
  muted: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 4.5 2.6 M15 10V6a3 3 0 0 0-5.6-1.5 M6 11a6 6 0 0 0 9.6 4.8 M18 11c0 .9-.2 1.7-.5 2.5 M12 17v4 M4 4l16 16",
  deaf: "M4 15v-3a8 8 0 0 1 13.7-5.6 M20 12v3 M4 15h3v5H4z M17 15h3v5h-3z M3 3l18 18",
  off: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M5.6 5.6l12.8 12.8",
  speaker: "M4 9h4l5-4v14l-5-4H4z M16.5 8.5a5 5 0 0 1 0 7 M19 6a8.5 8.5 0 0 1 0 12",
} as const;

function Icon({ path, className }: { path: string; className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d={path} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ActivityChip(props: CardProps) {
  const { data, options, assets } = props;
  const item = presenceItems(data, options, 1)[0];
  if (item) {
    const art = item.image ? assets(smallAsset(item.image, 32)) : null;
    return <span className={`voice-chip voice-activity ${item.kind}`}>{art && !isMissingImage(art) ? <img width="16" height="16" src={art} alt="" /> : <b>{TYPE_GLYPHS[item.type] ?? "✦"}</b>}<span className="truncate">{item.name}</span>{item.type === 2 && <Equalizer options={options} />}{item.timer && item.timer.mode !== "progress" && <span className="voice-timer"><TimerLine timer={item.timer} animated={options.animated} suffix={false} /></span>}</span>;
  }
  const status = customStatus(data, options);
  const emoji = staticEmojiUrl(status?.emoji);
  return <span className="voice-chip voice-activity idle">{status?.emoji ? emoji ? <img width="16" height="16" src={assets(emoji)} alt={status.emoji.name} /> : <span>{status.emoji.name}</span> : <b>☾</b>}<span className="truncate">{status?.text || options.idle_text}</span></span>;
}

/** The speaking ring owns the ring slot and the name chip shows the status, so `ring`/`status_style` are not offered. */
function Voice(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, voiceTheme.supportedParams);
  const { data, options, assets, error } = props;
  const layout = voiceLayout(options);
  const speaking = !error && voiceSpeaking(data, options);
  const live = !error && !options.hide_activity && data.activities.some((a) => a.type === 1);
  const scope = bannerScope(voiceTheme.supportedParams);
  const art = resolveBanner(data, options, scope);
  const ambient = art.kind === "accent" ? assets(smallAsset(data.user.avatar.static, 64)) : null;
  const stateIcon = data.status === "dnd" ? icons.deaf : data.status === "idle" ? icons.muted : data.status === "offline" ? icons.off : icons.mic;
  const vars = { ...cardVars(data, options, layout, { dark: "#15183f", light: "#ecebff" }), "--avatar-size": `${layout.avatar}px`, ...(error ? {} : profileSurface(data, options, scope)) } as CSSProperties;
  return <div className={`dgp-voice ${options.mode}${options.animated ? " motion" : ""}${speaking ? " speaking" : ""} ${className}`} style={vars}>
    <style>{voiceCss + profileLookCss + css}</style>{!error && <BannerFill {...props} art={art} className="voice-profile-art" />}
    {!error && ambient && !isMissingImage(ambient) && <img className="voice-ambient" src={ambient} alt="" />}<div className="voice-shade" /><StyleLayers {...props} />
    <span className="voice-chip voice-channel"><Icon path={icons.speaker} />Presence<Badges {...props} /></span>
    {live ? <span className="voice-chip voice-live">LIVE</span> : !error && <span className="voice-platforms"><Platforms {...props} /></span>}
    {error ? <div className="voice-center"><span className="voice-error">!</span></div> : <div className="voice-center">{speaking && <svg xmlns="http://www.w3.org/2000/svg" className="voice-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path className="voice-ripple" d={SHAPE_PATHS[options.avatar_shape]} vectorEffect="non-scaling-stroke" /><path d={SHAPE_PATHS[options.avatar_shape]} vectorEffect="non-scaling-stroke" /></svg>}<Avatar {...props} options={{ ...options, hide_status: true, ring: "none" }} /></div>}
    {!error && <ProfileEffect {...props} width={layout.width} />}
    <div className="voice-bottom">
      {error ? <span className="voice-chip voice-name"><Icon path={icons.off} className="state-icon dnd" /><span className="truncate">{error.title}</span></span> : <span className="voice-chip voice-name">{!options.hide_status && <span title={statusLabel(data)}><Icon path={stateIcon} className={`state-icon ${data.status}`} /></span>}<DisplayName {...props} /></span>}
      {error ? <span className="voice-chip voice-activity idle"><span className="truncate">{error.message}</span></span> : <ActivityChip {...props} />}
    </div>
  </div>;
}

const voiceCss = themeCss("dgp-voice") + `
.dgp-voice{--ink:#ffffff;--muted:#c9cbef;--chip:#0a0c2ab8;--line:#ffffff1f;--speak:#23a55a;font-family:"Segoe UI",Arial,sans-serif;background:radial-gradient(ellipse at 50% 45%,color-mix(in srgb,var(--accent) 34%,transparent),transparent 62%),var(--bg)}
.dgp-voice.light{--ink:#191a3c;--muted:#4f5275;--chip:#ffffffd6;--line:#1a1b3d1a;--speak:#1a8f4c;background:radial-gradient(ellipse at 50% 45%,color-mix(in srgb,var(--accent) 26%,transparent),transparent 62%),radial-gradient(ellipse at 100% 100%,#ec48bd1f,transparent 50%),var(--bg)}
.dgp-voice .voice-ambient{position:absolute;inset:-25%;width:150%;height:150%;z-index:-2;filter:blur(36px) saturate(1.4);opacity:.45}.dgp-voice.light .voice-ambient{opacity:.22;filter:blur(36px) saturate(1.8) brightness(1.4)}
.dgp-voice>.voice-profile-art{z-index:-2;}.dgp-voice .voice-shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,transparent 55%,color-mix(in srgb,var(--bg) 70%,transparent))}
.dgp-voice .voice-chip{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:13px;background:var(--chip);backdrop-filter:blur(8px);font-size:12px;font-weight:600;min-width:0;white-space:nowrap}
.dgp-voice .voice-channel{position:absolute;left:12px;top:12px;color:var(--muted);font-size:11px}
.dgp-voice .voice-live{position:absolute;right:12px;top:12px;background:#f23f43;color:#fff;font-size:10px;font-weight:800;letter-spacing:1px;height:22px;border-radius:5px;padding:0 7px}
.dgp-voice .voice-platforms{position:absolute;right:12px;top:12px}.dgp-voice .platforms{height:26px;padding:0 9px;border-radius:13px;background:var(--chip);gap:7px;color:var(--muted)}.dgp-voice .platforms>span>span{display:none}
.dgp-voice .voice-center{position:absolute;left:50%;top:46%;width:var(--avatar-size);height:var(--avatar-size);margin-left:calc(var(--avatar-size) / -2);margin-top:calc(var(--avatar-size) / -2)}
.dgp-voice .avatar{border:0}
.dgp-voice .voice-ring{position:absolute;z-index:-1;left:-6px;top:-6px;width:calc(100% + 12px);height:calc(100% + 12px);overflow:visible}.dgp-voice .voice-ring path{fill:none;stroke:var(--speak);stroke-width:3.5px}
.dgp-voice .voice-ring .voice-ripple{opacity:0;stroke-width:2px;transform-box:fill-box;transform-origin:center}
.dgp-voice.motion .voice-ring .voice-ripple{animation:dgp-voice-speak 1.6s ease-out infinite}
.dgp-voice .voice-error{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;background:#f23f43;color:#fff;font-size:calc(var(--avatar-size) * .45);font-weight:900}
.dgp-voice .voice-bottom{position:absolute;left:12px;right:12px;bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;gap:8px}
.dgp-voice .voice-name{flex:0 1 auto;max-width:55%}.dgp-voice .voice-name .name-line{min-width:0}.dgp-voice .display-name{font-size:13px;line-height:18px;font-weight:700;letter-spacing:0}.dgp-voice .bot-chip{font-size:8px}
.dgp-voice .state-icon{display:block;flex:none;color:var(--speak);background:none!important}.dgp-voice .state-icon.idle{color:#f0b232}.dgp-voice .state-icon.dnd{color:#f23f43}.dgp-voice .state-icon.offline{color:#80848e}
.dgp-voice .voice-activity{flex:0 1 auto;max-width:48%;font-weight:500;color:var(--muted)}.dgp-voice .voice-activity img{flex:none;border-radius:4px;object-fit:cover}.dgp-voice .voice-activity b{color:var(--accent);font-weight:900}.dgp-voice .voice-activity.spotify b{color:#1ed760}.dgp-voice .voice-activity>span.truncate{color:var(--ink)}
.dgp-voice .voice-timer{flex:none;font-size:11px;font-variant-numeric:tabular-nums;color:var(--muted)}
@keyframes dgp-voice-speak{0%{opacity:.85;transform:scale(1)}100%{opacity:0;transform:scale(1.18)}}
${reducedMotion([".dgp-voice .voice-ripple", ".dgp-voice .name-effect"])}
.dgp-voice:has(>.pf-banner)>.voice-shade{display:none}
`;
