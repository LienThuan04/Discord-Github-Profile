import { emptyCardData, normalize } from "@/lib/lanyard/normalize";
import { fetchPresence, isSnowflake, withAppIcons } from "@/lib/lanyard/client";
import { fetchProfileExtras } from "@/lib/discord/profile";
import { parseOptions } from "@/lib/options";
import { renderInlinedSvg } from "@/lib/svg/render";
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
  if (!isSnowflake(id)) {
    error = { title: "Invalid Discord ID", message: "Use a 17–20 digit Discord user ID to create your card." };
  } else {
    // The profile provider is bounded by its own 1.5s budget and never fails the card.
    const [result, profile] = await Promise.all([fetchPresence(id), getTheme(options.theme).usesProfile ? fetchProfileExtras(id).catch(() => null) : null]);
    if (result.ok) {
      data = { ...normalize(result.data, { now }), profile };
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
    }
  }
  const svg = await renderInlinedSvg(data, options, error);
  return new Response(svg, { status: 200, headers: {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=3600",
    "X-Content-Type-Options": "nosniff",
  } });
}
