import type { CSSProperties, ReactNode } from "react";
import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions, OptionName } from "@/lib/options";
import { activityTimer, formatClock } from "@/lib/discord/time";
import type { CardProps, CardSize } from "../types";
import { ActivityBlock, activityHeight, SpotifyBlock } from "./activity";
import { CustomStatus } from "./identity";
import { Clock, Progress } from "./clock";
import { isMissingImage } from "./image-state";
import { Equalizer } from "../styles/equalizer";
import { StatusText } from "../styles/avatar";
import { aboutFields, BannerFill, profileParams, type AboutFields, type BannerArt } from "./profile-look";

export const identityParams = ["theme", "mode", "accent", "bg", "radius", "width", "animated", "name_gradient", "force_gradient", "hide_decoration", "hide_status"] as const satisfies readonly OptionName[];
export const summaryParams = ["hide_activity", "hide_spotify", "hide_custom_status", "idle_text"] as const satisfies readonly OptionName[];
export const fullParams = [...identityParams, ...summaryParams, "max_activities", "show_banner", "hide_nameplate", "hide_tag", "hide_badges", "hide_platforms", "hide_timestamps", "hide_kv", ...profileParams] as const satisfies readonly OptionName[];

export function themeStyle(data: CardData, options: CardOptions, size: CardSize): CSSProperties {
  return { width: size.width, height: size.height, "--accent": options.accent === "#5865f2" ? data.kv.accent ?? options.accent : options.accent, "--bg": options.bg ?? (options.mode === "light" ? "#f1f0ff" : "#0a0d3a"), "--radius": `${options.radius}px` } as CSSProperties;
}

/** Downsize only Discord's size-aware CDN URLs; other providers retain their signed path. */
export function smallAsset(url: string, size: number): string {
  return url.startsWith("https://cdn.discordapp.com/") ? url.replace(/([?&])size=\d+/, `$1size=${size}`) : url;
}

export function staticIdentity(props: CardProps): CardProps {
  const user = props.data.user;
  return { ...props, options: { ...props.options, animated: false }, data: { ...props.data, user: { ...user, avatar: { static: smallAsset(user.avatar.static, 64) }, decoration: user.decoration ? { ...user.decoration, source: { static: smallAsset(user.decoration.source.static, 96) } } : null } } };
}

export function statusLabel(data: CardData): string {
  return data.status === "dnd" ? "Do not disturb" : data.status.charAt(0).toUpperCase() + data.status.slice(1);
}

/** Spotify wins when active; hide controls are applied before choosing a fallback. */
export function currentPresence(data: CardData, options: CardOptions) {
  if (!options.hide_spotify && data.spotify) {
    const s = data.spotify;
    return { kind: "spotify", label: "Listening to Spotify", text: `Listening to ${s.song}`, name: s.song, detail: s.artist, state: s.album, image: s.albumArt, smallImage: null, timestamps: s.timestamps, buttons: [] as string[] };
  }
  const a = !options.hide_activity ? data.activities[0] : null;
  if (a) return { kind: "activity", label: a.title, text: `${a.verb} ${a.name}`, name: a.name, detail: a.details, state: a.state, image: a.largeImage?.url ?? a.appIcon, smallImage: a.smallImage?.url ?? null, timestamps: a.timestamps, buttons: a.buttons };
  const custom = !options.hide_custom_status ? data.customStatus : null;
  return { kind: "idle", label: "Taking a breather", text: custom?.text || custom?.emoji?.name || (options.hide_status ? options.idle_text : statusLabel(data)), name: custom?.text || options.idle_text, detail: null, state: null, image: null, smallImage: null, timestamps: null, buttons: [] as string[] };
}

