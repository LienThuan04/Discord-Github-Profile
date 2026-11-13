"use client";

import { useMemo, useSyncExternalStore } from "react";
import { connectLanyard, type ConnectionOptions, type PresenceSnapshot } from "@/lib/lanyard/socket";

/** Lazy external store: one connection per mounted hook, with no render-time effects. */
export function createLanyardStore(id: string, options: ConnectionOptions = {}) {
  const initial: PresenceSnapshot = { data: options.initial?.discord_user.id === id ? options.initial : null, status: "connecting", lastUpdate: null, error: options.initialError ?? null };
  let snapshot = initial;
  const listeners = new Set<() => void>();
  let disconnect: (() => void) | undefined;
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) disconnect = connectLanyard(id, (next) => {
        snapshot = next;
        listeners.forEach((notify) => notify());
      }, options);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) { disconnect?.(); disconnect = undefined; }
      };
    },
  };
}

export function useLanyard(id: string, { initial = null, initialError = null }: Pick<ConnectionOptions, "initial" | "initialError"> = {}) {
  const store = useMemo(() => createLanyardStore(id, { initial, initialError }), [id, initial, initialError]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
