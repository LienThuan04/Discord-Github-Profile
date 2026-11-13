# Decisions — Discord-Github-Profile

## 2026-11-13 — Phase 8 short-card readability

Keep profile-effect art at full opacity and its original top anchor. On chat, banner, badge, compact and member, paint it at z-index -1 inside the isolated card, above backdrop art and below normal-flow text/panels. Tall themes retain Discord's overlay composition. The badge's 32px body cannot accommodate a full frame crown: both frame layers paint behind the pill, preserving the catalog's scale, overflow and canvas while letting the pill surface protect identity and text. Other themes retain front-layer overlap. No masks, dimming or geometry distortion are introduced.

## 2026-11-13 — Release examples and runtime

Bundle sanitized fixture artwork under `tests/fixtures/example-assets/` and generate examples without network access. Fail on missing local artwork rather than publishing silent placeholders. Include all 15 layouts in both modes with/without frame/effect/banner-color extras, plus every style value; validate XML, dimensions, resource URLs, size and byte-identical output with network entry points denied. This makes preview changes reviewable and reproducible. Use SVG README previews because the generator does not produce PNGs.

Pin Node `24.x` in `package.json` to match CI and the verified local runtime. Vercel gives package engines precedence over project settings, so an open-ended `>=20.9.0` could silently select a later major. Document Corepack enablement for the pinned pnpm version and leave the production origin/project and old deployment retirement to the owner.

## 2026-11-12 — Two outputs from one pure React tree

- **Why:** GitHub READMEs only allow proxied `<img>` tags without JavaScript or WebSockets, whereas personal websites can run live sockets. Maintaining separate templates for SVG and live DOM would cause visual drift and duplicated layout math.
- **Consequence:** Every theme in `src/card/themes/` exports a pure React `Component` and a deterministic `measure(data, options, error)` function with no hooks or network calls. `/api/[id]` renders that tree inside `<svg><foreignObject>` with CSS snapshot clocks, while `/live/[id]` and Card Studio mount the exact same component tree in the browser with `useLanyard(id)` and a 1-second JavaScript clock.

## 2026-11-12 — SVG via `foreignObject` with server-inlined `data:` URI assets

- **Why:** GitHub Camo proxies README images and blocks external sub-resource requests from inside an SVG `<img>`. If avatars, decorations, badges or album art remained `https://` URLs, GitHub viewers would see broken images.
- **Consequence:** All visual assets inside card components pass through `props.assets(url, kind, fallback)`. During SVG rendering (`src/lib/svg/render.tsx` and `src/lib/svg/assets.ts`), the server collects requested URLs, fetches them in parallel with strict HTTPS/DNS/IP/MIME/size checks, and substitutes `data:` URIs (or a valid transparent PNG placeholder on failure). Fonts rely on system font stacks with Vietnamese coverage so no external font requests are needed.

## 2026-11-12 — `snake_case` query parameters matching the Spotify sister project

- **Why:** The owner maintains `Spotify-Profile-Github` alongside this project and wanted a consistent URL interface (`hide_status`, `max_activities`, `idle_text`, `name_gradient`, `show_banner`) and theme-aware Studio controls across both tools.
- **Consequence:** `src/lib/options.ts` defines all 23 `snake_case` parameters with independent per-field fallback defaults, and each theme declares `supportedParams` so Card Studio hides irrelevant controls and omits them from generated URLs.

## 2026-11-12 — Lanyard KV whitelist for profile banner, bio, and metadata

- **Why:** Lanyard's Discord presence payload does not include a user's Discord profile banner, bio, pronouns, location or website, which leaves full profile cards missing key identity context.
- **Consequence:** `src/lib/lanyard/normalize.ts` reads six whitelisted public Lanyard KV keys (`bio`, `pronouns`, `location`, `website`, `banner`, `accent`), enforces length and URL safety limits, and ignores all other KV keys so arbitrary or private keys never leak into the card. Users set them via the Lanyard bot's `/set key:<name> value:<value>` command.

## 2026-11-12 — Static small identity assets for compact and summary themes

- **Why:** Animated WebP/APNG avatars and decorations can add hundreds of kilobytes to an SVG response, which is wasteful on small cards (`member`, `compact`, `badge`, and the small identity header of `activity`) where the avatar is 20–56px.
- **Consequence:** `member`, `compact` and `badge` always request small static identity artwork (`staticIdentity()` / `smallAsset()`), `compact` and `activity` omit avatar decorations, and `badge` omits default Discord avatars while keeping a 20px custom avatar. Full themes (`profile`, `nitro`, `glass`) still use animated cosmetics when `animated=true`.

## 2026-11-12 — Long `stale-while-revalidate` edge cache header on `/api/[id]`

- **Why:** GitHub Camo aborts slow image origins after roughly 4 seconds. A cold serverless function combined with multiple upstream image fetches can exceed that window if every cache miss blocks on origin rendering.
- **Consequence:** `/api/[id]` responds with `Cache-Control: public, max-age=0, s-maxage=30, stale-while-revalidate=3600` and HTTP 200 (even for themed error/not-monitored cards), allowing Vercel's edge cache to serve a recent snapshot immediately while revalidating in the background.

## 2026-11-12 — Clean-room MIT implementation under `LianHarman(LienThuan04)`

- **Why:** This repository is the owner's standalone product (`https://github.com/LienThuan04/Discord-Github-Profile`), inspired by `cnrad/lanyard-profile-readme` and `kyrie25/lanyard-profile-readme` but architected from scratch to support every Lanyard field, modern Discord cosmetics, 7 themes, a live WebSocket card and Card Studio.
- **Consequence:** No code was copied from upstream Lanyard card repositories. All code, styles, tests and documentation are original work licensed under MIT with `Copyright (c) 2026 LianHarman(LienThuan04)`, plus a single credits line in `README.md`.