export function Summary({ data, options, assets }: CardProps) {
  const presence = currentPresence(data, options);
  const emoji = presence.kind === "idle" && !options.hide_custom_status ? data.customStatus?.emoji : null;
  const emojiUrl = emoji?.url ? emoji.custom ? emoji.url.replace(/\.gif(?=\?|$)/, ".png") : emoji.url : null;
  const image = presence.smallImage ?? presence.image ?? emojiUrl;
  const source = image ? assets(smallAsset(image, 32)) : null;
  const listening = presence.kind === "spotify" || (presence.kind === "activity" && data.activities[0]?.type === 2);
  // An idle summary may already be the status label; never print it twice.
  const statusText = options.status_style === "text" && !options.hide_status && presence.text !== statusLabel(data);
  return <div className="summary">{statusText && <><StatusText data={data} options={options} /><span className="sx-sep" aria-hidden="true">·</span></>}{source && !isMissingImage(source) && <img width="18" height="18" src={source} alt="" />}<span className="truncate">{presence.text}</span>{listening && <Equalizer options={options} />}</div>;
}

export function sectionsLayout(data: CardData, options: CardOptions) {
  const activities = options.hide_activity ? [] : data.activities.slice(0, options.max_activities);
  const spotify = !options.hide_spotify && data.spotify;
  const custom = !options.hide_custom_status && Boolean(data.customStatus?.text || data.customStatus?.emoji);
  const about = aboutFields(data, options);
  const kv = Boolean(about.bio || about.pronouns || about.location || about.website);
  const kvHeight = aboutHeight(about);
  const idle = activities.length === 0 && !spotify;
  const heights = [custom ? 44 : 0, kvHeight, ...activities.map((a) => activityHeight(a, { data, options }, true)), spotify ? (!options.hide_timestamps && activityTimer(spotify.timestamps, data.now)?.mode === "progress" ? 170 : 130) : 0, idle ? 50 : 0].filter(Boolean);
  return { activities, spotify, custom, kv, kvHeight, about, idle, height: heights.reduce((sum, n) => sum + n, 0) + Math.max(0, heights.length - 1) * 12 };
}

/** Height of the about section (bio clamped to two lines, then pronouns/location and website rows). */
export function aboutHeight(about: AboutFields): number {
  return about.bio || about.pronouns || about.location || about.website ? 24 + (about.bio ? 48 : 0) + (about.pronouns || about.location ? 24 : 0) + (about.website ? 24 : 0) : 0;
}

/** Bio (KV, else Discord "About me"), pronouns · location and website. */
export function AboutSection({ about, height }: { about: AboutFields; height: number }) {
  return <section className="kv" style={{ height }}>
    {about.bio && <p className="bio">{about.bio}</p>}
    {(about.pronouns || about.location) && <div className="muted truncate kv-line">{[about.pronouns, about.location].filter(Boolean).join(" · ")}</div>}
    {about.website && <div className="website truncate kv-line">↗ {about.website.label}</div>}
  </section>;
}

export function ContentSections(props: CardProps) {
  const { data, options } = props;
  const layout = sectionsLayout(data, options);
  return <div className="content-sections">
    {layout.custom && <CustomStatus {...props} />}
    {layout.kv && <AboutSection about={layout.about} height={layout.kvHeight} />}
    {layout.activities.map((activity) => <ActivityBlock {...props} activity={activity} collapseMissingArt key={activity.key} />)}
    <SpotifyBlock {...props} />
    {layout.idle && <div className="idle-state"><span className="idle-spark">✦</span><span className="truncate">{options.idle_text}</span></div>}
  </div>;
}

/**
 * Full-bleed backdrop for nitro/glass: the resolved profile banner (see `resolveBanner`), else the avatar for
 * `accent`, else nothing for `none`.
 */
export function Backdrop(props: CardProps & { art: BannerArt }) {
  const { art, data, assets } = props;
  if (art.kind === "none") return null;
  if (art.kind === "accent") return <img className="backdrop-art" src={assets(data.user.avatar.static)} alt="" />;
  return <BannerFill {...props} className="backdrop-art" />;
}

