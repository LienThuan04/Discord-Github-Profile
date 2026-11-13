# Verified integration facts and gotchas

## Phase 7 profile frames (2026-11-13)

- The collectibles CDN ignores `width` alone: the amethyst back layer stayed 199588 bytes as WebP. `width=460&height=460` returns 49934 bytes but pads the image to a square, moving the transparent front layer across text. `width=460&height=251` preserves its geometry (49562-byte WebP). Catalog entries omit dimensions: read and cancel the PNG stream after its 24-byte header, cache those dimensions with the catalog, and request the exact aspect ratio. Always request both dimensions. Sized WebP may intermittently 404; retry sized PNG then plain, with a 160 KiB per-layer cap. The 870 KB original is rejected.
- Frame art is atomic: hide all layers if any image fails, while retaining the measured overflow canvas. Reserve geometry from catalog metadata, never from image load events.
- Generic backdrop opacity also affects `.pf-banner` through the shared class. Restrict ambient-avatar dimming to `:not(.pf-banner)`; removing a more specific rule alone does not restore full-strength banners.

Verified with real GET requests on 2026-11-12. The authoritative inputs are the design spec and `docs/DESIGN-discord.md`. Raw response status, MIME and byte counts are saved with the Phase 1 screenshots in `phase1-out/cdn-verification.json` in the requested scratchpad.

## Discord and partner CDN checks

39 probes: 35 HTTP 200 responses and four intentional negative checks (400, 404, 415, 415). Every supported URL family has a successful example. All 12 badge hashes in `src/lib/discord/badges.ts` returned 200 `image/png`.

| Family | Verified result |
| --- | --- |
| Avatar PNG/WebP | Demo user `983724520789655613`, hash `c8996a80c144f90664d5d8cd9ebd0526`: both 200 at size 128. WebP was 2,116 bytes versus PNG 23,229. |
| Animated avatar | Public Lanyard example user `268798547439255572`, hash `a_0422e7007dfcf7784688e66cbbd45187`: GIF and `webp?size=64&animated=true` both 200. WebP was 233,770 bytes versus GIF 399,633. |
| Default avatar | `(BigInt(id) >> 22n) % 6n` gives 2 for the demo; `/embed/avatars/2.png` returned 200. Legacy discriminators use `% 5`. |
| Decoration | `/avatar-decoration-presets/a_8c18ac604dd50ec43d571f18af63c79f.png?size=96&passthrough=false` is static (14,859 bytes). `passthrough=true` returns APNG (799,744 bytes) and ignores the requested size. Animated WebP at 96 returned 415,582 bytes. |
| Nameplate | `/assets/collectibles/nameplates/pitter_patter/1495807265175900180/static.png` and `asset.webm` both 200. The asset includes the trailing directory slash. SVG must use the PNG; webm is for live rendering. |
| Guild tag | Both `/guild-tag-badges/1369636126096097300/f199d66208891c43b51805e21b78bd4c.png` and `/clan-badges/...` returned 200. Use the current `guild-tag-badges` spelling. |
| `mp:` assets | Strip `mp:` and prefix `https://media.discordapp.net/`; the demo avatar path returned 200 through that proxy. |
| Spotify | `spotify:` maps to `https://i.scdn.co/image/{id}`. Replacing album prefix `ab67616d0000b273` with `ab67616d00001e02` gives smaller art; the fixture URL returned 200 JPEG (16,972 bytes). |
| YouTube | `youtube:dQw4w9WgXcQ` maps to `https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg`, 200 JPEG. |
| Twitch | `twitch:monstercat` maps to `https://static-cdn.jtvnw.net/previews-ttv/live_user_monstercat-320x180.jpg`, 200 JPEG. Offline channels may return a fallback or 404. |
| Application assets | `/app-assets/383226320970055681/1359298108856729682.png?size=128` and asset `1359298109074706533` at 64 returned 200. Asset IDs can be discovered from public `/api/v10/oauth2/applications/{id}/assets`. |
| RPC app icon | Public `/api/v10/applications/383226320970055681/rpc` returned icon `db3133f34f68553148f3a65c1f4633aa`; `/app-icons/{id}/{icon}.png?size=64` returned 200 (7,581 bytes). |
| Emoji | `/emojis/232720527448342530.png?size=32` returned 200 PNG. This particular emoji is static; its GIF request returned 415. Request GIF only when Discord says the emoji is animated, with a static fallback. |
| Twemoji | Pinned maintained fork `https://cdn.jsdelivr.net/gh/jdecked/twemoji@16.0.1/assets/svg/1f525.svg` returned 200 SVG. Remove FE0F except within ZWJ sequences. |

