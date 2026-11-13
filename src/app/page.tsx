import { CardStudio } from "@/components/studio/CardStudio";
import { DEMO_ID, isDiscordId, parseCardOptions } from "@/lib/embed";
import { fetchPresence } from "@/lib/lanyard/client";
import { fetchProfileExtras } from "@/lib/discord/profile";
import { getTheme } from "@/card/theme-registry";
import type { QueryInput } from "@/lib/options";

export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<Exclude<QueryInput, URLSearchParams>> }) {
  const query = await searchParams;
  const candidate = Array.isArray(query.id) ? query.id[0] : query.id;
  const id = candidate && isDiscordId(candidate) ? candidate : DEMO_ID;
  const options = parseCardOptions(query);
  const [result, profile] = await Promise.all([fetchPresence(id), getTheme(options.theme).usesProfile ? fetchProfileExtras(id).catch(() => null) : null]);
  // eslint-disable-next-line react-hooks/purity -- A request-time server timestamp seeds deterministic hydration.
  const initialNow = Date.now();
  return <CardStudio initialId={id} initialOptions={options} initial={result.ok ? result.data : null} initialProfile={result.ok ? profile : null} initialError={result.ok ? null : result.kind === "not_monitored" ? "not_monitored" : "unavailable"} initialNow={initialNow} configuredSiteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""} />;
}