## 2026-11-12 — Discord profile extras from an official bot token plus the unofficial dstn mirror

- **Why:** The owner's cards did not show their real Discord profile. Lanyard carries no banner, banner color, Nitro theme colors, bio, pronouns, profile effect or non-`public_flags` badges (quests, orbs, Nitro tenure, boosts). Only Discord's user-token profile endpoint has all of them, and automating a user token is against Discord's terms. The official `GET /users/{id}` with a **bot** token works for any user but returns only `banner`, `accent_color` and the undocumented `banner_color`. `https://dcdn.dstn.to/profile/{id}` is a free, unauthenticated mirror that relays the full profile.
- **Consequence:** `src/lib/discord/profile.ts` (`fetchProfileExtras`) merges two optional sources, and the official API wins on overlap (including an explicit official `null`). (a) The official API runs only when `DISCORD_BOT_TOKEN` is set. (b) The dstn mirror runs unless `DISCORD_PROFILE_PROVIDER=off`, and its base URL is configurable with `DISCORD_PROFILE_PROVIDER_URL`. **dstn is an unofficial third-party service with no SLA, owned by neither Discord nor this project**: it can change shape, rate-limit or disappear, and it sees which user IDs we request. It is therefore isolated behind tolerant Zod parsing, a hard 1.5 s caller budget, AbortController timeouts, and an in-memory LRU cache (10 min success, 1 min failure or degraded, 24 h for effect SKUs). Any failure yields `profile: null` and the card renders as before. Profile-effect art comes from Discord's own public `GET /api/v10/collectibles-products/{sku}`; it is undocumented, so a failure leaves `effect: { skuId }`. `CardData.profile` is additive and `normalize()` keeps it `null`. Only `/api/[id]` and `/live/[id]` attach it, fetched in parallel with Lanyard.


## 2026-11-13 — Shared profile visuals and bounded fetching

Keep the 1500 ms profile budget: cold mirror requests may complete later, but existing background warming and the 30-second/one-hour SWR edge policy keep subsequent cards complete without extending first-render waits. The JSON preview route applies the same policy with a short five-second cache for null results. Studio shares one request per ID (bounded to 50 IDs) across theme edits and Strict Mode. Four layouts without profile visuals skip the provider: compact, activity, badge, retro.

The original shared `profile-look.tsx` is retained. SVG always uses static effect art because the real Sakura base APNG exceeds 2 MB. Live timing uses mount/remount scheduling outside the pure card tree: hiding an already-running APNG with CSS alone cannot delay or restart its first frame. A central mask and 42% opacity protect text. Profile source `profile` still honors an explicit KV banner override; `none` disables artwork and Nitro surface tint. Member keeps nameplates first under automatic selection. Polaroid contains profile art/effects inside its photo and remains static.

Studio also seeds and warms the profile in parallel on the server, within the same budget. Its one browser JSON request can then pick up effect details that completed after the initial deadline, without adding client retries.

## 2026-11-13 — Full-strength profile art and collectible frames

This supersedes the Phase 6C-1 choices to skip four profile fetches and fade effects. Every theme fetches profile extras, wears a type-3 frame, paints its effect at full opacity without a mask, and shows merged badges. Small compositions use profile color as their accent. Banner fills retain their source colors; layout panels and text shadows provide contrast.

Frame composition belongs at the registry boundary. Theme bodies retain their existing measurements; public `measure()` includes scaled frame overflow, and live iframe height uses that same result. `width` keeps its body-width meaning. Image failure suppresses all frame layers atomically but preserves the reserved canvas. Both collectible lookups run in parallel within the unchanged 1500 ms budget and use long-lived catalog caches.

Keep the 1,000,000-byte SVG limit and 660 KiB decoded aggregate image budget. Request frame layers with both bounding dimensions at display resolution (not 2× originals); cap each at 160 KiB and try sized WebP, sized PNG, plain. Live art uses the same resized URLs. No runtime dependency is added.

Studio switches are visible above Fine-tune and map through the existing URL serializer. Replay identity includes user ID, theme, effect visibility and a manual counter, so normal clock ticks preserve playback while deliberate preview changes restart it. Reduced motion always selects still art.

## 2026-11-13 — Release galleries and short-card readability

Generate examples entirely from frozen, sanitized JSON and bundled fixture artwork. Keep established preview filenames, add all 60 theme/mode/extras combinations and 66 style/control variants, and validate every SVG before writing it. A network-denying integration test compares two complete gallery trees, including generation with the optional 300-card matrix. SVG previews are sufficient; no PNG runtime tooling or dependency is needed.

Keep profile art at full opacity. Chat, banner, badge, compact and member paint it above the backdrop and below foreground text/panels. Tall themes retain their existing Discord overlay. Preserve the collectible crown's original scale and overflow on badge, but put its front layer behind the entire pill so its base cannot cover the avatar or label. The 1x review found that underlay order alone still lets white petals blend into the badge's pale text; use an opaque mode-specific surface immediately behind the label, without changing geometry or fading the art. Cost: the small label area covers part of the effect, as any readable foreground panel does.

Keep the 1500 ms profile caller budget and existing 30-second/one-hour SWR policy. Local production measurements establish an origin baseline only; a real public Camo check follows the owner's choice of Vercel project and domain. Do not change, retire or deploy the old Profile_Discord project without that decision. Keep the placeholder origin and leave commit/push to the owner.
