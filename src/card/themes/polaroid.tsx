import { Badges } from "../parts/identity";
import { BannerFill, bannerScope, ProfileEffect, profileLookCss, profileParams, profileSurface, resolveBanner } from "../parts/profile-look";
import type { CSSProperties } from "react";
import type { CardOptions } from "@/lib/options";
import type { CardProps, ThemeDefinition } from "../types";
import { isMissingImage } from "../parts/image-state";
import { currentPresence, smallAsset, statusLabel, themeCss } from "../parts/theme-kit";
import { cardVars, customStatus, reducedMotion, snapshotClock, staticEmojiUrl } from "./presence-kit";
import { StatusGlyph } from "../parts/status-glyph";

const MARGIN_X = 18;
const MARGIN_TOP = 24;
const MARGIN_BOTTOM = 18;
const BORDER = 18;
const CAPTION = 108;

/** A still photograph: always static, larger assets. The frame is 300–400px wide. */
export function polaroidLayout(options: Pick<CardOptions, "width">) {
  const frame = Math.min(400, Math.max(300, Math.round(options.width)));
  const photo = frame - BORDER * 2;
  return { frame, photo, frameHeight: BORDER + photo + CAPTION, width: frame + MARGIN_X * 2, height: MARGIN_TOP + BORDER + photo + CAPTION + MARGIN_BOTTOM };
}

export const polaroidTheme: ThemeDefinition = {
  usesProfile: true, name: "polaroid", label: "Polaroid",
  supportedParams: ["hide_badges", "theme", "mode", "accent", "bg", "width", "hide_decoration", "hide_status", "hide_tag", "hide_custom_status", "hide_activity", "hide_spotify", "idle_text", "show_banner", "hide_kv", "hide_nameplate", "tz", ...profileParams],
  measure: (_data, options) => { const { width, height } = polaroidLayout(options); return { width, height }; },
  Component: Polaroid,
};

function Polaroid(props: CardProps) {
  const { data, options, assets, error } = props;
  const layout = polaroidLayout(options);
  const scope = bannerScope(polaroidTheme.supportedParams);
  const art = resolveBanner(data, options, scope);
  const photoBackdrop = art.kind !== "accent" && art.kind !== "none";
  const presence = currentPresence(data, options);
  const status = presence.kind === "idle" ? customStatus(data, options) : null;
  const emoji = staticEmojiUrl(status?.emoji);
  const decoration = !options.hide_decoration ? data.user.decoration?.source.static : null;
  const avatar = assets(smallAsset(data.user.avatar.static, 512));
  const caption = presence.kind === "idle" ? status?.text || (status?.emoji ? "" : options.idle_text) : presence.text;
  const vars = { ...cardVars(data, options, layout, { dark: "#16161c", light: "#fdfcf7" }, { radius: false }), "--frame": `${layout.frame}px`, "--photo": `${layout.photo}px` } as CSSProperties;
  return <div className={`dgp-polaroid ${options.mode}`} style={vars}>
    <style>{polaroidCss + profileLookCss}</style>
    <figure className="polaroid-frame" style={{ height: layout.frameHeight, ...(error ? {} : profileSurface(data, options, scope)) }}>
      <span className="polaroid-tape" />
      <div className={`polaroid-photo${photoBackdrop ? " with-profile" : ""}`}>
        {!error && <BannerFill {...props} options={{ ...options, animated: false }} art={art} className="polaroid-profile-art" />}
        {error ? <div className="polaroid-nosignal"><span>✦</span>NO SIGNAL</div> : <>
          {!isMissingImage(avatar) && <img className="polaroid-avatar" width={layout.photo} height={layout.photo} src={avatar} alt={`${data.user.displayName}'s avatar`} />}
          {decoration && <img className="polaroid-decoration" width={layout.photo} height={layout.photo} src={assets(smallAsset(decoration, 320))} alt="Avatar decoration" />}
        </>}
        {!error && <ProfileEffect {...props} options={{ ...options, animated: false }} width={layout.photo} />}<span className="polaroid-leak" /><span className="polaroid-stamp">{snapshotClock(data.now, options.tz).stamp}</span>
      </div>
      <figcaption className="polaroid-caption">
        {error ? <><strong className="polaroid-name truncate">{error.title}</strong><span className="polaroid-line polaroid-error">{error.message}</span></> : <>
          <strong className="polaroid-name truncate" title={data.user.displayName}>{data.user.displayName}</strong>
          <span className="polaroid-line">{status?.emoji && (emoji ? <img width="18" height="18" src={assets(emoji)} alt={status.emoji.name} /> : <span>{status.emoji.name}</span>)}<span className="truncate">{caption}</span></span>
          <span className="polaroid-meta">{!options.hide_status && <><i className={`polaroid-dot sd-host ${data.status}`}><StatusGlyph data={data} /></i><span>{statusLabel(data)}</span><b>·</b></>}<span className="truncate">{data.user.legacyTag ?? `@${data.user.username}`}</span><Badges {...props} />{!options.hide_tag && data.user.guildTag && <><b>·</b><span className="polaroid-tag">{data.user.guildTag.tag}</span></>}</span>
        </>}
      </figcaption>
    </figure>
  </div>;
}

