import { BannerFill, bannerScope, ProfileEffect, profileLookCss, profileParams, profileSurface, resolveBanner } from "../parts/profile-look";
import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import type { CardError, CardProps, ThemeDefinition } from "../types";
import { Avatar, Badges, DisplayName, GuildTag, Platforms } from "../parts/identity";
import { isMissingImage } from "../parts/image-state";
import { smallAsset, staticIdentity, statusLabel, themeCss } from "../parts/theme-kit";
import { allStyleParams, cardStyle, Equalizer, StatusText, StyleLayers } from "../styles";
import { cardVars, customStatus, emojiUrl, itemColor, presenceItems, reducedMotion, snapshotClock, TimerLine, type PresenceItem } from "./presence-kit";

const BAR = 40;
const PAD_TOP = 14;
const PAD_BOTTOM = 16;
const HEAD = 46;
const GAP = 8;
const REACTIONS = 26;

function embedHeight(item: Pick<PresenceItem, "lines" | "timer" | "image" | "buttons">): number {
  const timer = item.timer ? (item.timer.mode === "progress" ? 30 : 20) : 0;
  const text = 16 + 20 + item.lines.length * 18 + timer;
  return 22 + Math.max(text, item.image ? 56 : 0) + (item.buttons.length ? 40 : 0);
}

export function chatLayout(data: CardData, options: CardOptions, error?: CardError) {
  if (error) return { items: [], reactions: false, height: BAR + PAD_TOP + HEAD + GAP + 74 + PAD_BOTTOM };
  const items = presenceItems(data, options);
  const reactions = !options.hide_platforms && data.platforms.length > 0;
  const content = HEAD + items.reduce((sum, item) => sum + GAP + embedHeight(item), 0) + (reactions ? GAP + REACTIONS : 0);
  return { items, reactions, height: BAR + PAD_TOP + Math.max(40, content) + PAD_BOTTOM };
}

export const chatTheme: ThemeDefinition = {
  usesProfile: true, name: "chat", label: "Chat",
  supportedParams: ["theme", "mode", "accent", "bg", "radius", "width", "animated", "name_gradient", "force_gradient", "hide_decoration", "hide_status", "hide_tag", "hide_badges", "hide_platforms", "hide_custom_status", "hide_activity", "hide_spotify", "hide_timestamps", "max_activities", "idle_text", "show_banner", "hide_kv", "hide_nameplate", "tz", ...profileParams, ...allStyleParams],
  measure: (data, options, error) => ({ width: options.width, height: chatLayout(data, options, error).height }),
  Component: Chat,
};

function Embed({ item, ...props }: CardProps & { item: PresenceItem }) {
  const { assets, options } = props;
  const art = item.image ? assets(smallAsset(item.image, 64)) : null;
  const small = item.smallImage ? assets(smallAsset(item.smallImage, 32)) : null;
  return <section className={`chat-embed ${item.kind}`} style={{ height: embedHeight(item), borderLeftColor: itemColor(item) }}>
    <div className="embed-main">
      <div className="embed-copy">
        <div className="embed-provider"><span className="truncate">{item.title}</span>{item.type === 2 && <Equalizer options={options} />}</div>
        <div className="embed-title truncate">{item.name}</div>
        {item.lines.map((line, index) => <div className={`embed-line truncate${index > 0 ? " muted" : ""}`} key={index}>{line}</div>)}
        {item.timer && <div className={`embed-timer ${item.timer.mode}`}><TimerLine timer={item.timer} animated={options.animated} /></div>}
      </div>
      {art && !isMissingImage(art) && <div className="embed-thumb"><img width="56" height="56" src={art} alt={item.imageAlt} />{small && !isMissingImage(small) && <img className="embed-small" width="20" height="20" src={small} alt="" />}</div>}
    </div>
    {item.buttons.length > 0 && <div className="embed-buttons">{item.buttons.map((label, index) => <span className="truncate" key={index}>{label}<i>↗</i></span>)}</div>}
  </section>;
}

function Body(props: CardProps & { hasItems: boolean }) {
  const { data, options, assets, hasItems } = props;
  const status = customStatus(data, options);
  if (status) {
    const emoji = emojiUrl(status.emoji, false);
    return <div className="chat-body">{status.emoji && (emoji ? <img width="18" height="18" src={assets(emoji.url, "image", emoji.fallback)} alt={status.emoji.name} /> : <span>{status.emoji.name}</span>)}<span className="truncate">{status.text}</span></div>;
  }
  const quiet = hasItems ? (options.hide_status ? "Sharing what I'm up to right now" : `Currently ${statusLabel(data).toLowerCase()}`) : options.idle_text;
  return <div className="chat-body quiet"><span className="truncate">{quiet}</span></div>;
}

