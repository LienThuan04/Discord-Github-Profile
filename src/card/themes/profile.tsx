import type { CSSProperties } from "react";
import type { CardData } from "@/lib/lanyard/card-data";
import { OPTION_NAMES, type CardOptions } from "@/lib/options";
import type { CardProps, ThemeDefinition } from "../types";
import { Avatar, Badges, CustomStatus, DisplayName, GuildTag, Platforms } from "../parts/identity";
import { ActivityBlock, activityHeight, SpotifyBlock } from "../parts/activity";
import { activityTimer } from "@/lib/discord/time";
import { profileCss } from "./profile-css";
import { cardStyle, StatusText, StyleLayers } from "../styles";
import { AboutSection, aboutHeight } from "../parts/theme-kit";
import { aboutFields, BannerFill, bannerScope, ProfileEffect, profileLookCss, profileSurface, resolveBanner } from "../parts/profile-look";
import { StatusGlyph } from "../parts/status-glyph";

export function profileLayout(data: CardData, options: CardOptions) {
  const activities = options.hide_activity ? [] : data.activities.slice(0, options.max_activities);
  const spotify = !options.hide_spotify && data.spotify;
  const custom = !options.hide_custom_status && Boolean(data.customStatus?.text || data.customStatus?.emoji);
  const about = aboutFields(data, options);
  const kvHeight = aboutHeight(about);
  const kv = kvHeight > 0;
  const platforms = !options.hide_platforms && data.platforms.length > 0;
  const idle = activities.length === 0 && !spotify;
  const sections = [custom ? 44 : 0, kvHeight, ...activities.map((activity) => activityHeight(activity, { data, options }, true)), spotify ? (!options.hide_timestamps && activityTimer(data.spotify!.timestamps, data.now)?.mode === "progress" ? 170 : 130) : 0, idle ? 50 : 0].filter(Boolean);
  return { activities, spotify, custom, kv, kvHeight, about, platforms, idle, height: 96 + 152 + (platforms ? 24 : 0) + sections.reduce((sum, value) => sum + value, 0) + Math.max(0, sections.length - 1) * 12 + 38 };
}

function Profile(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, profileTheme.supportedParams);
  const { data, options, error } = props;
  const layout = profileLayout(data, options);
  const scope = bannerScope(profileTheme.supportedParams);
  const art = resolveBanner(data, options, scope);
  const accent = options.accent === "#5865f2" ? data.kv.accent ?? options.accent : options.accent;
  const variables = { "--accent": accent, "--bg": options.bg ?? (options.mode === "light" ? "#f5f5ff" : "#10143e"), "--radius": `${options.radius}px`, width: options.width, height: error ? 286 : layout.height, ...(error ? {} : profileSurface(data, options, scope)) } as CSSProperties;
  return <div className={`dgp-profile ${options.mode} ${className}`} style={variables}>
    <style>{profileCss + profileLookCss + css}</style><StyleLayers {...props} />
    <div className={`banner banner-${art.kind}`}>
      {art.kind === "accent" ? <><span className="banner-orb" /><span className="banner-wordmark">DISCORD PRESENCE</span></> : <BannerFill {...props} art={art} className="banner-fill" />}
    </div>
    {error ? <div className="error-state"><span className="error-symbol">✦</span><h1>{error.title}</h1><p>{error.message}</p></div> : <>
      <div className="identity" style={{ height: 152 + (layout.platforms ? 24 : 0) }}>
        <Avatar {...props} /><DisplayName {...props} />
        <div className="username truncate">{data.user.legacyTag ?? `@${data.user.username}`}<StatusText {...props} separator /></div>
        <div className="identity-chips"><GuildTag {...props} /><Badges {...props} /></div>
        <Platforms {...props} />
      </div>
      <div className="profile-sections">
        {layout.custom && <CustomStatus {...props} />}
        {layout.kv && <AboutSection about={layout.about} height={layout.kvHeight} />}
        {layout.activities.map((activity) => <ActivityBlock {...props} activity={activity} collapseMissingArt key={activity.key} />)}
        <SpotifyBlock {...props} />
        {layout.idle && <div className="idle-state">{!options.hide_status && <span className={`mini-dot sd-host ${data.status}`}><StatusGlyph data={data} /></span>}<span className="truncate">{options.idle_text}</span></div>}
      </div>
    </>}
    {!error && <ProfileEffect {...props} width={options.width} />}
    <div className="card-footer"><span className="footer-mark">◈</span><span>{error ? "Discord · Powered by Lanyard" : `${options.hide_status ? "Discord presence" : data.status === "dnd" ? "Do not disturb" : data.status.charAt(0).toUpperCase() + data.status.slice(1)} · Powered by Lanyard`}</span><span className="footer-spark">✦</span></div>
  </div>;
}

export const profileTheme: ThemeDefinition = {
  name: "profile", label: "Profile", supportedParams: OPTION_NAMES.filter((name) => name !== "tz" && name !== "wave_color"), usesProfile: true,
  measure: (data, options, error) => ({ width: options.width, height: error ? 286 : profileLayout(data, options).height }),
  Component: Profile,
};
