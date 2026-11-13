import { ProfileEffect, profileLookCss, bannerTint, bannerScope as accentScope, resolveBanner as accentBanner } from "../parts/profile-look";
import { aboutFields, cardBadges } from "../parts/profile-look";
import type { ReactNode } from "react";
import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import type { CardError, CardProps, ThemeDefinition } from "../types";
import { smallAsset, statusLabel, themeCss } from "../parts/theme-kit";
import { cardStyle, Equalizer, StyleLayers } from "../styles";
import { cardVars, customStatus, presenceItems, reducedMotion, staticEmojiUrl, TimerLine, TYPE_GLYPHS, type PresenceItem } from "./presence-kit";

const LINE = 18;
const TITLE = 32;
const PAD_Y = 12 + 14;
const AVATAR = 72;
const platformNames: Record<string, string> = { desktop: "desktop", web: "web", mobile: "mobile", embedded: "console", vr: "vr" };

interface InfoLine { key: string; label: string; value: ReactNode }

function infoLines(props: CardProps): InfoLine[] {
  const { data, options, assets } = props;
  const lines: InfoLine[] = [];
  const about = aboutFields(data, options);
  const badges = cardBadges(data, options);
  if (!options.hide_status) lines.push({ key: "status", label: "status", value: <><i className={`term-dot ${data.status}`} />{statusLabel(data).toLowerCase()}</> });
  const custom = customStatus(data, options);
  if (custom) {
    const emoji = staticEmojiUrl(custom.emoji);
    lines.push({ key: "custom", label: "custom", value: <>{custom.emoji && (emoji ? <img className="term-emoji" width="14" height="14" src={assets(emoji)} alt={custom.emoji.name} /> : <span>{custom.emoji.name} </span>)}{custom.text ? `"${custom.text}"` : ""}</> });
  }
  if (!options.hide_tag && data.user.guildTag) lines.push({ key: "tag", label: "tag", value: data.user.guildTag.tag });
  if (!options.hide_platforms && data.platforms.length) lines.push({ key: "client", label: "client", value: data.platforms.map((p) => platformNames[p]).join(", ") });
  if (badges.length) lines.push({ key: "badges", label: "badges", value: <span className="term-badges">{badges.map((b) => <img key={b.id} width="14" height="14" src={assets(b.icon)} alt={b.label} title={b.label} />)}</span> });
  if (about.pronouns) lines.push({ key: "pronouns", label: "pronouns", value: about.pronouns });
  if (about.bio) lines.push({ key: "bio", label: "bio", value: about.bio });
  if (!options.hide_kv && data.kv.location) lines.push({ key: "where", label: "where", value: data.kv.location });
  return lines;
}

const itemLines = (item: PresenceItem) => 1 + item.lines.length + (item.timer ? 1 : 0);

export function terminalLayout(data: CardData, options: CardOptions, error?: CardError) {
  if (error) return { info: 0, block: 0, items: [] as PresenceItem[], height: TITLE + PAD_Y + LINE * 6 + 6 };
  // Two header lines (name, rule) and the palette swatches frame the variable info rows.
  const info = 3 + countInfo(data, options);
  const block = Math.max(AVATAR, info * LINE);
  const items = presenceItems(data, options);
  const output = items.length ? items.reduce((sum, item) => sum + itemLines(item), 0) : 1;
  return { info, block, items, height: TITLE + PAD_Y + LINE + 6 + block + 8 + LINE + output * LINE + LINE };
}

function countInfo(data: CardData, options: CardOptions): number {
  const about = aboutFields(data, options);
  return [!options.hide_status, Boolean(customStatus(data, options)), !options.hide_tag && Boolean(data.user.guildTag), !options.hide_platforms && data.platforms.length > 0, cardBadges(data, options).length > 0, Boolean(about.bio), Boolean(about.pronouns), !options.hide_kv && Boolean(data.kv.location)].filter(Boolean).length;
}

export const terminalTheme: ThemeDefinition = {
  usesProfile: true, name: "terminal", label: "Terminal",
  supportedParams: ["banner_source", "hide_effect", "hide_badges", "theme", "mode", "accent", "bg", "radius", "width", "animated", "hide_status", "hide_tag", "hide_badges", "hide_platforms", "hide_custom_status", "hide_activity", "hide_spotify", "hide_timestamps", "hide_kv", "max_activities", "idle_text", "pattern", "effect", "border", "eq_style"],
  measure: (data, options, error) => ({ width: options.width, height: terminalLayout(data, options, error).height }),
  Component: Terminal,
};

function Prompt({ children }: { children: ReactNode }) {
  return <div className="term-line"><span className="term-prompt">❯</span> {children}</div>;
}

