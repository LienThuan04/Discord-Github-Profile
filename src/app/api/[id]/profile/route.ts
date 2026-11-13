import { lookupProfileExtras, type ProfileLookup } from "@/lib/discord/profile";
import { isSnowflake } from "@/lib/lanyard/client";
import { finishAfterResponse, PARTIAL_CACHE, SNAPSHOT_CACHE } from "@/lib/cache-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public normalized cosmetics only; never forwards upstream payloads or credentials. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  if (!isSnowflake(id)) return Response.json({ error: "Invalid Discord ID" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  let lookup: ProfileLookup | null = null;
  try { lookup = await lookupProfileExtras(id); } catch { /* Keep the preview available during provider failures. */ }
  if (lookup && !lookup.complete) finishAfterResponse(lookup.settled);
  const profile = lookup?.profile ?? null;
  return Response.json({ profile }, { headers: {
    "Cache-Control": profile && lookup?.complete ? SNAPSHOT_CACHE : PARTIAL_CACHE,
    "X-Content-Type-Options": "nosniff",
  } });
}
