# Phase 1 Completion Implementation Plan

> **For agentic workers:** Execute inline using superpowers:executing-plans. The user has authorized unattended implementation in this checkout. Do not commit or push.

**Goal:** Finish the existing Foundation implementation and verify actual SVG images in a browser.

**Architecture:** Pure Lanyard normalization feeds a shared React card tree. Options control deterministic layout. Server-only fetching and asset inlining surround that tree; future live rendering supplies direct URLs.

**Tech stack:** Next.js 16.4.6, React 19, strict TypeScript, zod, Vitest, pnpm; exact versions from package.json.

**Spec:** docs/superpowers/specs/2026-11-12-discord-pulse-design.md, sections 2–7 and 10; phase1.md supplied by the user.

## Global constraints

- Work in the specified repository; verification artifacts and final report go in the authorized scratchpad.
- No commits, pushes, copied implementations, or changes to neighboring repositories.
- English content; author LianHarman(LienThuan04); no hooks in card parts.

## Review focus

- Banner DNS, redirects, private IPs and media validation must fail closed.
- Oversized or stalled assets must become local placeholders.
- Invalid upstream payloads and IDs must still return themed SVG responses.
- Narrow cards, Vietnamese glyphs and long content must fit measured bounds.
- Animation must keep snapshot clocks and progress aligned and stop at the final value.

### Task 1: Complete data and option boundaries

- [x] Inspect existing files and baseline test/typecheck failures.
- [x] Implement src/lib/lanyard/{normalize,client}.ts against existing tests/normalizer.test.ts.
- [x] Write failing tests/options.test.ts, then implement src/lib/options.ts with all section-7 keys.
- [x] Run pnpm.cmd test and typecheck; expect all existing logic tests green.

Interfaces: normalize(presence, {now}) returns CardData; fetchPresence returns a discriminated result; parseOptions accepts URLSearchParams or a query record and returns CardOptions.

### Task 2: Shared card and SVG pipeline

- [x] Write measure, inliner and render smoke tests; observe missing-feature failures.
- [x] Add src/card/{types,parts,theme-registry}.tsx/ts and themes/profile.tsx with scoped styles.
- [x] Add src/lib/svg/{assets,render}.ts/tsx, strict asset policies and bounded parallel fetching.
- [x] Verify dimensions, options, inlining, XML, safety and both color modes.

Interfaces: ThemeDefinition declares name, label, supportedParams, measure and Component; CardProps supplies data, options, assets and optional error; assets(url) resolves every image.

### Task 3: API and delivery

- [x] Add API route tests, then implement src/app/api/[id]/route.ts and minimal app layout/page.
- [x] Verify all CDN patterns over HTTP; write docs/memory/gotchas.md and docs/THEME-CONTRACT.md.
- [x] Run install, lint, typecheck, test and production build; expect exit 0 for each.
- [x] Start production server, fetch dark/light demo SVGs, screenshot via img and inspect PNGs; stop server.
- [x] Review implementation and fix material findings; write the under-500-word report to the exact requested path.

## Execution ledger

- Baseline: 3 test files passed, 1 failed to import missing normalize/client; 54 assertions passed. Typecheck: 3 errors caused by those missing modules.
- Ruling: work in the user's explicitly requested main checkout and retain all changes uncommitted; no extra worktree or commit workflow.
- Ruling: existing written design and unattended instruction replace interactive planning/approval steps.
- Task 1: complete. All existing normalization/client expectations passed; options tested with defaults, every toggle, clamping and malformed values.
- Task 2: complete. XML, dimensions, SSRF, timeout, budget and image-fallback tests passed. Countdown boundaries and bounded reel allocation were corrected after failing regression tests.
- Ruling: pnpm 11 configuration belongs in pnpm-workspace.yaml. A fresh ignored virtual store and copy imports repair inherited Windows links without global changes.
- Ruling: SVG static markup uses react-dom/server.edge because Next's compiler rejects the generic server import; production build verified.
- Final review: fresh read-only reviewer found malformed placeholder PNG and XML controls. Both fixed with RED→GREEN regression tests. No Critical or deferred Minor findings. Future themes, Studio, WebSocket lifecycle and deployment remain outside Phase 1 by the authoritative task.
- Visual review: inspected real dark/light API PNG and 16 narrow fixture renders. Corrected missing SVG namespace on platform icons, hidden-status idle dot, and replaced an invalid synthetic small-asset ID with a verified one.
- Final verification: frozen install, lint (0 errors/warnings), typecheck (0 errors), test (125/125 in 11/11 files), build all exit 0. Four production HTTP checks passed with correct content/cache headers and no external images. Demo responses: 585,857 / 585,858 bytes. Four final PNGs visually inspected. Both production server sessions stopped; port 3219 has no listener. No commit or push.
