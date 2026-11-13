import { z } from "zod";
import { appIconUrl, appRpcUrl } from "@/lib/discord/cdn";
import type { CardData } from "./card-data";
import type { LanyardPresence } from "./types";
import { presenceSchema } from "./schema";

export const isSnowflake = (id: string): boolean => /^\d{17,20}$/.test(id);
export type PresenceResult =
  | { ok: true; data: LanyardPresence }
  | { ok: false; kind: "not_monitored"; code: string; message: string }
  | { ok: false; kind: "invalid_id" | "network_error" | "invalid_response"; message: string };

interface ClientOptions { baseUrl?: string; fetchImpl?: typeof fetch; timeoutMs?: number }

export async function fetchPresence(id: string, options: ClientOptions = {}): Promise<PresenceResult> {
  if (!isSnowflake(id)) return { ok: false, kind: "invalid_id", message: "Invalid Discord user ID (expected a 17-20 digit snowflake)." };
  try {
    const base = options.baseUrl ?? process.env.LANYARD_API_URL ?? "https://api.lanyard.rest/v1";
    const response = await (options.fetchImpl ?? fetch)(`${base.replace(/\/+$/, "")}/users/${id}`, { method: "GET", signal: AbortSignal.timeout(options.timeoutMs ?? 5000), cache: "no-store" });
    const body: unknown = await response.json();
    const failure = z.object({ success: z.literal(false), error: z.object({ code: z.string(), message: z.string() }) }).safeParse(body);
    if (failure.success && failure.data.error.code === "user_not_monitored") return { ok: false, kind: "not_monitored", ...failure.data.error };
    const parsed = z.object({ success: z.literal(true), data: presenceSchema }).safeParse(body);
    if (!response.ok || !parsed.success) return { ok: false, kind: "invalid_response", message: "Lanyard returned an unexpected response." };
    return { ok: true, data: parsed.data.data };
  } catch (error) {
    return { ok: false, kind: "network_error", message: error instanceof Error ? error.message : "Unable to reach Lanyard." };
  }
}

const appIconCache = new Map<string, string | null>();

export async function withAppIcons(data: CardData, options: ClientOptions = {}): Promise<CardData> {
  const ids = [...new Set(data.activities.filter((activity) => !activity.largeImage && activity.applicationId && isSnowflake(activity.applicationId)).map((activity) => activity.applicationId!))];
  const icons = new Map(await Promise.all(ids.map(async (id): Promise<[string, string | null]> => {
    if (appIconCache.has(id)) return [id, appIconCache.get(id)!];
    try {
      const response = await (options.fetchImpl ?? fetch)(appRpcUrl(id), { signal: AbortSignal.timeout(options.timeoutMs ?? 4000), cache: "force-cache" });
      const body = z.object({ icon: z.string().regex(/^[\w-]+$/).nullable() }).safeParse(await response.json());
      if (!response.ok || !body.success) return [id, null];
      const iconUrl = body.data.icon ? appIconUrl(id, body.data.icon) : null;
      if (appIconCache.size >= 512) appIconCache.delete(appIconCache.keys().next().value!);
      appIconCache.set(id, iconUrl);
      return [id, iconUrl];
    } catch { return [id, null]; }
  })));
  return { ...data, activities: data.activities.map((activity) => ({ ...activity, appIcon: activity.appIcon ?? icons.get(activity.applicationId ?? "") ?? null })) };
}
