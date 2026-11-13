import { after } from "next/server";

/**
 * Complete snapshots. The edge reuses one for 30 s, then serves it stale for up to an hour while it
 * refreshes in the background, so GitHub Camo (which gives up after about 4 s) rarely waits on a cold render.
 */
export const SNAPSHOT_CACHE = "public, max-age=0, s-maxage=30, stale-while-revalidate=3600";

/**
 * Snapshots missing data that will probably arrive within seconds: profile art past its budget, a failed
 * profile source or a Lanyard outage. No stale reuse, so the edge cannot pin a degraded card for an hour.
 */
export const PARTIAL_CACHE = "public, max-age=0, s-maxage=5";

/**
 * Keeps the serverless instance alive until `work` settles (Next.js `after()`, `waitUntil` on Vercel and
 * Cloudflare). Without it the host may freeze the instance mid-request and the late result never reaches the
 * cache. Outside a request scope (tests, scripts) the promise simply runs on.
 */
export function finishAfterResponse(work: Promise<unknown>): void {
  const settled = work.then(() => undefined, () => undefined);
  try {
    after(() => settled);
  } catch {
    // No request scope.
  }
}
