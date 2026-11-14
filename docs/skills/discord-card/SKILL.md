---
name: discord-card
description: Run Discord-PULSE locally, add or modify a card theme or query parameter, regenerate SVG examples, verify visual rendering with headless browser screenshots, and check SVG byte size and GitHub Camo timing.
---

# Discord card workflow (`Discord-PULSE`)

Repository context and architecture: `docs/PROJECT.md`. Theme contract: `docs/THEME-CONTRACT.md`. Default branch: **`main`**.

## 1. Run locally (Windows)

Always invoke `pnpm.cmd` on Windows so PowerShell does not block `pnpm.ps1`:

```powershell
Copy-Item .env.example .env   # optional; default public Lanyard URLs work without secrets
pnpm.cmd install --frozen-lockfile
pnpm.cmd dev                  # http://localhost:3000
```

Useful routes while running locally:
- `http://localhost:3000/` — Card Studio (default demo ID `983724520789655613`)
- `http://localhost:3000/api/983724520789655613?theme=profile` — SVG snapshot
- `http://localhost:3000/live/983724520789655613?theme=profile` — Live WebSocket card

Verification commands:

```powershell
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
```

## 2. Add or modify a theme

Read `docs/THEME-CONTRACT.md` before changing any card component:

1. **Create or edit the theme** in `src/card/themes/<name>.tsx`:
   - Export a `ThemeDefinition` (`name`, `label`, `supportedParams`, `measure`, `Component`).
   - Keep `Component` 100% pure: no React hooks, no `fetch`, no `Date.now()`, no `Math.random()`, and no DOM measurement. Use `data.now` for time calculations.
   - Route **every** image URL through `props.assets(url, kind, fallback)`. Never emit a raw remote URL in `<img src>` or CSS `url()`.
   - Scope all CSS under `.dgp-<name>` and support both `mode="dark"` and `mode="light"`, error cards (`props.error`), and all declared `hide_*` options.
   - Reuse shared primitives in `src/card/parts/` (`identity.tsx`, `activity.tsx`, `clock.tsx`, `theme-kit.tsx`).
2. **Keep `measure(data, options, error)` deterministic**:
   - Return the exact outer border-box `{ width, height }` in pixels.
   - Share height constants between `measure()` and `Component` so the `<svg><foreignObject>` frame and `/live/[id]` wrapper never clip or leave unintended gaps.
3. **Register the theme**:
   - Add the theme to `themes` in `src/card/theme-registry.ts`.
   - Add its name to `THEME_NAMES` in `src/lib/options.ts` (`tests/options.test.ts` enforces that `THEME_NAMES` matches `Object.keys(themes)`).
   - Add a short description in `themeDescriptions` inside `src/components/studio/CardStudio.tsx`.
4. **Write tests** in `tests/`:
   - Cover dark and light modes, width clamping, long text truncation, hide toggles, offline/idle/error states, clock rendering, and `measure()` exactness.
5. **Update documentation**:
   - Add the theme to the gallery in `README.md` and the theme/controls tables in `wiki/Home.md`.

## 3. Regenerate examples and verify with browser screenshots

Bundled SVG examples in `public/examples/` are generated from frozen fixtures (`tests/fixtures/`):

```powershell
# Regenerate the 136 bundled SVG previews (offline, from bundled fixture bytes) + index.html + manifest.json in public/examples/
pnpm.cmd examples

# Render the full 300-SVG matrix (15 themes x 10 fixtures x 2 modes) for visual inspection
pnpm.cmd examples --out-dir .verification/examples --matrix-dir .verification/theme-matrix

# Capture headless Chrome/Edge PNG screenshots for theme matrices
powershell -File scripts/screenshot-examples.ps1 -MatrixDir .verification/theme-matrix
```

Inspect the generated `.verification/theme-matrix/<theme>-matrix.png` files to verify:
- No text clipping, overlap, or broken flexbox truncation across narrow and wide cards
- Correct contrast in both `dark` and `light` modes
- Graceful layout when artwork is missing (`plain` / `offline` fixtures)
- Animated vs static fallback behavior