export function PresenceTimer({ timestamps, ...props }: CardProps & { timestamps: { start?: number; end?: number } | null }) {
  const timer = props.options.hide_timestamps ? null : activityTimer(timestamps, props.data.now);
  if (!timer) return null;
  return <div className="presence-timer">{timer.mode === "progress" ? <><Progress {...timer} animated={props.options.animated} /><div className="time-labels"><Clock direction="up" valueMs={timer.elapsedMs} limitMs={timer.durationMs} animated={props.options.animated} /><span>{formatClock(timer.durationMs / 1000)}</span></div></> : <span><Clock direction={timer.mode === "elapsed" ? "up" : "down"} valueMs={timer.mode === "elapsed" ? timer.elapsedMs : timer.remainingMs} animated={props.options.animated} padMinutes /> {timer.mode === "elapsed" ? "elapsed" : "remaining"}</span>}</div>;
}

export function ThemeError({ error }: CardProps) {
  return error ? <div className="theme-error"><span>✦</span><h1>{error.title}</h1><p>{error.message}</p></div> : null;
}

export function ThemeFooter({ children }: { children?: ReactNode }) {
  return <footer className="theme-footer"><span>◈</span>{children ?? "DISCORD PRESENCE"}<span className="footer-credit">Powered by Lanyard</span></footer>;
}