function Output({ item, animated, options }: { item: PresenceItem; animated: boolean; options: CardOptions }) {
  const rows = [...item.lines.map((line, index) => <span className={`truncate${index ? " term-dim" : ""}`} key={index}>{line}</span>), ...(item.timer ? [<span className={`term-timer ${item.timer.mode}`} key="timer"><TimerLine timer={item.timer} animated={animated} /></span>] : [])];
  return <div className={`term-item ${item.kind}`}>
    <div className="term-line"><span className="term-kind">{TYPE_GLYPHS[item.type] ?? "✦"} {item.kind === "spotify" ? "spotify" : item.verb.split(" ")[0]!.toLowerCase()}</span><strong className="truncate">{item.name}</strong>{item.type === 2 && <Equalizer options={options} />}</div>
    {rows.map((row, index) => <div className="term-line term-branch" key={index}><span className="term-tree">{index === rows.length - 1 ? "└─" : "├─"}</span>{row}</div>)}
  </div>;
}

function Terminal(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, terminalTheme.supportedParams);
  const { data, options, assets, error } = props;
  const tint = options.accent === "#5865f2" ? bannerTint(accentBanner(data, options, accentScope(["banner_source"])), data) : null;
  const layout = terminalLayout(data, options, error);
  const user = data.user.username;
  return <div className={`dgp-terminal ${options.mode}${options.animated ? " motion" : ""} ${className}`} style={cardVars(data, { ...options, ...(tint ? { accent: tint } : {}) }, { width: options.width, height: layout.height }, { dark: "#0b0c24", light: "#fbfbff" })}>
    <style>{terminalCss + profileLookCss + css}</style><StyleLayers {...props} />
    <header className="term-title"><span className="term-lights"><i /><i /><i /></span><span className="truncate">{user}@discord: ~/presence</span><span className="term-size">zsh</span></header>
    <div className="term-body">
      {error ? <>
        <Prompt>discord status --user <span className="term-arg">{user}</span></Prompt>
        <div className="term-line term-error truncate">✖ error: {error.title}</div>
        <div className="term-message">{error.message}</div>
        <div className="term-line term-dim">hint: join discord.gg/lanyard, then retry</div>
      </> : <>
        <Prompt>discord status --user <span className="term-arg">{user}</span></Prompt>
        <div className="term-fetch" style={{ height: layout.block }}>
          <img className="term-avatar sx-float" width={AVATAR} height={AVATAR} src={assets(smallAsset(data.user.avatar.static, 128))} alt="" />
          <div className="term-info">
            <div className="term-line"><strong className="term-name truncate">{data.user.displayName}</strong><span className="term-dim truncate">{data.user.legacyTag ?? `@${user}`}</span></div>
            <div className="term-line term-rule" aria-hidden="true">{"─".repeat(60)}</div>
            {infoLines(props).map((line) => <div className="term-line" key={line.key}><span className="term-key">{line.label}</span><span className="term-value truncate">{line.value}</span></div>)}
            <div className="term-line term-swatches" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
        </div>
        <Prompt>discord activity --now</Prompt>
        {layout.items.length ? layout.items.map((item) => <Output item={item} animated={options.animated} options={options} key={item.key} />) : <div className="term-line term-dim truncate">(idle) {options.idle_text}</div>}
      </>}
      <div className="term-line"><span className="term-prompt">❯</span> <span className="term-cursor" /></div>
    </div>
    {!error && <ProfileEffect {...props} width={options.width} />}
  </div>;
}


