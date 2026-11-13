import type { CSSProperties } from "react";
import type { CardProps } from "../types";
import { AvatarRing, avatarShapeClass, resolveAvatarLook, StatusIndicator } from "../styles/avatar";
import { isMissingImage } from "./image-state";
import { cardBadges } from "./profile-look";

/** Avatar with decoration, honouring the `avatar_shape`, `ring` and `status_style` axes (see src/card/styles). */
export function Avatar({ data, options, assets }: CardProps) {
  const avatar = data.user.avatar;
  const decoration = data.user.decoration?.source;
  // Resolve before branching so the SVG prefetch pass still collects the decoration URL.
  const decorationSrc = !options.hide_decoration && decoration ? assets(options.animated && decoration.animated ? decoration.animated : decoration.static, "image", decoration.static) : null;
  const decorated = Boolean(decorationSrc && !isMissingImage(decorationSrc));
  const look = resolveAvatarLook(options, decorated);
  return <div className={`avatar-wrap ${avatarShapeClass(look)}`}>
    <AvatarRing data={data} look={look} />
    <img className="avatar" width="80" height="80" src={assets(options.animated && avatar.animated ? avatar.animated : avatar.static, "image", avatar.static)} alt="" />
    {decorated && <img className="decoration" width="96" height="96" src={decorationSrc!} alt="Avatar decoration" />}
    <StatusIndicator data={data} look={look} />
  </div>;
}

export function DisplayName({ data, options }: CardProps) {
  const native = data.user.nameStyle;
  const colors = options.force_gradient && options.name_gradient.length ? options.name_gradient : native?.colors.length ? native.colors : options.name_gradient;
  const style: CSSProperties = colors.length ? { backgroundImage: `linear-gradient(105deg, ${colors.length === 1 ? `${colors[0]}, ${colors[0]}` : colors.join(", ")})`, backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent" } : {};
  if (native?.fontId) style.fontFamily = native.fontId === 2 ? 'Georgia, "Times New Roman", serif' : '"Segoe UI", Arial, sans-serif';
  return <div className="name-line"><h1 className={`display-name${native?.effectId && options.animated ? " name-effect" : ""}`} style={style} title={data.user.displayName}>{data.user.displayName}</h1>{data.user.bot && <span className="bot-chip">APP</span>}</div>;
}

export function GuildTag({ data, options, assets }: CardProps) {
  const tag = data.user.guildTag;
  if (options.hide_tag || !tag) return null;
  return <span className="guild-tag">{tag.badge && <img width="16" height="16" src={assets(tag.badge)} alt="Server badge" />}<span>{tag.tag}</span></span>;
}

/** `public_flags` badges merged with the Discord profile's badges (quests, orbs, Nitro …); see `cardBadges()`. */
export function Badges({ data, options, assets }: CardProps) {
  const badges = cardBadges(data, options);
  if (!badges.length) return null;
  return <div className="badges" aria-label="Profile badges">{badges.map((badge) => <img key={badge.id} width="20" height="20" src={assets(badge.icon, "image")} title={badge.label} alt={badge.label} />)}</div>;
}

const paths: Record<string, string> = {
  desktop: "M3 3h18v12H3z M8 21h8 M12 15v6",
  web: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M2 12h20 M12 2c-5 5-5 15 0 20 M12 2c5 5 5 15 0 20",
  mobile: "M7 2h10v20H7z M10 18h4",
  embedded: "M6 7h12l4 12-6-3H8l-6 3z M6 11h6 M9 8v6 M17 10h.1 M19 13h.1",
  vr: "M3 6h18v12h-6l-3-3-3 3H3z M7 10h.1 M17 10h.1",
};
const labels: Record<string, string> = { desktop: "Desktop", web: "Web", mobile: "Mobile", embedded: "Console", vr: "VR" };
export function Platforms({ data, options }: CardProps) {
  if (options.hide_platforms || !data.platforms.length) return null;
  return <div className="platforms" aria-label="Active platforms">{data.platforms.map((platform) => <span key={platform} title={labels[platform]}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[platform]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{labels[platform]}</span></span>)}</div>;
}

export function CustomStatus({ data, options, assets }: CardProps) {
  const status = data.customStatus;
  if (options.hide_custom_status || !status || (!status.text && !status.emoji)) return null;
  const emoji = status.emoji;
  const url = emoji?.url && (!options.animated && emoji.custom ? emoji.url.replace(/\.gif(?=\?)/, ".png") : emoji.url);
  return <div className="custom-status">{emoji && (url ? <img width="20" height="20" src={assets(url, "image", emoji.custom ? url.replace(/\.gif(?=\?)/, ".png") : undefined)} alt={emoji.name} /> : <span>{emoji.name}</span>)}<span className="truncate">{status.text}</span></div>;
}
