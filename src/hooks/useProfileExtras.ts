"use client";

import { useEffect, useState } from "react";
import type { ProfileExtras } from "@/lib/discord/profile";
import { isDiscordId } from "@/lib/embed";

const requests = new Map<string, Promise<ProfileExtras | null>>();

/** Share one request per ID across option changes and React Strict Mode subscriptions. */
export function requestProfile(id: string, fetchImpl: typeof fetch = fetch): Promise<ProfileExtras | null> {
  if (!isDiscordId(id)) return Promise.resolve(null);
  let pending = requests.get(id);
  if (!pending) {
    pending = fetchImpl(`/api/${id}/profile`).then(async (response) => response.ok ? (await response.json()).profile as ProfileExtras | null : null).catch(() => null);
    if (requests.size >= 50) requests.delete(requests.keys().next().value!);
    requests.set(id, pending);
  }
  return pending;
}

export function useProfileExtras(id: string, enabled: boolean): ProfileExtras | null {
  const [result, setResult] = useState<{ id: string; profile: ProfileExtras | null } | null>(null);
  useEffect(() => {
    if (!enabled || !isDiscordId(id)) return;
    let active = true;
    void requestProfile(id).then((profile) => { if (active) setResult({ id, profile }); });
    return () => { active = false; };
  }, [id, enabled]);
  return enabled && result?.id === id ? result.profile : null;
}