const polaroidCss = themeCss("dgp-polaroid") + `
.dgp-polaroid{--ink:#2a2638;--muted:#6f6a80;--paper:var(--bg);border:0;border-radius:0;background:transparent;padding:${MARGIN_TOP}px ${MARGIN_X}px ${MARGIN_BOTTOM}px;overflow:visible}
.dgp-polaroid.dark{--ink:#f1eee4;--muted:#a9a6b8}
.dgp-polaroid .polaroid-frame{position:relative;margin:0;width:var(--frame);padding:${BORDER}px ${BORDER}px 0;background:var(--paper);border-radius:3px;transform:rotate(-1.6deg);box-shadow:0 1px 2px #00000026,0 10px 24px #1b153d38;background-image:linear-gradient(160deg,#ffffff12,transparent 40%)}
.dgp-polaroid.light .polaroid-frame{box-shadow:0 1px 2px #00000020,0 10px 22px #2a245a2e,inset 0 0 0 1px #00000008}
.dgp-polaroid .polaroid-tape{position:absolute;z-index:3;left:50%;top:-14px;width:118px;height:28px;margin-left:-59px;transform:rotate(3deg);background:color-mix(in srgb,var(--accent) 48%,transparent);background-image:repeating-linear-gradient(90deg,#ffffff1f 0 6px,transparent 6px 12px);box-shadow:0 1px 3px #0000001f}
.dgp-polaroid .polaroid-photo{position:relative;width:var(--photo);height:var(--photo);overflow:hidden;background:radial-gradient(circle at 30% 25%,color-mix(in srgb,var(--accent) 70%,#fff),var(--accent) 45%,#2a1d6b);box-shadow:inset 0 0 0 1px #00000022}
.dgp-polaroid .polaroid-avatar{position:absolute;inset:0;width:100%;height:100%;filter:saturate(1.08) contrast(1.04) sepia(.06)}
.dgp-polaroid .with-profile .polaroid-avatar,.dgp-polaroid .with-profile .polaroid-decoration{inset:16%;width:68%;height:68%;border-radius:50%;object-fit:cover}.dgp-polaroid .polaroid-profile-art{}
.dgp-polaroid .polaroid-decoration{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:1}
.dgp-polaroid .polaroid-leak{position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 50%,transparent 58%,#1a103f40 100%),linear-gradient(125deg,#ff9a3c33,transparent 32%),linear-gradient(300deg,#ec48bd22,transparent 30%)}
.dgp-polaroid .polaroid-stamp{position:absolute;z-index:3;right:12px;bottom:10px;font:700 15px/1 "Courier New",Consolas,monospace;letter-spacing:1px;color:#ff8c2a;text-shadow:0 0 6px #ff6a00b0}
.dgp-polaroid .polaroid-nosignal{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#ffffffd0;font:800 13px/1 "Segoe UI",sans-serif;letter-spacing:3px;background:repeating-linear-gradient(0deg,#ffffff10 0 2px,transparent 2px 5px)}.dgp-polaroid .polaroid-nosignal span{font-size:44px}
.dgp-polaroid .polaroid-caption{height:${CAPTION}px;padding:12px 4px 0;display:flex;flex-direction:column;color:var(--ink)}
.dgp-polaroid .polaroid-name{display:block;height:36px;font:400 27px/36px "Segoe Print","Bradley Hand","Segoe Script","Comic Sans MS",cursive;letter-spacing:-.2px}
.dgp-polaroid .polaroid-line{height:24px;display:flex;align-items:center;gap:6px;font:400 15px/24px "Segoe Print","Bradley Hand","Comic Sans MS",cursive;color:var(--ink);opacity:.86}.dgp-polaroid .polaroid-line img{flex:none;object-fit:contain}
.dgp-polaroid .polaroid-error{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:48px;font-size:13px;line-height:24px}
.dgp-polaroid .polaroid-meta{margin-top:6px;height:18px;display:flex;align-items:center;gap:6px;font:600 11px/18px "Segoe UI",Arial,sans-serif;color:var(--muted);letter-spacing:.3px;min-width:0}.dgp-polaroid .polaroid-meta b{font-weight:400;opacity:.6}.dgp-polaroid .polaroid-meta>span{flex:none}.dgp-polaroid .polaroid-meta>span.truncate{flex:0 1 auto}
.dgp-polaroid .polaroid-dot{flex:none;width:8px;height:8px;border-radius:50%}.dgp-polaroid .polaroid-dot.online{background:#23a55a}.dgp-polaroid .polaroid-dot.idle{background:#f0b232}.dgp-polaroid .polaroid-dot.dnd{background:#f23f43}.dgp-polaroid .polaroid-dot.offline{background:#80848e}
.dgp-polaroid .polaroid-tag{font-weight:700;color:var(--ink)}
${reducedMotion([".dgp-polaroid .name-effect"])}
.dgp-polaroid:has(.pf-banner) .polaroid-leak{display:none}
`;
