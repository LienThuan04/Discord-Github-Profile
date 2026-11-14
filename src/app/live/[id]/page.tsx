import type { Metadata } from "next";
import { fetchPresence } from "@/lib/lanyard/client";
import { fetchProfileExtras, presenceCosmetics } from "@/lib/discord/profile";
import { isDiscordId, parseCardOptions } from "@/lib/embed";
import { getTheme } from "@/card/theme-registry";
import type { QueryInput } from "@/lib/options";
import { LivePresence } from "@/live/LiveCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live Discord presence", robots: { index: false, follow: false } };

export default async function LivePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Exclude<QueryInput, URLSearchParams>> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const options = parseCardOptions(query);
  // The WebSocket never carries profile extras, so the server fetches them once, beside the presence.
  const presence = fetchPresence(id);
  const [result, profile] = await Promise.all([presence, isDiscordId(id) && getTheme(options.theme).usesProfile ? fetchProfileExtras(id, { declared: presence.then(presenceCosmetics) }).catch(() => null) : null]);
  // eslint-disable-next-line react-hooks/purity -- A request-time server timestamp seeds deterministic hydration.
  const initialNow = Date.now();
  return <LivePresence id={id} options={options} initial={result.ok ? result.data : null} initialProfile={result.ok ? profile : null} initialError={result.ok ? null : result.kind === "not_monitored" ? "not_monitored" : result.kind === "invalid_id" ? "invalid_id" : "unavailable"} initialNow={initialNow} />;
}