/** Shared primitives, scoped anew for each composition. Clocks retain the shared part's keyframe names. */
export function themeCss(scope: string): string {
  const s = `.${scope}`;
  return `
${s}{--ink:#f6f5ff;--muted:#bdc1e8;--panel:#1e2353;--line:#c7caff25;position:relative;isolation:isolate;box-sizing:border-box;overflow:hidden;background:var(--bg);border:1px solid var(--line);border-radius:var(--radius);color:var(--ink);font:13px/1.4 "Segoe UI",Arial,sans-serif}
${s}.light{--ink:#20204a;--muted:#56577d;--panel:#e6e6ff;--line:#454b9a26}
${s} *{box-sizing:border-box}${s} img{display:block;object-fit:cover}${s} .truncate{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}${s} .muted{color:var(--muted)}
${s} .avatar-wrap{position:relative;flex:none;width:var(--avatar-size,64px);height:var(--avatar-size,64px);isolation:isolate}${s} .avatar{width:100%;height:100%;border-radius:50%;background:var(--panel);border:3px solid var(--bg)}${s} .decoration{position:absolute;inset:-10%;width:120%;height:120%;pointer-events:none}${s} .status-dot{position:absolute;bottom:0;right:0;width:18px;height:18px;border:4px solid var(--bg);border-radius:50%}
${s} .online{background:#23a55a}${s} .idle{background:#f0b232}${s} .dnd{background:#f23f43}${s} .offline{background:#80848e}${s} .status-dot.dnd:after{content:"";position:absolute;left:2px;top:4px;width:6px;height:2px;background:var(--bg)}
${s} .name-line{display:flex;align-items:center;gap:6px;min-width:0}${s} .display-name{font-size:24px;font-weight:900;line-height:1.2;letter-spacing:-.5px;margin:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}${s} .name-effect{background-size:200% 100%;animation:dgp-name 8s ease-in-out infinite alternate}${s} .bot-chip{padding:1px 4px;border-radius:4px;background:var(--accent);color:white;font-size:9px;font-weight:800}
${s}:not(.light) .display-name[style*="background-image"]{filter:brightness(1.4) saturate(.85)}
${s} .guild-tag{display:inline-flex;gap:4px;align-items:center;flex:none;border:1px solid var(--line);border-radius:7px;padding:2px 5px;font-size:10px;font-weight:700}${s} .guild-tag img{object-fit:contain}${s} .badges{display:flex;gap:4px;overflow:hidden;align-items:center}${s} .badges img{object-fit:contain;flex:none}${s} .platforms{display:flex;gap:10px;height:24px;align-items:center;font-size:10px;color:var(--muted);overflow:hidden}${s} .platforms>span{display:inline-flex;gap:4px;align-items:center;flex:none}
${s} .content-sections{display:flex;flex-direction:column;gap:12px}${s} .custom-status{height:44px;display:flex;gap:8px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}${s} .custom-status img{object-fit:contain;flex:none}${s} .kv{padding:12px 0;border-top:1px solid var(--line);overflow:hidden}${s} .bio{margin:0 0 8px;height:40px;line-height:20px;white-space:pre-line;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}${s} .kv-line{height:24px;line-height:24px}${s} .website{color:var(--muted)}
${s} .activity-block{border:1px solid var(--line);background:var(--panel);border-radius:16px;padding:12px;overflow:hidden}${s} .section-title{height:22px;line-height:16px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}${s} .activity-row{height:82px;display:flex;gap:12px;align-items:flex-start}${s} .activity-art{width:64px;height:64px;position:relative;flex:none}${s} .activity-art>img{border-radius:10px}${s} .activity-art .small-art{position:absolute;bottom:-4px;right:-4px;border:3px solid var(--panel);border-radius:50%}${s} .art-placeholder{display:grid;place-items:center;width:64px;height:64px;border-radius:10px;background:var(--accent);color:#fff;font-size:28px}
${s} .activity-copy{min-width:0;display:flex;flex-direction:column;gap:2px;font-size:11px;line-height:16px;flex:1}${s} .activity-copy strong{font-size:13px;line-height:18px}${s} .activity-timer{height:40px;color:var(--muted);font-size:10px;line-height:16px;font-variant-numeric:tabular-nums}${s} .activity-buttons{height:32px;display:flex;gap:6px}${s} .activity-buttons>span{min-width:0;flex:1;background:var(--line);border-radius:8px;padding:7px;text-align:center;font-size:10px;font-weight:600}${s} .spotify-title{color:#74e9a6}${s}.light .spotify-title{color:#176b40}${s} .time-labels{display:flex;justify-content:space-between;margin-top:5px}${s} .progress-track{height:4px;overflow:hidden;border-radius:4px;background:var(--line)}${s} .progress-fill{height:4px;border-radius:4px;background:var(--accent)}${s} .spotify-block .progress-fill{background:#23a55a}
${s} .clock{display:inline-grid;line-height:16px;height:16px;vertical-align:bottom;font-variant-numeric:tabular-nums}${s} .clock-running,${s} .clock-final{grid-area:1/1;display:inline-flex}${s} .clock-running{animation:dgp-hide 0s var(--run) forwards}${s} .clock-final{visibility:hidden;animation:dgp-show 0s var(--run) forwards}${s} .clock-window{height:16px;overflow:hidden;display:inline-block}${s} .clock-reel{display:flex;flex-direction:column;animation-name:dgp-reel;animation-iteration-count:infinite}${s} .clock-reel>span{display:block;height:16px;line-height:16px;flex:none;text-align:right}
${s} .idle-state{height:50px;display:flex;gap:10px;align-items:center;padding:12px;background:var(--panel);border-radius:14px;color:var(--muted);font-size:11px}${s} .idle-spark{color:#ec48bd;font-size:22px}${s} .summary{display:flex;align-items:center;gap:6px;min-width:0;color:var(--muted);font-size:12px}${s} .summary img{flex:none;border-radius:5px;object-fit:contain}${s} .theme-footer{height:42px;display:flex;align-items:center;gap:6px;font-size:8px;letter-spacing:1px;color:var(--muted)}${s} .theme-footer>span:first-child{font-size:14px;color:var(--accent)}${s} .footer-credit{margin-left:auto;letter-spacing:0;font-size:9px}${s} .theme-error{height:200px;padding:28px 20px;text-align:center;display:flex;flex-direction:column;justify-content:center;overflow:hidden}${s} .theme-error>span{color:#ec48bd;font-size:26px}${s} .theme-error h1{margin:6px 0;font-size:20px;font-weight:900;overflow-wrap:anywhere}${s} .theme-error p{margin:0;color:var(--muted);font-size:12px;line-height:18px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}${s} .backdrop-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;pointer-events:none}
@keyframes dgp-progress{from{width:0%}to{width:100%}}@keyframes dgp-reel{to{transform:translateY(calc(var(--rows) * -16px))}}@keyframes dgp-hide{to{visibility:hidden}}@keyframes dgp-show{to{visibility:visible}}@keyframes dgp-name{to{background-position:100% 0}}
`;
}