Corrections to initial assumptions:

- GIF is not accepted for a static avatar or static emoji (both returned 415). Animated WebP is much smaller than GIF/APNG for the checked art.
- The RPC icon hash is **not** an application asset ID: requesting it under `/app-assets/` returned 404; `/app-icons/` returned 200.
- Size 120 returned 400. `cdnSize()` rounds to an accepted CDN size; use 128 for the avatar and 96 for the decoration.
- Animation is not always small. A 384 KiB asset cap would remove the real decoration; budgets must accommodate its animated WebP or fall back to its static variant. Aim for a response below 1 MB including base64 overhead.
- Nitro and server boosts cannot be inferred from `public_flags`. The badge row only claims flags Discord exposes. Nameplate palette values are presentation mappings, not a public Discord API guarantee; unknown names safely use the accent gradient.

The real snapshot is `tests/fixtures/demo-user.json`; synthetic fixtures are explicitly constructed in `tests/fixtures/index.ts`. Preserve the captured snapshot when the demo user's presence changes; use fresh API output for visual verification.

## Security and SVG behavior

- Every remote image becomes a data URI. GitHub Camo does not permit external image loads inside SVG images. XML namespaces for SVG/XHTML necessarily remain HTTP namespace identifiers; they are not network references.
- Image requests accept only HTTPS, no credentials, and the default port. Ordinary images use an exact hostname allowlist; arbitrary public banner hosts require the `banner` role. All DNS answers must be public, and the validated address is pinned to the TLS connection to prevent DNS rebinding. Redirects are rejected, including redirects from trusted CDNs.
- Reject private, loopback, link-local, mapped and special-use IPs. Fail closed on DNS errors. The timeout covers DNS and body reading. MIME and file signatures must match. Arbitrary SVG banners are refused; only the pinned Twemoji SVG path is accepted and screened for active/external content.
- Banner downloads are capped at 2 MiB. Other images and the total inline budget have separate caps. A failed or over-budget image uses a local transparent PNG. Six workers fetch in parallel, and duplicates are fetched once.
- CSS clocks and progress use the same `CardData.now` snapshot. Negative delays phase digit reels with `steps()` animations. At the endpoint, the running digits disappear and a fixed final value takes over. Open-ended elapsed timers animate for two hours; extremely long bounded animations remain static to bound SVG size.
- Countdown `steps(end)` needs a tiny phase offset at exact integer seconds; otherwise it starts one digit too low. `tests/clock-boundary.test.ts` covers this regression.
- System fonts (`Segoe UI`, Arial, Georgia) cover Vietnamese names such as LiênThuận without fetching a font. Discord's proprietary font and effect IDs are best-effort mappings.
- React's HTML escaping does not remove XML 1.0 forbidden controls. The SVG output boundary removes those controls and lone UTF-16 surrogates while preserving emoji and Vietnamese. Nested platform SVGs must explicitly reset their XML namespace inside the XHTML foreignObject.
- A base64 PNG can have a valid signature and still contain corrupt compressed pixels. The placeholder regression test inflates its IDAT stream and verifies transparent RGBA bytes; it must never become an opaque red or broken image.
- Next.js rejects a generic `react-dom/server` import in App Router's server-component compilation. Use the explicit `react-dom/server.edge` entry for `renderToStaticMarkup`; asset fetching still runs on the Node route runtime. See the [React static renderer reference](https://react.dev/reference/react-dom/server/renderToStaticMarkup).

## Lanyard KV setup

