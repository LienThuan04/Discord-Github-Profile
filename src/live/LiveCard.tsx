"use client";

import { useEffect, useRef, useState } from "react";
import { getTheme } from "@/card/theme-registry";
import { directAssets, type CardError } from "@/card/types";
import { useLanyard } from "@/hooks/useLanyard";
import { useProfileExtras } from "@/hooks/useProfileExtras";
import { emptyCardData, normalize } from "@/lib/lanyard/normalize";
import type { CardData } from "@/lib/lanyard/card-data";
import type { ProfileExtras } from "@/lib/discord/profile";
import type { LanyardPresence } from "@/lib/lanyard/types";
import type { PresenceError, PresenceSnapshot } from "@/lib/lanyard/socket";
import type { CardOptions } from "@/lib/options";
import { DEMO_ID, isDiscordId } from "@/lib/embed";
import { effectReplayKey } from "@/lib/studio-controls";
import styles from "./LiveCard.module.css";

export function cardError(error: PresenceError | null, hasData: boolean): CardError | undefined {
  if (error === "invalid_id") return { title: "Invalid Discord ID", message: "Use a 17–20 digit Discord user ID to create your card." };
  if (error === "not_monitored") return { title: "Your presence starts here", message: "Join discord.gg/lanyard to show your presence" };
  if (!hasData) return error ? { title: "Presence unavailable", message: "We could not reach your presence. We will keep trying automatically." } : { title: "Finding your presence", message: "Connecting to Lanyard. Your Discord presence will appear here shortly." };
}

/**
 * Normalizes the latest socket snapshot. Lanyard events never carry profile extras, so the profile
 * fetched by the server is re-attached to every update for the same user.
 */
export function liveCardData(id: string, snapshot: PresenceSnapshot, now: number, profile: ProfileExtras | null = null): CardData {
  if (!snapshot.data) return emptyCardData(isDiscordId(id) ? id : DEMO_ID, now);
  const data = normalize(snapshot.data, { now });
  return profile && snapshot.data.discord_user.id === id ? { ...data, profile } : data;
}

interface LiveCardProps {
  id: string;
  options: CardOptions;
  snapshot: PresenceSnapshot;
  initialNow: number;
  postHeight?: boolean;
  /** Server-fetched profile extras; omitted by callers that have none (e.g. Studio). */
  profile?: ProfileExtras | null;
  replay?: number;
}

/** Shared theme tree with URL assets and a fresh, deterministic normalized snapshot each second. */
export function LiveCard({ id, options, snapshot, initialNow, postHeight = false, profile = null, replay = 0 }: LiveCardProps) {
  const [now, setNow] = useState(initialNow);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setAvailableWidth(entry.contentRect.width); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const data = liveCardData(id, snapshot, now, profile);
  const error = cardError(snapshot.error, Boolean(snapshot.data));
  const theme = getTheme(options.theme);
  const size = theme.measure(data, options, error);
  const scale = Math.min(1, (availableWidth ?? size.width) / size.width);
  const height = Math.ceil(size.height * scale);
  useEffect(() => {
    if (!postHeight || window.parent === window) return;
    // No private data is sent; the receiver checks both origin and source.
    window.parent.postMessage({ type: "dgp:height", height }, "*");
  }, [height, postHeight]);
  const Component = theme.Component;
  return <div ref={viewport} className={styles.viewport}>
    <div className={styles.frame} style={{ width: size.width * scale, height }}>
      <div className={styles.card} style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}><Component key={effectReplayKey(id, options.theme, options.hide_effect, replay)} data={data} options={options} assets={directAssets} target="live" error={error} /></div>
    </div>
  </div>;
}

interface LivePresenceProps { id: string; options: CardOptions; initial: LanyardPresence | null; initialProfile?: ProfileExtras | null; initialError: PresenceError | null; initialNow: number }
export function LivePresence({ id, options, initial, initialProfile = null, initialError, initialNow }: LivePresenceProps) {
  const snapshot = useLanyard(id, { initial, initialError });
  // A cold server lookup can hit its budget before effect art resolves. Hydration picks up the warmed result.
  const incomplete = !initialProfile || !initialProfile.frame || Boolean(initialProfile.effect && !initialProfile.effect.staticUrl && !initialProfile.effect.layers?.length);
  const refreshed = useProfileExtras(id, getTheme(options.theme).usesProfile && incomplete);
  return <main className={styles.page}><span role="status" className={styles.status}>Presence connection: {snapshot.status}</span><LiveCard id={id} options={options} snapshot={snapshot} initialNow={initialNow} profile={refreshed ?? initialProfile} postHeight /></main>;
}
