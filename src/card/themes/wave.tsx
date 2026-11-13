import type { CSSProperties } from "react";
import type { CardData, ActivityView } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import { activityTimer } from "@/lib/discord/time";
import { Avatar, Badges, CustomStatus, DisplayName, GuildTag, Platforms } from "../parts/identity";
import { isMissingImage } from "../parts/image-state";
import { aboutFields, BannerFill, bannerScope, ProfileEffect, profileLookCss, resolveBanner } from "../parts/profile-look";
import { aboutHeight, AboutSection, currentPresence, fullParams, PresenceTimer, ThemeError, themeStyle } from "../parts/theme-kit";
import { resolveWaveColor } from "../parts/wave-color";
import { allStyleParams, cardStyle, Equalizer, isListeningActivity, StatusText, StyleLayers } from "../styles";
import type { CardProps, ThemeDefinition } from "../types";
import { waveCss, waveLiveCss, waveMotionCss } from "./wave-css";

/**
 * Section heights shared by measure() and the component. The liquid panel's wavy top edge (EDGE) overlaps the
 * section above it, so the water appears to rise over the nameplate like the owner's original card.
 */
export const WAVE = { header: 100, platforms: 20, edge: 18, padTop: 10, padBottom: 14, row: 62, kicker: 20, title: 24, detail: 20, state: 18, timer: 24, idle: 64 } as const;

/** Art scales gently with the card: 72px at 300, 88px at the default 420, 108px at 600. */
export const waveArtSize = (width: number) => Math.min(108, Math.max(72, Math.round(width * 0.21)));

/** The same constants determine every explicit section box in both targets. Width includes the 1px border. */
export function waveLayout(data: CardData, options: CardOptions, error?: CardProps["error"]) {
  const width = Math.max(300, Math.min(600, options.width));
  const activities = options.hide_activity ? [] : data.activities.slice(0, options.max_activities);
  const visibleData = { ...data, activities };
  const presence = currentPresence(visibleData, options);
  const rows = presence.kind === "spotify" ? activities : activities.slice(1);
  const platforms = !options.hide_platforms && data.platforms.length > 0;
  const about = aboutFields(data, options);
  const aboutSize = aboutHeight(about);
  const artSize = waveArtSize(width);
  const timer = options.hide_timestamps ? null : activityTimer(presence.timestamps, data.now);
  // Spotify shows title and artist like the original card; the album stays in the art's alt text.
  const state = presence.kind === "spotify" ? null : presence.state;
  const copyHeight = WAVE.kicker + WAVE.title + (presence.detail ? WAVE.detail : 0) + (state ? WAVE.state : 0) + (timer ? WAVE.timer : 0);
  const featureHeight = presence.kind === "idle" ? WAVE.idle : Math.max(presence.image ? artSize : 0, copyHeight);
  const headerHeight = WAVE.header + (platforms ? WAVE.platforms : 0);
  // With an About section, it gains EDGE px of bottom padding so the rising wave never covers its text.
  const aboutBlock = aboutSize > 0 ? aboutSize + WAVE.edge : 0;
  const panelHeight = WAVE.edge + WAVE.padTop + featureHeight + rows.length * WAVE.row + WAVE.padBottom;
  return { width, height: error ? 202 : 2 + headerHeight + aboutBlock + panelHeight - WAVE.edge, headerHeight, about, aboutSize, aboutBlock, presence, state, rows, artSize, featureHeight, panelHeight };
}

export const waveTheme: ThemeDefinition = {
  name: "wave", label: "Wave", usesProfile: true,
  supportedParams: [...fullParams, "hide_frame", "wave_color", "ignore_app_id", ...allStyleParams],
  measure: (data, options, error) => { const { width, height } = waveLayout(data, options, error); return { width, height }; },
  Component: Wave,
};

function SpotifyGlyph() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="wave-spotify-glyph" width="15" height="15" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor" /><path d="M5 7.5Q10 5.7 15 8M5.8 10.4Q10 9 14.2 11M6.7 13.1Q10 12.1 13.3 13.6" fill="none" stroke="var(--wave-fill)" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

