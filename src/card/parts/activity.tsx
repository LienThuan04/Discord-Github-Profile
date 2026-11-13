import { activityTimer, formatClock } from "@/lib/discord/time";
import type { ActivityView } from "@/lib/lanyard/card-data";
import type { CardProps } from "../types";
import { Clock, Progress } from "./clock";
import { isMissingImage } from "./image-state";
import { Equalizer, isListeningActivity } from "../styles/equalizer";

export const activityRowHeight = (activity: ActivityView, collapseMissingArt = false): number => collapseMissingArt && !activity.largeImage && !activity.appIcon ? 24 + [activity.details, activity.state, activity.party].filter(Boolean).length * 18 : 82;
export const activityHeight = (activity: ActivityView, props: Pick<CardProps, "options" | "data">, collapseMissingArt = false): number => 48 + activityRowHeight(activity, collapseMissingArt) + (!props.options.hide_timestamps && activityTimer(activity.timestamps, props.data.now) ? 40 : 0) + (activity.buttons.length ? 36 : 0);

export function ActivityBlock({ activity, collapseMissingArt = false, ...props }: CardProps & { activity: ActivityView; collapseMissingArt?: boolean }) {
  const { data, options, assets } = props;
  const image = activity.largeImage?.url ?? activity.appIcon;
  const source = image ? assets(image) : null;
  const smallSource = activity.smallImage ? assets(activity.smallImage.url) : null;
  const visibleArt = source && !isMissingImage(source);
  const visibleSmallArt = smallSource && !isMissingImage(smallSource);
  const timer = !options.hide_timestamps ? activityTimer(activity.timestamps, data.now) : null;
  return <section className="activity-block" style={{ height: activityHeight(activity, props, collapseMissingArt) }}>
    <div className="section-title">{activity.title}{isListeningActivity(activity) && <Equalizer options={options} />}</div>
    <div className="activity-row" style={collapseMissingArt ? { height: activityRowHeight(activity, true) } : undefined}>{(!collapseMissingArt || visibleArt) && <div className="activity-art">{visibleArt ? <img width="64" height="64" src={source} alt={activity.largeImage?.text ?? activity.name} /> : <span className="art-placeholder">♪</span>}{visibleSmallArt && <img className="small-art" width="24" height="24" src={smallSource} alt={activity.smallImage?.text ?? ""} />}</div>}
      <div className="activity-copy"><strong className="truncate">{activity.name}</strong>{activity.details && <span className="truncate">{activity.details}</span>}{activity.state && <span className="muted truncate">{activity.state}</span>}{activity.party && <span className="muted">{activity.party}</span>}</div>
    </div>
    {timer && <div className="activity-timer">{timer.mode === "progress" ? <><Progress {...timer} animated={options.animated} /><div className="time-labels"><Clock direction="up" valueMs={timer.elapsedMs} limitMs={timer.durationMs} animated={options.animated} /><span>{formatClock(timer.durationMs / 1000)}</span></div></> : <span><Clock direction={timer.mode === "elapsed" ? "up" : "down"} valueMs={timer.mode === "elapsed" ? timer.elapsedMs : timer.remainingMs} padMinutes animated={options.animated} /> {timer.mode === "elapsed" ? "elapsed" : "remaining"}</span>}</div>}
    {activity.buttons.length > 0 && <div className="activity-buttons">{activity.buttons.map((label, index) => <span className="truncate" key={index}>{label}</span>)}</div>}
  </section>;
}

export function SpotifyBlock({ data, options, assets }: CardProps) {
  const spotify = data.spotify;
  if (!spotify || options.hide_spotify) return null;
  const albumArt = spotify.albumArt ? assets(spotify.albumArt) : null;
  const timer = activityTimer(spotify.timestamps, data.now);
  return <section className="activity-block spotify-block" style={{ height: !options.hide_timestamps && timer?.mode === "progress" ? 170 : 130 }}>
    <div className="section-title spotify-title"><span>◉</span> Listening to Spotify<Equalizer options={options} /></div>
    <div className="activity-row"><div className="activity-art">{albumArt && !isMissingImage(albumArt) ? <img width="64" height="64" src={albumArt} alt={spotify.album} /> : <span className="art-placeholder">♪</span>}</div><div className="activity-copy"><strong className="truncate">{spotify.song}</strong><span className="truncate">{spotify.artist}</span><span className="muted truncate">{spotify.album}</span></div></div>
    {!options.hide_timestamps && timer?.mode === "progress" && <div className="activity-timer"><Progress {...timer} animated={options.animated} /><div className="time-labels"><Clock direction="up" valueMs={timer.elapsedMs} limitMs={timer.durationMs} animated={options.animated} /><span>{formatClock(timer.durationMs / 1000)}</span></div></div>}
  </section>;
}