Join [the Lanyard Discord server](https://discord.gg/lanyard) so the service monitors your account. Use its bot's `/set` slash command (`/set key:<key> value:<value>`, and `/del key:<key>` to remove a key; earlier notes referred to `/kv set`, which was replaced by `/set` in current Lanyard bot commands). Supported keys: `bio` (240 characters), `pronouns` (40), `location` (80), `website` (HTTPS), `banner` (public HTTPS image), and `accent` (hex). Unrecognized keys are ignored; sensitive KV values never appear in the view model.

`LANYARD_API_URL` defaults to `https://api.lanyard.rest/v1`; the REST client has a five-second timeout and typed results. `NEXT_PUBLIC_LANYARD_WS_URL` defaults to `wss://api.lanyard.rest/socket` for the future client wrapper. No token is required for these public read endpoints.

## Local tooling

Use `pnpm.cmd` on Windows. This shell did not expose it on PATH; Phase 1 used the exact `pnpm@11.22.0` shim obtained with `npm.cmd exec` into a repository-local cache. The previous installation linked to a store outside this repository; stale Windows junctions and hard links blocked an in-place repair. `pnpm-workspace.yaml` now configures a local ignored store, a fresh virtual store in `.verification/pnpm-virtual`, and copy imports. These settings also apply in CI. Do not change global package-manager settings or write to neighboring repositories. pnpm 11 reads these settings from workspace YAML; putting them in `.npmrc` does not configure them. See [pnpm configuration](https://pnpm.io/settings).

## Phase 2 themes (2026-11-12)

- All seven themes are registered. The frozen `src/lib/options.ts` validator still accepts only `profile`; the Phase 3 `parseCardOptions` adapter in `src/lib/embed.ts` handles registry names for Studio/live, but `/api/[id]` still uses the frozen validator. Expand that enum during integration; do not patch around it inside theme components.
- The SVG prefetch pass supplies a transparent 1x1 PNG. When omitting failed artwork, still call the resolver for secondary artwork before branching; otherwise the successful final pass introduces an image that was never prefetched. `ActivityBlock` now supports optional, backward-compatible `collapseMissingArt` and shares row-height calculations with `activityHeight`.
- `member`, `compact` and `badge` always use static small identity assets. Compact intentionally omits decoration; badge omits default avatars and includes a 20px custom avatar. Badge width uses deterministic Courier New advances, NFC-normalized text and bounded content, rather than DOM or wall-clock measurements.
- Run `pnpm.cmd examples`; add `--matrix-dir <directory>` for all 112 fixture/mode/theme SVGs and HTML matrices. The generator freezes `FIXED_NOW`, prefetches unique real assets once, preserves successful assets when another fails and rejects SVGs above 1 MB. `scripts/screenshot-examples.ps1 -MatrixDir <directory>` captures all seven matrices with an isolated headless Chrome/Edge profile.
- Phase 2 added only `tsx`. pnpm initially wrote an esbuild approval placeholder to workspace YAML; that automatic config edit was reverted to respect file ownership. The installed platform binary works without the optional postinstall hook. In the restricted Windows sandbox, tsx's `os.userInfo()` returns ENOMEM; running the command with normal OS access succeeds. No dependency or application workaround was added for the sandbox.
- Final Phase 2 verification: 387 tests in 18 files pass, including 196 new Phase 2 tests; typecheck, lint and examples exit 0. All 112 real-asset matrix SVGs are valid XML, have no external image references and stay below 1 MB (largest 617762 bytes). All seven PNG matrices were inspected. Twitch preview art was unavailable and uses a deliberate fallback; missing/failed profile activity art no longer reserves a horizontal art column.

## Phase 3 live card and Studio (2026-11-12)

- The pure protocol reducer and its effect runner live in the new `src/lib/lanyard/socket.ts`. The real endpoint returned Hello (30,000ms), INIT_STATE for `983724520789655613`, and another INIT_STATE after the 90-second quiet-window probe on the same connection. Lanyard has no heartbeat ACK: do not treat an unchanged presence as a dead socket. A missed ten-second subscription probe triggers reconnection. Five failures switch to 30-second REST polling; a WebSocket recovery attempt follows five minutes later. Browser polling derives its REST host and path prefix from `NEXT_PUBLIC_LANYARD_WS_URL`.
- Live time must have one owner. The wrapper normalizes each second and displays the shared clock's `aria-label` snapshot through scoped CSS; digit-reel and progress animations are suppressed only inside the live wrapper. Otherwise a continuing CSS animation plus updated negative delays counts elapsed time twice. Animated avatars, nameplates and gradients remain enabled. Chrome verified the minute boundary and that progress has no CSS animation.
- `useLanyard` uses a lazy external store, so server rendering opens no sockets. React Strict Mode intentionally subscribes, cleans up, then subscribes again: verify one active socket rather than one construction. ID changes dispose the previous transport and cannot reuse another user's initial snapshot.
- Studio and `/live/[id]` use `parseCardOptions` to combine the existing option parser with the runtime registry. `/api/[id]` still needs the frozen validator's theme enum expanded at integration time. No Phase 3 changes were made to that validator or API route.
- Headless Chrome needs normal OS process access in this Windows sandbox; restricted GPU subprocesses exited with access denied. Browser checks and visually inspected PNGs are in the requested scratchpad `phase3-out/`. They cover 1440px, 390px and 360px Studio, transparent live cards, clipboard feedback, keyboard tabs, SVG loading, ID changes, and source/origin/height-checked iframe resizing. Windows clipboard reads normalize newlines to CRLF.
- A pre-existing dev server occupied `.next/dev` on port 3000. Phase 3 used port 3101 and an isolated ignored development cache via a temporary runtime config in the scratchpad. Next automatically rewrote type includes and generated AGENTS.md; these startup-only changes were restored after stopping the Phase 3 server. No build, dependency installation, commit, push, or graph generation was run by Phase 3.
- Integration update observed after the notes above: concurrent work expanded `src/lib/options.ts` to all seven theme names and added a registry consistency test. The earlier API theme limitation is resolved; Phase 3 did not edit that frozen file. The final combined suite now has 388 passing tests in 18 files (66 Phase 3 cases).

## Discord profile extras (2026-11-12)

Verified with real requests for `src/lib/discord/profile.ts`. The sanitized dstn snapshot is `tests/fixtures/dstn-profile.json`; connected accounts, widgets and wishlist were removed. `tests/fixtures/discord-effect-product.json` is the unmodified collectibles product.

- **dstn payload for the demo ID:** `user.banner` is null, `user.accent_color` is `9137624` and `user.banner_color` is `"#8b6dd8"`, the purple Discord shows as the banner. `user_profile` has **no `theme_colors` key**; this differs from an empty array. `pronouns` is `""`, which maps to null. `profile_effect` is `{ sku_id: "1139323093991575696", expires_at: null }`. There are three `badges`: `quest_completed` (with `link`), `april_fools_2026` and `orb_profile_badge`. All three `badge-icons/{icon}.png` returned 200 `image/png` (3,705, 7,781 and 3,473 bytes). Other real users return `theme_colors: [0, 0]` or `accent_color: 0`; these are valid black values. An unknown or invisible user returns HTTP 404.
- **dstn latency:** a cold mirror lookup took **1.19–1.57 s** across 10 user IDs; repeated requests took about 0.2 s. With the 1.5 s budget, a cold card can miss the profile or the effect art. Requests are not aborted when the budget ends; they continue until their 4 s timeout and fill the cache, so the next render, usually the SWR revalidation, is complete. The real smoke run measured a 1,506 ms cold call with `effect: { skuId }` only, then a 0 ms warm call with the full Sakura Dreams art.
- **Official API:** an unauthenticated `GET /api/v10/users/{id}` returns 401. The Discord User object documents `banner` and `accent_color`; `banner_color` is undocumented but parsed when present. A bot token is needed, and none was available locally, so the official parser is covered by a synthetic fixture shaped like the docs.
- **Banner CDN:** checked against a real static banner, user `94490510688792576` and hash `bb4bff6e0bfc94ea9e01d6ad31750494`. At size 600, `.webp` was 20,764 B, `.png` 240,949 B and `.jpg` 24,848 B. `.png?size=1024` was 667,664 B. `.gif` returned 415. `.webp?size=600&animated=true` on a static banner returns the same static WebP. No animated `a_` banner was found among about 20 public IDs, so the animated variant (`.webp?size=600&animated=true`, per Discord's image-formatting docs) is **unverified against real art**.
- **Profile-effect SKU → art (found):** `GET https://discord.com/api/v10/collectibles-products/{sku}` works without auth (v9 also works) and returned 200 for `1139323093991575696` ("Sakura Dreams"). Item `type: 1` is the profile effect. It has `staticFrameSrc`/`reducedMotionSrc`, `thumbnailPreviewSrc` and `effects[]` layers (`src, width, height, start, duration, loop, loopDelay, zIndex, position`). An unknown SKU returns 404 with `code: 10027`. No rate-limit headers were returned. `GET /api/v9/store/published-listings/skus/{sku}` also works and carries the same data in snake_case; it is kept as a known alternative and is not used. Item `type: 3` (e.g. SKU `1484726324580061191`, "Crystals (Amethyst)") is a different collectible with `layers`/`inner_width`, not an effect.
- **Effect art size:** files live at `cdn.discordapp.com/assets/content/{sha256}` with no extension. Sakura Dreams has a still frame of 10,332 B (PNG, 450×880), a base layer of **2,122,918 B** (APNG), a second layer of 84,480 B (APNG) and a thumbnail of 75,158 B. The CDN ignores `?size=` and the extension; `media.discordapp.net` returns 404 for these paths. The base layer can never fit an SVG budget. The inliner caps `profile-effect` at 384 KiB and rejects the layer from `content-length` alone, then uses the still frame. A real-network smoke confirmed it: the whole profile set (still frame plus three badges) inlined in about 230 ms and used about 34 KB of base64.
- **Endpoints tried that do not map SKUs:** on `dcdn.dstn.to`, `/profile-effects`, `/profile_effects`, `/profile-effects/{sku}`, `/collectibles`, `/collectibles/{sku}`, `/effects`, `/user-profile-effects` and `/` all returned 404. Discord's `/api/v9|v10/user-profile-effects` returned 404 without auth. `/collectibles-shop`, `/collectibles-categories` and `/collectibles-categories/v2` returned 401.
- **Asset budgeting:** the inliner now budgets identity art (avatar, decoration, activity art) before decorative art: the KV banner, `/banners/` and effect frames. Badge icons are capped at 64 KiB, effect frames at 384 KiB and Discord banners at 512 KiB; the KV `banner` role stays at 2 MiB.


## Phase 6C-1 profile visuals (2026-11-13)

- Modern ICU accepts numeric offsets such as `+07:00`; reject leading signs before Intl validation because the public `tz` contract requires named IANA zones.
- Theme-specific defaults must not erase the selected theme itself from embeds: only width and other option defaults vary per theme; the URL theme default remains profile.
- A Vitest beforeEach arrow returning `mockReset()` returns a function, which Vitest invokes as cleanup. Use a braced hook returning void; otherwise a rejected provider mock can falsely fail after the route already handled it.
- The pnpm shim is repository-local at `.npm-cache/_npx/6d2f729d1e712443/node_modules/.bin/pnpm.cmd`; prepend that directory to PATH for each shell invocation. `rg` is unavailable in this shell; graphify works through `python -m graphify`.

- Capture whether the incoming Studio URL explicitly contains `tz` before serializing options into the address bar. The serializer correctly omits `tz=UTC`, but checking the rewritten URL afterwards would incorrectly replace an explicit UTC choice with the browser zone.
- A live server seed can have the banner color but only the effect SKU at the 1500 ms deadline. LivePresence requests the public JSON endpoint on hydration for incomplete seeds, so warmed effect art appears without reloading the iframe; fully populated seeds need no extra request.

- This Windows shell can replace Unicode characters in Python source piped through stdin with question marks. Use apply_patch or save the script as UTF-8 with Set-Content before executing it; original UTF-8 file contents read/written by Python remain intact.

- GitHub Actions CI failed at `pnpm install --frozen-lockfile` with `ERR_PNPM_IGNORED_BUILDS: esbuild@0.28.2`. pnpm 11 sets `strictDepBuilds` under CI, so an unapproved dependency build script is an error, not a warning. Fixed with `allowBuilds: { esbuild: true }` in `pnpm-workspace.yaml`. Verified in a fresh clone with `CI=true pnpm install --frozen-lockfile`. When pnpm writes the placeholder `esbuild: set this to true or false`, replace it; do not append a second `allowBuilds` key.
