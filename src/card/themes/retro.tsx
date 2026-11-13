import { Badges } from "../parts/identity";
import { ProfileEffect, profileLookCss, bannerTint, bannerScope as accentScope, resolveBanner as accentBanner } from "../parts/profile-look";
import type { CSSProperties } from "react";
import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import type { CardError, CardProps, ThemeDefinition } from "../types";
import { GuildTag } from "../parts/identity";
import { isMissingImage } from "../parts/image-state";
import { smallAsset, statusLabel, themeCss } from "../parts/theme-kit";
import { Clock } from "../parts/clock";
import { formatClock } from "@/lib/discord/time";
import { cardStyle, Equalizer, StyleLayers } from "../styles";
import { cardVars, customStatus, presenceItems, reducedMotion, staticEmojiUrl, TYPE_GLYPHS, type PresenceItem } from "./presence-kit";

const FRAME = 6;
const HUD = 34;
const HERO = 108;
const DIALOG = 46;
const STAGE = 96;
const STAGE_IDLE = 64;
const GAP = 10;
const FOOTER = 34;
const SEGMENT_PX = 8;

const statusWords: Record<CardData["status"], string> = { online: "READY!", idle: "PAUSED", dnd: "BOSS FIGHT", offline: "GAME OVER" };

export function retroLayout(data: CardData, options: CardOptions, error?: CardError) {
  if (error) return { item: undefined, dialog: false, height: FRAME * 2 + HUD + HERO + GAP + STAGE + FOOTER };
  const item: PresenceItem | undefined = presenceItems(data, options, 1)[0];
  const dialog = Boolean(customStatus(data, options));
  return { item, dialog, height: FRAME * 2 + HUD + HERO + (dialog ? DIALOG + GAP : 0) + (item ? STAGE : STAGE_IDLE) + GAP + FOOTER };
}

export const retroTheme: ThemeDefinition = {
  usesProfile: true, name: "retro", label: "Retro",
  supportedParams: ["banner_source", "hide_effect", "hide_badges", "theme", "mode", "accent", "bg", "width", "animated", "hide_status", "hide_tag", "hide_platforms", "hide_custom_status", "hide_activity", "hide_spotify", "hide_timestamps", "idle_text", "pattern", "eq_style"],
  measure: (data, options, error) => ({ width: options.width, height: retroLayout(data, options, error).height }),
  Component: Retro,
};

/** A segmented "energy bar": filled blocks snapshot the progress; animated runs fill it in real time. */
function Energy({ elapsedMs, durationMs, animated, segments }: { elapsedMs: number; durationMs: number; animated: boolean; segments: number }) {
  const ratio = durationMs > 0 ? Math.min(1, Math.max(0, elapsedMs / durationMs)) : 0;
  const style = { width: `${((Math.floor(ratio * segments) / segments) * 100).toFixed(2)}%`, ...(animated && durationMs > elapsedMs ? { animationName: "dgp-progress", animationDuration: `${durationMs / 1000}s`, animationDelay: `-${elapsedMs / 1000}s`, animationTimingFunction: `steps(${segments}, end)`, animationFillMode: "forwards" } : {}) } as CSSProperties;
  return <span className="retro-energy" style={{ width: segments * SEGMENT_PX }} role="img" aria-label={`${Math.round(ratio * 100)}% played`}><span className="retro-energy-fill" style={style} /></span>;
}