function Chat(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, chatTheme.supportedParams);
  const { data, options, error } = props;
  const layout = chatLayout(data, options, error);
  const clock = snapshotClock(data.now, options.tz);
  const scope = bannerScope(chatTheme.supportedParams);
  const art = resolveBanner(data, options, scope);
  return <div className={`dgp-chat ${options.mode}${options.width < 360 ? " narrow" : ""} ${className}`} style={{ ...cardVars(data, options, { width: options.width, height: layout.height }, { dark: "#171a42", light: "#ffffff" }), ...(error ? {} : profileSurface(data, options, scope)) }}>
    <style>{chatCss + profileLookCss + css}</style>{!error && <BannerFill {...props} art={art} className="chat-profile-art" />}<StyleLayers {...props} />
    <header className="chat-bar"><span className="chat-hash">#</span><strong>presence</strong><span className="chat-divider" /><span className="chat-topic truncate">Live status, straight from Discord</span></header>
    {error ? <div className="chat-message">
      <div className="chat-system">!</div>
      <div className="chat-content"><div className="chat-head"><span className="chat-author">Lanyard</span><span className="bot-chip">APP</span><time>Today at {clock.time}{clock.zone ? ` ${clock.zone}` : ""}</time></div><div className="chat-body quiet"><span className="truncate">Presence unavailable</span></div>
        <section className="chat-embed error" style={{ height: 74 }}><div className="embed-title truncate">{error.title}</div><div className="embed-error">{error.message}</div></section></div>
    </div> : <div className="chat-message">
      <Avatar {...staticIdentity(props)} />
      <div className="chat-content">
        <div className="chat-head"><DisplayName {...props} /><GuildTag {...props} /><Badges {...props} /><StatusText {...props} /><time>Today at {clock.time}{clock.zone ? ` ${clock.zone}` : ""}</time></div>
        <Body {...props} hasItems={layout.items.length > 0} />
        {layout.items.map((item) => <Embed {...props} item={item} key={item.key} />)}
        {layout.reactions && <div className="chat-reactions"><Platforms {...props} /></div>}
      </div>
    </div>}
    {!error && <ProfileEffect {...props} width={options.width} />}
  </div>;
}

