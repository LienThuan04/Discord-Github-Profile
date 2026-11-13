import { emptyCardData, normalize } from "@/lib/lanyard/normalize";
import { fetchPresence, isSnowflake, withAppIcons } from "@/lib/lanyard/client";
import { lookupProfileExtras, type ProfileLookup } from "@/lib/discord/profile";
import { parseOptions } from "@/lib/options";
import { renderInlinedSvg } from "@/lib/svg/render";
import { finishAfterResponse, PARTIAL_CACHE, SNAPSHOT_CACHE } from "@/lib/cache-policy";
import type { CardError } from "@/card/types";
import { getTheme } from "@/card/theme-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const options = parseOptions(new URL(request.url).searchParams);
  const now = Date.now();
  let data = emptyCardData(isSnowflake(id) ? id : "983724520789655613", now);
  let error: CardError | undefined;
  // Degraded snapshots get a short edge cache so a refresh can replace them within seconds.
  let partial = false;
  if (!isSnowflake(id)) {
    error = { title: "Invalid Discord ID", message: "Use a 17–20 digit Discord user ID to create your card." };
  } else {
    // The profile provider is bounded by its own 1.5s budget and never fails the card.
    const usesProfile = getTheme(options.theme).usesProfile;
    const [result, lookup] = await Promise.all([fetchPresence(id), usesProfile ? lookupProfileExtras(id).catch((): ProfileLookup | null => null) : null]);
    // Late profile and art requests finish after the response and warm the cache for the next render.
    if (lookup && !lookup.complete) finishAfterResponse(lookup.settled);
    if (result.ok) {
      partial = usesProfile && !lookup?.complete;
      data = { ...normalize(result.data, { now }), profile: lookup?.profile ?? null };
      // Hidden and truncated activities need no RPC lookups.
      const singleActivity = ["member", "compact", "activity"].includes(options.theme);
      const maxVisible = options.hide_activity || options.theme === "badge" || (singleActivity && !options.hide_spotify && Boolean(data.spotify)) ? 0 : singleActivity ? 1 : options.max_activities;
      const visible = data.activities.slice(0, maxVisible);
      const enriched = await withAppIcons({ ...data, activities: visible });
      data = { ...data, activities: enriched.activities };
    } else {
      error = result.kind === "not_monitored"
        ? { title: "Your presence starts here", message: "Join discord.gg/lanyard to show your presence" }
        : { title: "Presence unavailable", message: "We could not reach your presence right now. Please try again shortly." };
      // An unmonitored user stays that way until they join Lanyard; an outage is transient.
      partial = result.kind !== "not_monitored";
    }
  }
  const svg = await renderInlinedSvg(data, options, error);
  return new Response(svg, { status: 200, headers: {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": partial ? PARTIAL_CACHE : SNAPSHOT_CACHE,
    "X-Content-Type-Options": "nosniff",
  } });
}