function Stage({ item, ...props }: CardProps & { item: PresenceItem }) {
  const { options, assets } = props;
  const art = item.image ? assets(smallAsset(item.image, 64)) : null;
  const timer = item.timer;
  return <section className={`retro-stage ${item.kind}`}>
    <div className="retro-stage-title"><span>{item.kind === "spotify" ? "♫ BGM" : `${TYPE_GLYPHS[item.type] ?? "★"} STAGE 1`}{item.type === 2 && <Equalizer options={options} />}</span><span className="truncate">{item.title.toUpperCase()}</span></div>
    <div className="retro-stage-row">
      {art && !isMissingImage(art) ? <img className="retro-art" width="48" height="48" src={art} alt={item.imageAlt} /> : <span className="retro-art retro-art-fallback">{TYPE_GLYPHS[item.type] ?? "★"}</span>}
      <div className="retro-stage-copy"><strong className="truncate">{item.name}</strong><span className="truncate">{item.lines[0] ?? item.verb}</span>
        <span className="retro-time">{timer ? timer.mode === "progress" ? <><Energy {...timer} animated={options.animated} segments={options.width < 380 ? 9 : 16} /><Clock direction="up" valueMs={timer.elapsedMs} limitMs={timer.durationMs} animated={options.animated} /><span>/{formatClock(timer.durationMs / 1000)}</span></> : <>{timer.mode === "elapsed" ? "TIME" : "LEFT"} <Clock direction={timer.mode === "elapsed" ? "up" : "down"} valueMs={timer.mode === "elapsed" ? timer.elapsedMs : timer.remainingMs} padMinutes animated={options.animated} /></> : <span>{item.lines[1] ?? "CONTINUE?"}</span>}</span>
      </div>
    </div>
  </section>;
}

function Retro(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, retroTheme.supportedParams);
  const { data, options, assets, error } = props;
  const tint = options.accent === "#5865f2" ? bannerTint(accentBanner(data, options, accentScope(["banner_source"])), data) : null;
  const layout = retroLayout(data, options, error);
  const status = customStatus(data, options);
  const emoji = staticEmojiUrl(status?.emoji);
  const lives = !options.hide_platforms ? Math.min(5, data.platforms.length) : 0;
  return <div className={`dgp-retro ${options.mode}${options.animated ? " motion" : ""} ${className}`} style={cardVars(data, { ...options, ...(tint ? { accent: tint } : {}) }, { width: options.width, height: layout.height }, { dark: "#140f36", light: "#f3efff" }, { radius: false })}>
    <style>{retroCss + profileLookCss + css}</style><StyleLayers {...props} />
    <div className="retro-frame">
      <header className="retro-hud"><span className="retro-p1">PLAYER 1</span>{!options.hide_status && !error && <span className={`retro-word ${data.status}`} title={statusLabel(data)}>{statusWords[data.status]}</span>}{error && <span className="retro-word dnd">ERROR</span>}</header>
      {error ? <>
        <div className="retro-hero retro-error"><span className="retro-skull">✖</span><div className="retro-id"><strong className="retro-name truncate">{error.title}</strong><span className="retro-user">{error.message}</span></div></div>
        <section className="retro-stage retro-continue"><div className="retro-stage-title"><span>★ CONTINUE?</span><span>9</span></div><div className="retro-stage-row"><div className="retro-stage-copy"><strong>JOIN DISCORD.GG/LANYARD</strong><span>THEN PRESS START</span></div></div></section>
      </> : <>
        <div className="retro-hero">
          <div className="retro-avatar"><img width="80" height="80" src={assets(smallAsset(data.user.avatar.static, 32))} alt="" /></div>
          <div className="retro-id">
            <strong className="retro-name truncate" title={data.user.displayName}>{data.user.displayName}</strong>
            <div className="retro-meta"><span className="retro-user truncate">{data.user.legacyTag ?? `@${data.user.username}`}</span><GuildTag {...props} /></div>
            <div className="retro-stats" title={data.platforms.join(", ")}><Badges {...props} />{lives > 0 && <><span className="retro-lv">LIVES</span><span className="retro-lives">{"♥".repeat(lives)}</span></>}</div>
          </div>
        </div>
        {layout.dialog && status && <div className="retro-dialog">{status.emoji && (emoji ? <img width="16" height="16" src={assets(emoji)} alt={status.emoji.name} /> : <span>{status.emoji.name}</span>)}<span className="truncate">{status.text}</span><i className="retro-next">▼</i></div>}
        {layout.item ? <Stage {...props} item={layout.item} /> : <section className="retro-stage retro-idle"><div className="retro-stage-title"><span>☾ IDLE</span><span>INSERT COIN</span></div><div className="retro-idle-text truncate">{options.idle_text}</div></section>}
      </>}
      <footer className="retro-footer"><span className="retro-start">PRESS START</span><span>© LANYARD ARCADE</span></footer>
    </div>
    {!error && <ProfileEffect {...props} width={options.width} />}
  </div>;
}