function Wave(raw: CardProps) {
  const { props, className, css } = cardStyle(raw, waveTheme.supportedParams);
  const { data, options, assets, error, target } = props;
  const layout = waveLayout(data, options, error);
  const p = layout.presence;
  const fill = resolveWaveColor(data, options);
  const scope = bannerScope(waveTheme.supportedParams, { nameplateFirst: true });
  const art = resolveBanner(data, options, scope);
  const featureArt = !error && p.image ? assets(p.image) : null;
  // Resolve the small art independently, including in the prefetch pass where the large art is transparent.
  const smallArt = !error && p.smallImage ? assets(p.smallImage) : null;
  const backdrop = !error && fill.image ? assets(fill.image) : null;
  const visibleArt = featureArt && !isMissingImage(featureArt);
  const base = themeStyle(data, options, layout) as Record<string, unknown>;
  const style = { ...base, "--bg": options.bg ?? (options.mode === "light" ? "#f2f3f5" : "#111214"), "--wave-fill": fill.color, "--wave-ink": fill.ink, "--wave-art-size": `${layout.artSize}px`, "--wave-w": `${layout.width}px` } as CSSProperties;
  const listening = p.kind === "spotify" || (p.kind === "activity" && layout.rows.length < data.activities.length && data.activities[0] && isListeningActivity(data.activities[0]));
  const hasArt = art.kind !== "accent" && art.kind !== "none";
  return <div className={`dgp-wave ${options.mode} ${className}${target === "live" ? " wave-live" : ""}${hasArt ? " wave-has-art" : ""}${fill.ink === "#ffffff" ? " wave-light-ink" : ""}`} style={style}>
    <style>{waveCss + profileLookCss + css + (options.animated ? waveMotionCss : "") + (target === "live" ? waveLiveCss : "")}</style>
    <StyleLayers {...props} />
    {error ? <ThemeError {...props} /> : <>
      <div className="wave-art-zone" style={{ height: layout.headerHeight + layout.aboutBlock }} aria-hidden="true"><BannerFill {...props} art={art} className="wave-header-art" /><div className="wave-header-wash" /></div>
      <header className="wave-header" style={{ height: layout.headerHeight }}>
        <Avatar {...props} />
        <div className="wave-identity">
          <div className="wave-name-row"><DisplayName {...props} /><GuildTag {...props} /><Badges {...props} /></div>
          <div className="wave-summary-line">{!options.hide_custom_status && data.customStatus && (data.customStatus.text || data.customStatus.emoji) ? <CustomStatus {...props} /> : <div className="wave-username truncate">{data.user.legacyTag ?? `@${data.user.username}`}</div>}<StatusText {...props} /></div>
          <Platforms {...props} />
        </div>
      </header>
      {layout.aboutSize > 0 && <div className="wave-about" style={{ height: layout.aboutBlock }}><AboutSection about={layout.about} height={layout.aboutSize} /></div>}
      <section className={`wave-panel wave-fill-${fill.kind}`} style={{ height: layout.panelHeight }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="wave-edge" viewBox="0 0 1200 24" preserveAspectRatio="none" aria-hidden="true"><path d="M0 12C100 0 200 0 300 12S500 24 600 12S800 0 900 12S1100 24 1200 12V24H0Z" /></svg>
        <div className="wave-panel-surface" />
        {backdrop && !isMissingImage(backdrop) && <div className="wave-art-clip"><img className="wave-art-backdrop" src={backdrop} alt="" /><div className="wave-art-scrim" /></div>}
        <div className="wave-panel-content">
          {p.kind === "idle" ? <div className="wave-idle" style={{ height: layout.featureHeight }}><span aria-hidden="true">☾</span><strong>{options.idle_text}</strong></div> : <div className="wave-feature" style={{ height: layout.featureHeight }}>
            {visibleArt && <div className="wave-feature-art"><img src={featureArt} width={layout.artSize} height={layout.artSize} alt={p.kind === "spotify" ? data.spotify?.album || p.name : p.name} />{smallArt && !isMissingImage(smallArt) && <img className="wave-small-art" src={smallArt} width="28" height="28" alt="" />}</div>}
            <div className="wave-feature-copy"><div className="wave-kicker">{p.kind === "spotify" && <SpotifyGlyph />}<span className="truncate">{p.label}</span>{listening && <Equalizer options={options} />}</div><strong className="wave-title truncate">{p.name}</strong>{p.detail && <div className="wave-detail truncate">{p.detail}</div>}{layout.state && <div className="wave-state truncate">{layout.state}</div>}<PresenceTimer {...props} timestamps={p.timestamps} /></div>
          </div>}
          {layout.rows.map((activity) => <CompactActivity key={activity.key} {...props} activity={activity} />)}
        </div>
      </section>
      <ProfileEffect {...props} width={layout.width} className="pf-underlay" />
    </>}
  </div>;
}

function CompactActivity({ activity, ...props }: CardProps & { activity: ActivityView }) {
  const image = activity.largeImage?.url ?? activity.appIcon;
  const source = image ? props.assets(image) : null;
  return <div className="wave-extra-row" style={{ height: WAVE.row }}>
    {source && !isMissingImage(source) && <img className="wave-extra-art" width="40" height="40" src={source} alt="" />}
    <div className="wave-extra-copy"><div className="wave-extra-title"><span className="truncate">{activity.verb} {activity.name}</span>{isListeningActivity(activity) && <Equalizer options={props.options} />}</div><div className="wave-extra-detail truncate">{[activity.details, activity.state].filter(Boolean).join(" · ")}</div><PresenceTimer {...props} timestamps={activity.timestamps} /></div>
  </div>;
}