const terminalCss = themeCss("dgp-terminal") + `
.dgp-terminal{--ink:#dfe2ff;--muted:#8d93c7;--panel:#151838;--line:#a3a8ff26;--key:#00b0f4;--prompt:#35ed7e;--magenta:#ec48bd;font:12px/${LINE}px ui-monospace,"Cascadia Mono",Consolas,Menlo,"Courier New",monospace;box-shadow:inset 0 0 0 1px #ffffff08}
.dgp-terminal.light{--ink:#24264d;--muted:#6a6e98;--panel:#ececfa;--line:#2b2f7a22;--key:#006ce7;--prompt:#118a3e;--magenta:#c42a96}
.dgp-terminal .term-title{height:${TITLE}px;display:flex;align-items:center;gap:10px;padding:0 12px;background:var(--panel);border-bottom:1px solid var(--line);color:var(--muted);font-size:11px}
.dgp-terminal .term-title>.truncate{flex:1;text-align:center}.dgp-terminal .term-size{flex:none;width:44px;text-align:right;font-size:10px;letter-spacing:.5px}
.dgp-terminal .term-lights{flex:none;width:44px;display:flex;gap:6px}.dgp-terminal .term-lights i{width:10px;height:10px;border-radius:50%;background:#f23f43}.dgp-terminal .term-lights i:nth-child(2){background:#f0b232}.dgp-terminal .term-lights i:nth-child(3){background:#23a55a}
.dgp-terminal .term-body{padding:12px 16px 14px}
.dgp-terminal .term-line{height:${LINE}px;display:flex;align-items:center;gap:8px;min-width:0;white-space:nowrap;overflow:hidden}
.dgp-terminal .term-prompt{color:var(--prompt);font-weight:700}.dgp-terminal .term-arg{color:var(--key)}.dgp-terminal .term-dim{color:var(--muted)}
.dgp-terminal .term-fetch{display:flex;gap:14px;margin:6px 0 8px;align-items:flex-start}
.dgp-terminal .term-avatar{flex:none;width:${AVATAR}px;height:${AVATAR}px;border-radius:10px;background:var(--panel);box-shadow:0 0 0 1px var(--line),4px 4px 0 color-mix(in srgb,var(--accent) 55%,transparent)}
.dgp-terminal .term-info{min-width:0;flex:1}
.dgp-terminal .term-name{color:color-mix(in srgb,var(--accent) 55%,#fff);font-weight:700;flex:0 1 auto}.dgp-terminal.light .term-name{color:var(--accent)}
.dgp-terminal .term-rule{color:var(--line);display:block;color:color-mix(in srgb,var(--accent) 45%,transparent)}
.dgp-terminal .term-key{flex:none;width:8ch;color:var(--key)}.dgp-terminal .term-value{display:block;flex:1}.dgp-terminal .term-value img,.dgp-terminal .term-value i{vertical-align:-2px}
.dgp-terminal .term-dot{display:inline-block;flex:none;width:8px;height:8px;border-radius:50%;margin-right:7px}.dgp-terminal .term-dot.online{background:#23a55a}.dgp-terminal .term-dot.idle{background:#f0b232}.dgp-terminal .term-dot.dnd{background:#f23f43}.dgp-terminal .term-dot.offline{background:#80848e}
.dgp-terminal .term-emoji{display:inline-block;flex:none;object-fit:contain;margin-right:6px}.dgp-terminal .term-badges{display:inline-flex;gap:4px;vertical-align:-2px}.dgp-terminal .term-badges img{object-fit:contain}
.dgp-terminal .term-swatches{gap:0}.dgp-terminal .term-swatches i{width:14px;height:12px;background:#5865f2}.dgp-terminal .term-swatches i:nth-child(2){background:#7c4ddb}.dgp-terminal .term-swatches i:nth-child(3){background:#ec48bd}.dgp-terminal .term-swatches i:nth-child(4){background:#f23f43}.dgp-terminal .term-swatches i:nth-child(5){background:#f0b232}.dgp-terminal .term-swatches i:nth-child(6){background:#35ed7e}.dgp-terminal .term-swatches i:nth-child(7){background:#00b0f4}.dgp-terminal .term-swatches i:nth-child(8){background:var(--ink)}
.dgp-terminal .term-kind{flex:none;color:var(--magenta);font-weight:700}.dgp-terminal .term-item.spotify .term-kind{color:#1ed760}.dgp-terminal.light .term-item.spotify .term-kind{color:#118a3e}.dgp-terminal .term-item strong{font-weight:700}
.dgp-terminal .term-branch{padding-left:2ch}.dgp-terminal .term-tree{flex:none;color:var(--muted)}
.dgp-terminal .term-timer{color:var(--muted);font-variant-numeric:tabular-nums;min-width:0;flex:1}.dgp-terminal .term-timer.progress .timer-progress{display:flex;align-items:center;gap:10px}.dgp-terminal .term-timer .progress-track{width:120px;flex:none;height:8px;border-radius:0;background:repeating-linear-gradient(90deg,var(--line) 0 6px,transparent 6px 8px)}
.dgp-terminal .term-timer .progress-fill{height:8px;border-radius:0;background:repeating-linear-gradient(90deg,var(--prompt) 0 6px,transparent 6px 8px)}.dgp-terminal .term-timer .time-labels{margin:0;gap:4px;justify-content:flex-start}.dgp-terminal .term-timer .time-labels>span:last-child:before{content:"/ "}

.dgp-terminal .term-error{color:#f23f43;font-weight:700}.dgp-terminal .term-message{height:${LINE * 3}px;white-space:normal;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;padding-left:2ch;color:var(--ink)}
.dgp-terminal .term-cursor{display:inline-block;width:8px;height:15px;background:var(--prompt)}.dgp-terminal.motion .term-cursor{animation:dgp-terminal-blink 1.1s steps(1,end) infinite}
@keyframes dgp-terminal-blink{50%{opacity:0}}
${reducedMotion([".dgp-terminal .term-cursor"])}
`;