## 4. Check SVG byte size and GitHub Camo timing

GitHub Camo proxies README images, blocks external sub-resources inside SVGs, and times out on slow origins (~4 seconds). Every SVG response must inline its images as `data:` URIs and stay **under 1,000,000 bytes** (1 MB).

1. **Local size check**:
   - `pnpm.cmd examples` automatically checks that every generated SVG is `< 1,000,000` bytes (falling back to `animated=false` if an animated fixture exceeds the cap, and throwing if still over 1 MB) and records exact byte counts in `public/examples/manifest.json`.
   - Confirm no external image references remain: search the SVG for `<img[^>]+src="https?:` or `url\(["']?https?:` (only standard `http://www.w3.org/...` XML `xmlns` declarations should appear).
2. **Endpoint / Camo timing check**:

```powershell
New-Item -ItemType Directory -Force .verification | Out-Null
curl.exe -sS -D .verification/headers.txt -o .verification/card.svg -w "bytes=%{size_download} seconds=%{time_total}`n" "http://localhost:3000/api/983724520789655613?theme=profile"
```

   - Verify `Content-Type: image/svg+xml; charset=utf-8` and `Cache-Control: public, max-age=0, s-maxage=30, stale-while-revalidate=3600` in `.verification/headers.txt`.
   - Verify `bytes` is well below `1000000` and warm responses return well under 1 second (the healthy cold render should remain below roughly 4s; upstream outages may still take the 5s Lanyard timeout).


## Phase 8 real-owner performance baseline (2026-11-13)

Fresh production Next.js process per theme on local Node 24.19.0, then immediate warm request for owner `983724520789655613`. These are origin measurements, not public GitHub Camo or Vercel cold-start measurements. The owner has not selected a deployment/domain. Raw evidence: scratchpad `agy/phase8-out/timings.json`. Every response was HTTP 200, `image/svg+xml; charset=utf-8`, with no external image loads and the Cache-Control header above.

| Theme | Cold ms | Warm ms | Cold bytes | Warm bytes |
|---|---:|---:|---:|---:|
| `profile` | 2152 | 529 | 590897 | 682638 |
| `nitro` | 1479 | 526 | 685441 | 685441 |
| `member` | 1428 | 450 | 164189 | 164189 |
| `compact` | 1317 | 393 | 124664 | 124664 |
| `activity` | 1390 | 442 | 126782 | 126782 |
| `glass` | 1501 | 538 | 684346 | 684346 |
| `badge` | 1421 | 398 | 92322 | 92322 |
| `chat` | 1404 | 441 | 150960 | 150960 |
| `banner` | 1510 | 524 | 761193 | 761193 |
| `terminal` | 1407 | 395 | 131000 | 131000 |
| `neon` | 1415 | 515 | 689451 | 689451 |
| `retro` | 1313 | 412 | 130809 | 130809 |
| `polaroid` | 1704 | 414 | 180612 | 180612 |
| `mobile` | 1958 | 440 | 126305 | 126305 |
| `voice` | 1473 | 506 | 683911 | 683911 |

Healthy cold requests took 1313–2152 ms; warm requests took 393–538 ms. Maximum response: 761193 bytes. The first cold profile request missed frame/effect completion within the intentional 1500 ms profile budget; its immediate warm response included both. Incomplete upstream work warms the cache; the edge policy serves snapshots for 30 seconds and permits stale responses during revalidation for one hour. SWR needs an existing cached response and cannot hide the first request on a new deployment. Repeat a real Camo check after the owner chooses the production domain. The later badge label contrast surface adds 167 bytes to badge responses; other theme measurements are unchanged.

The gallery command reads only sanitized frozen JSON and bundled images in `tests/fixtures/example-assets/`. It performs no downloads. `tests/examples-offline.test.ts` blocks DNS, HTTP(S), TCP and fetch in the generator process, compares two complete output trees by SHA-256, checks coverage, and verifies XML/dimensions/resource URLs/byte budgets. Use `pnpm.cmd examples --out-dir <dir>` for a disposable copy and `public/examples/styles/index.html` for every style value. Do not capture the owner's real bio into these fixtures.