const chatCss = themeCss("dgp-chat") + `
.dgp-chat{--ink:#f2f3ff;--muted:#a9aed6;--panel:#20244f;--line:#c7caff1f;--bar:#12153a;--role:color-mix(in srgb,var(--accent) 45%,#fff);--link:#00b0f4;font-family:"Segoe UI","gg sans",Arial,sans-serif}
.dgp-chat.light{--ink:#232543;--muted:#5d6080;--panel:#f2f3fb;--line:#2e33701c;--bar:#f6f6fd;--role:color-mix(in srgb,var(--accent) 88%,#000);--link:#006ce7}
.dgp-chat>.chat-profile-art{z-index:-1;}
.dgp-chat .chat-bar{height:${BAR}px;display:flex;align-items:center;gap:8px;padding:0 16px;background:var(--bar);border-bottom:1px solid var(--line);font-size:13px}
.dgp-chat .chat-hash{font-size:22px;line-height:1;font-weight:400;color:var(--muted);margin-top:-2px}.dgp-chat .chat-bar strong{font-weight:700;flex:none}.dgp-chat .chat-divider{width:1px;height:18px;background:var(--line);flex:none;margin:0 2px}.dgp-chat .chat-topic{color:var(--muted);font-size:12px}
.dgp-chat .chat-message{display:flex;gap:14px;padding:${PAD_TOP}px 16px ${PAD_BOTTOM}px;background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 9%,transparent),transparent 70%)}
.dgp-chat .avatar-wrap{--avatar-size:40px;margin-top:3px}.dgp-chat .avatar{border:0}.dgp-chat .status-dot{width:14px;height:14px;border-width:3px;right:-2px;bottom:-2px}.dgp-chat .status-dot.dnd:after{width:4px;left:2px;top:3px}
.dgp-chat .chat-system{flex:none;width:40px;height:40px;margin-top:3px;border-radius:50%;display:grid;place-items:center;background:#f23f43;color:#fff;font-weight:900;font-size:20px}
.dgp-chat .chat-content{min-width:0;flex:1}
.dgp-chat .chat-head{height:22px;display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden}.dgp-chat .chat-head .name-line{min-width:64px;flex:0 1 auto}.dgp-chat .chat-head .sx-status-text{font-size:11px}
.dgp-chat .display-name,.dgp-chat .chat-author{font-size:15px;line-height:22px;font-weight:700;letter-spacing:0;color:var(--role)}.dgp-chat .chat-head time{flex:0 40 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;margin-left:2px;color:var(--muted);font-size:11px;white-space:nowrap}
.dgp-chat .guild-tag{height:18px;padding:0 5px;border-radius:5px;background:var(--panel);font-size:10px}.dgp-chat .badges img{width:16px;height:16px}.dgp-chat .badges{flex:0 20 auto;min-width:0;max-width:72px;flex-wrap:wrap;height:16px}.dgp-chat .guild-tag{flex:none}
.dgp-chat .chat-body{height:22px;margin-top:2px;display:flex;align-items:center;gap:6px;font-size:14px;line-height:22px}.dgp-chat .chat-body img{flex:none;object-fit:contain}.dgp-chat .chat-body.quiet{color:var(--muted);font-style:italic;font-size:13px}
.dgp-chat .chat-embed{margin-top:${GAP}px;padding:10px 12px 12px;border-radius:4px;border-left:4px solid var(--accent);background:var(--panel);overflow:hidden}
.dgp-chat .chat-embed.error{border-left-color:#f23f43}.dgp-chat .embed-error{font-size:12px;line-height:17px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dgp-chat .embed-main{display:flex;gap:12px;align-items:flex-start}.dgp-chat .embed-copy{min-width:0;flex:1}
.dgp-chat .embed-provider{height:16px;line-height:16px;font-size:11px;color:var(--muted);font-weight:600;display:flex;align-items:center;gap:6px;min-width:0}.dgp-chat .chat-embed.spotify .embed-provider{color:#1ed760}.dgp-chat.light .chat-embed.spotify .embed-provider{color:#118a3e}.dgp-chat .embed-title{height:20px;line-height:20px;font-size:14px;font-weight:700;color:var(--ink)}.dgp-chat .embed-line{height:18px;line-height:18px;font-size:12px}
.dgp-chat .embed-timer{color:var(--muted);font-size:11px;line-height:16px;font-variant-numeric:tabular-nums}.dgp-chat .embed-timer.elapsed,.dgp-chat .embed-timer.remaining{height:20px;padding-top:4px}.dgp-chat .embed-timer.progress{height:30px;padding-top:8px}.dgp-chat .embed-timer .time-labels{margin-top:3px;height:16px}
.dgp-chat .progress-track{height:4px;background:var(--line)}.dgp-chat .progress-fill{background:var(--accent)}.dgp-chat .chat-embed.spotify .progress-fill{background:#1ed760}
.dgp-chat .embed-thumb{position:relative;flex:none;width:56px;height:56px}.dgp-chat .embed-thumb>img:first-child{width:56px;height:56px;border-radius:6px}.dgp-chat .embed-small{position:absolute;right:-5px;bottom:-5px;width:20px;height:20px;border-radius:50%;border:2px solid var(--panel)}
.dgp-chat .embed-buttons{height:30px;margin-top:10px;display:flex;gap:6px}.dgp-chat .embed-buttons>span{flex:1;min-width:0;height:30px;line-height:30px;padding:0 8px;border-radius:4px;background:color-mix(in srgb,var(--ink) 12%,transparent);font-size:11px;font-weight:600;text-align:center}.dgp-chat .embed-buttons i{font-style:normal;margin-left:4px;color:var(--muted)}
.dgp-chat .chat-reactions{margin-top:${GAP}px;height:${REACTIONS}px}.dgp-chat .platforms{height:${REACTIONS}px;gap:6px}.dgp-chat .platforms>span{height:24px;padding:0 8px;border-radius:8px;border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--ink);font-size:11px;font-weight:600}.dgp-chat .platforms svg{width:13px;height:13px;color:var(--role)}.dgp-chat.narrow .platforms>span>span{display:none}.dgp-chat.narrow .chat-message{gap:10px;padding-left:12px;padding-right:12px}
${reducedMotion([".dgp-chat .name-effect"])}
.dgp-chat:has(>.pf-banner) .chat-head,.dgp-chat:has(>.pf-banner) .chat-body{color:#fff;--muted:#fff;text-shadow:0 1px 3px #18102f}.dgp-chat:has(>.pf-banner) .chat-head{--role:#fff}.dgp-chat:has(>.pf-banner) .guild-tag{background:#18102fcc;border-color:#ffffff2e;color:#fff;text-shadow:none}
`;
