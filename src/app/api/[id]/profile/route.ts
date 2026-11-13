import { fetchProfileExtras, type ProfileExtras } from "@/lib/discord/profile";
import { isSnowflake } from "@/lib/lanyard/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public normalized cosmetics only; never forwards upstream payloads or credentials. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  if (!isSnowflake(id)) return Response.json({ error: "Invalid Discord ID" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  let profile: ProfileExtras | null = null;
  try { profile = await fetchProfileExtras(id); } catch { /* Keep the preview available during provider failures. */ }
  return Response.json({ profile }, { headers: {
    "Cache-Control": `public, max-age=0, s-maxage=${profile ? 30 : 5}, stale-while-revalidate=3600`,
    "X-Content-Type-Options": "nosniff",
  } });
}