const retroCss = themeCss("dgp-retro") + `
.dgp-retro{--ink:#fbf7ff;--muted:#b2a9e6;--panel:#221a55;--hud:#ffd23f;--shadow:#ec48bd;--px:4px;border:0;border-radius:0!important;padding:${FRAME}px;font:700 12px/1.25 Consolas,"Lucida Console","Courier New",monospace;letter-spacing:.5px}
.dgp-retro.light{--ink:#1d1546;--muted:#5a5185;--panel:#ffffff;--hud:#b5179e;--shadow:#ffb3e6}
.dgp-retro:after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,#00000038 0 1px,transparent 1px 3px);z-index:5}.dgp-retro.light:after{background:repeating-linear-gradient(0deg,#3b2a8a12 0 1px,transparent 1px 3px)}
.dgp-retro.motion:after{animation:dgp-retro-roll 7s linear infinite}
.dgp-retro .retro-frame{position:relative;height:100%;padding:0 14px;background:radial-gradient(ellipse at 50% 0%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 65%);box-shadow:0 calc(var(--px) * -1) 0 0 var(--accent),0 var(--px) 0 0 var(--accent),calc(var(--px) * -1) 0 0 0 var(--accent),var(--px) 0 0 0 var(--accent),inset 0 0 0 var(--px) color-mix(in srgb,var(--accent) 22%,transparent)}
.dgp-retro .retro-hud{height:${HUD}px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11px;letter-spacing:2px;border-bottom:var(--px) dotted color-mix(in srgb,var(--accent) 50%,transparent)}
.dgp-retro .retro-p1{color:var(--hud)}.dgp-retro.motion .retro-p1{animation:dgp-retro-blink 1.4s steps(1,end) infinite}
.dgp-retro .retro-word{padding:2px 6px;color:#0b0820;background:#3dff8f}.dgp-retro .retro-word.idle{background:#ffd23f}.dgp-retro .retro-word.dnd{background:#ff4d6d;color:#fff}.dgp-retro .retro-word.offline{background:#8e8aa8;color:#fff}
.dgp-retro .retro-hero{height:${HERO}px;display:flex;align-items:center;gap:16px}
.dgp-retro .retro-avatar{flex:none;width:80px;height:80px;margin:0 4px;background:var(--panel);box-shadow:0 calc(var(--px) * -1) 0 0 var(--ink),0 var(--px) 0 0 var(--ink),calc(var(--px) * -1) 0 0 0 var(--ink),var(--px) 0 0 0 var(--ink),calc(var(--px) * 2) calc(var(--px) * 2) 0 0 var(--shadow)}
.dgp-retro .retro-avatar img{width:80px;height:80px;image-rendering:pixelated}
.dgp-retro .retro-id{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}
.dgp-retro .retro-name{font-size:21px;line-height:28px;text-transform:uppercase;letter-spacing:1px;color:var(--ink);text-shadow:3px 3px 0 var(--shadow)}
.dgp-retro .retro-meta{height:20px;display:flex;align-items:center;gap:8px;min-width:0}.dgp-retro .retro-user{color:var(--muted);font-size:11px}
.dgp-retro .guild-tag{border-radius:0;border:2px solid var(--muted);height:20px;font-size:10px}.dgp-retro .guild-tag img{image-rendering:pixelated}
.dgp-retro .retro-stats{height:18px;display:flex;gap:14px;align-items:center;font-size:11px;letter-spacing:2px}.dgp-retro .retro-lives{color:#ff4d6d}.dgp-retro .retro-lv{color:var(--hud)}
.dgp-retro .retro-dialog{height:${DIALOG}px;margin-bottom:${GAP}px;display:flex;align-items:center;gap:8px;padding:0 14px;background:var(--panel);font-size:13px;box-shadow:0 calc(var(--px) * -1) 0 0 var(--ink),0 var(--px) 0 0 var(--ink),calc(var(--px) * -1) 0 0 0 var(--ink),var(--px) 0 0 0 var(--ink);margin-left:4px;margin-right:4px}
.dgp-retro .retro-dialog img{flex:none;image-rendering:pixelated;object-fit:contain}.dgp-retro .retro-next{margin-left:auto;font-style:normal;font-size:9px;color:var(--hud)}.dgp-retro.motion .retro-next{animation:dgp-retro-blink .9s steps(1,end) infinite}
.dgp-retro .retro-stage{height:${STAGE}px;margin:0 4px;padding:8px 12px;background:var(--panel);box-shadow:0 calc(var(--px) * -1) 0 0 var(--accent),0 var(--px) 0 0 var(--accent),calc(var(--px) * -1) 0 0 0 var(--accent),var(--px) 0 0 0 var(--accent)}
.dgp-retro .retro-stage.retro-idle{height:${STAGE_IDLE}px}.dgp-retro .retro-stage.spotify{--accent:#1ed760}
.dgp-retro .retro-stage-title{height:18px;display:flex;justify-content:space-between;gap:10px;font-size:10px;letter-spacing:1.5px;color:var(--hud)}.dgp-retro .retro-stage-title>span:first-child{flex:none;display:flex;align-items:center;gap:6px}
.dgp-retro .retro-stage-row{margin-top:6px;display:flex;gap:12px;align-items:center}.dgp-retro .retro-art{flex:none;width:48px;height:48px;image-rendering:pixelated;box-shadow:0 0 0 2px var(--ink)}.dgp-retro .retro-art-fallback{display:grid;place-items:center;background:var(--accent);color:#fff;font-size:22px}
.dgp-retro .retro-stage-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:1px;font-size:11px;line-height:16px}.dgp-retro .retro-stage-copy strong{font-size:13px;line-height:18px;text-transform:uppercase}.dgp-retro .retro-stage-copy>span{color:var(--muted)}
.dgp-retro .retro-time{display:flex!important;align-items:center;gap:6px;height:18px;color:var(--ink)!important;font-variant-numeric:tabular-nums}
.dgp-retro .retro-energy{position:relative;flex:none;height:10px;background:repeating-linear-gradient(90deg,color-mix(in srgb,var(--ink) 18%,transparent) 0 6px,transparent 6px 8px)}
.dgp-retro .retro-energy-fill{position:absolute;left:0;top:0;bottom:0;background:repeating-linear-gradient(90deg,var(--accent) 0 6px,transparent 6px 8px)}
.dgp-retro .retro-idle-text{margin-top:8px;font-size:13px;line-height:20px;color:var(--ink)}
.dgp-retro .retro-footer{position:absolute;left:14px;right:14px;bottom:0;height:${FOOTER}px;display:flex;align-items:center;justify-content:space-between;font-size:9px;letter-spacing:1.5px;color:var(--muted)}.dgp-retro .retro-start{color:var(--hud)}.dgp-retro.motion .retro-start{animation:dgp-retro-blink 1.8s steps(1,end) infinite}
.dgp-retro .retro-error .retro-user{font-size:11px;line-height:15px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.dgp-retro .retro-skull{flex:none;display:grid;place-items:center;width:80px;height:80px;margin:0 4px;background:#ff4d6d;color:#fff;font-size:40px}.dgp-retro .retro-continue{height:${STAGE}px}
@keyframes dgp-retro-blink{50%{opacity:0}}@keyframes dgp-retro-roll{to{background-position:0 30px}}
${reducedMotion([".dgp-retro .retro-p1", ".dgp-retro .retro-next", ".dgp-retro .retro-start", ".dgp-retro:after"])}
`;
