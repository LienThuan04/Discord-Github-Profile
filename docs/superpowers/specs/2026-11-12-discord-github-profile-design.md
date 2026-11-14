# Discord-PULSE — design

Date: 2026-11-12 · Owner: `LianHarman(LienThuan04)` · Repo: `https://github.com/LienThuan04/Discord-Github-Profile` (branch `main`)

## 1. Intent

A Discord presence card for GitHub profile READMEs, rebuilt from scratch as the owner's own product. It is
powered by [Lanyard](https://github.com/Phineas/lanyard) and inspired by `cnrad/lanyard-profile-readme` and its fork
`kyrie25/lanyard-profile-readme`. It should look better than both and show more. It must use **every piece of data Lanyard
exposes**, including the newer Discord cosmetics: avatar decorations, nameplates, server (guild) tags and display-name styles.

The owner asked for it to work "like the Spotify repo" (`../spotify-github-profile`): an API that renders an SVG with many
themes, a builder page (Card Studio) that produces embed code, a README with a single-page wiki, tests, CI, and agent
docs inside the repo.

The owner also asked for status updates **without reloading the page**. A GitHub README cannot do that, because GitHub
serves the card as a proxied `<img>` with no JS and no sockets, so the card ships in two outputs from one UI:

1. **SVG image** (`/api/{id}`) for GitHub READMEs. It is a snapshot. CSS animations (elapsed clocks, progress bars,
   gradients) keep it feeling alive until the next load.
2. **Live card** (`/live/{id}`) for websites and iframes. It uses the Lanyard WebSocket, so status, activities, Spotify and
   KV changes update instantly.

## 2. Hard rules (apply to every agent)

- **No code copied** from `cnrad/…` or `kyrie25/…` (or any other repo). Agents may read those repos only to learn facts
  (endpoints, badge icon hashes, palette values, Discord quirks) and then write original code.
- All project content (code, comments, README, wiki, docs, commit-ready text) is written in **English**. The owner talks
  to agents in Vietnamese.
- Author string everywhere (README, LICENSE, footer, `package.json`, metadata): `LianHarman(LienThuan04)`.
  The license is MIT with `Copyright (c) 2026 LianHarman(LienThuan04)`. README gets one credits line: "Inspired by
  cnrad/lanyard-profile-readme and kyrie25/lanyard-profile-readme. Presence data from Lanyard."
- **No git commit and no push** unless the owner asks. Do not touch `../LienThuan04/`, `../spotify-github-profile/`,
  or the old GitHub repo `LienThuan04/Profile_Discord`, which still serves the live card.
- Shell is Windows: use `pnpm.cmd` / `npm.cmd` (PowerShell blocks `npm.ps1`), or run through the Bash tool.
- Default demo user ID: `983724520789655613` (the owner's account).

## 3. Stack (decided)

Next.js **16.4.6** (App Router, `src/` dir), React 19, TypeScript strict, pnpm, Vitest, ESLint flat config, deployed on
Vercel. Use plain CSS Modules plus CSS variables for the site, with no Tailwind and no UI kit. Keep runtime dependencies
minimal: `zod` is fine for param parsing, and anything else needs a reason. Pin exact versions.

## 4. Lanyard data (verified live 2026-11-12 for the demo ID)

REST `GET https://api.lanyard.rest/v1/users/{id}` →
`{ success, data: { kv, discord_user, activities, discord_status, active_on_discord_{web,desktop,mobile,embedded,vr},
listening_to_spotify, spotify } }`. The `discord_user` object contains `id, username, global_name, display_name,
discriminator, avatar, avatar_decoration_data {asset, sku_id, expires_at}, collectibles.nameplate {asset, label, palette,
sku_id, expires_at}, display_name_styles {font_id, effect_id, colors[]} | null, primary_guild {tag, badge,
identity_guild_id, identity_enabled}, public_flags, bot`. The demo user currently has a decoration, the nameplate
`nameplates/pitter_patter/1495807265175900180/` with palette `forest`, the guild tag `ᗪᗴᐯ`, and a custom status.

WebSocket `wss://api.lanyard.rest/socket`: on op `1` Hello `{heartbeat_interval}`, send op `2` `{subscribe_to_id}` and
heartbeat op `3` on the interval. Events arrive as op `0` with `t` = `INIT_STATE` | `PRESENCE_UPDATE`. Reconnect with
backoff. A user who is not in the Lanyard Discord server gets `success:false`
(`user_not_monitored`). Render a friendly card that says "Join discord.gg/lanyard to show your presence".

Base URLs come from env, so a self-hosted Lanyard works: `LANYARD_API_URL` (default `https://api.lanyard.rest/v1`) and
`NEXT_PUBLIC_LANYARD_WS_URL` (default `wss://api.lanyard.rest/socket`).

### Use everything Lanyard exposes

| Data | Shown as |
|---|---|
| avatar (static/animated `a_`) + default avatar `(BigInt(id) >> 22n) % 6n` | avatar |
| `avatar_decoration_data` | decoration frame over the avatar (animated APNG when allowed) |
| `collectibles.nameplate` (+ `palette`) | nameplate background (static PNG in SVG; animated webm in live) |
| `primary_guild` | server-tag chip with its badge |
| `display_name_styles` | name font/effect/gradient (best effort with open fonts; gradient from `colors`) |
| `public_flags` | profile badges row (HypeSquad, Early Supporter, Active Developer, …) |
| `discord_status` + `active_on_*` | status dot (online/idle/dnd/offline) + platform icons (desktop/web/mobile/console/VR) |
| custom status (type 4) | text + emoji (custom emoji image or Unicode via a pinned Twemoji version) |
| activities types 0/1/2/3/5 | Playing/Streaming/Listening/Watching/Competing sections: name, details, state, large + small image, timestamps (elapsed or remaining), party size, button labels |
| `spotify` | album art, song, artist, album, animated progress bar + clock |
| `kv` | whitelisted keys: `bio`, `banner` (image URL), `pronouns`, `location`, `website`, `accent` (hex). Lanyard has no banner/bio, so KV fills that gap; document how to set them via the Lanyard bot. |

CDN URL facts. These are known patterns. **Verify each one with a real HTTP request before relying on it** and record any
corrections in `docs/memory/gotchas.md`:
- avatar `https://cdn.discordapp.com/avatars/{id}/{hash}.{png|gif}?size=N`; default `https://cdn.discordapp.com/embed/avatars/{i}.png`
- decoration `https://cdn.discordapp.com/avatar-decoration-presets/{asset}.png?size=N&passthrough={true|false}`
- nameplate `https://cdn.discordapp.com/assets/collectibles/{asset}static.png` and `…{asset}asset.webm`
- guild tag badge: `https://cdn.discordapp.com/guild-tag-badges/{guild_id}/{badge}.png` or `…/clan-badges/…`. Check which one
  answers 200 for guild `1369636126096097300` / badge `f199d66208891c43b51805e21b78bd4c`.
- activity assets: `mp:` → `https://media.discordapp.net/{rest}`, `spotify:` → `https://i.scdn.co/image/{id}`,
  `youtube:`/`twitch:` prefixes, else `https://cdn.discordapp.com/app-assets/{application_id}/{asset}.png`. When an activity
  has no image, use the app icon from public `https://discord.com/api/v10/applications/{id}/rpc` (`icon` hash) →
  `https://cdn.discordapp.com/app-icons/{id}/{icon}.png`.
- custom emoji `https://cdn.discordapp.com/emojis/{id}.{gif|png}`; badges `https://cdn.discordapp.com/badge-icons/{hash}.png`.

## 5. Architecture

One React component tree renders both outputs:

```
Lanyard REST / WS ──► normalize() ──► CardData (pure view model)
query params ───────► parseOptions() ─► CardOptions (zod, defaults, clamping)
                         │
            <Card theme data options assets/>      (pure components, no hooks, scoped CSS string per theme)
              │                                   │
  SVG target: renderToStaticMarkup inside          Live target: client component; useLanyard(id) hook
  <svg><foreignObject><div xmlns=xhtml>…           re-renders on PRESENCE_UPDATE; assets = direct URLs;
  assets = data: URIs prefetched server-side       timers tick with JS
```

Suggested layout (builders may refine): `src/lib/lanyard/` (types, REST client, normalizer), `src/lib/discord/` (CDN URL
builders, flags→badges, nameplate palettes, activity helpers, time math), `src/lib/options.ts`, `src/card/` (shell,
shared parts, `themes/<name>.tsx` + theme registry with metadata used by Studio), `src/lib/svg/` (asset inliner, renderer),
`src/hooks/useLanyard.ts`, `src/app/api/[id]/route.ts`, `src/app/live/[id]/page.tsx`, `src/app/page.tsx` (Studio).

SVG constraints:
- GitHub Camo blocks external loads inside an SVG `<img>`, so every image must be inlined as a `data:` URI and fonts must
  be system or inlined.
- `foreignObject` needs fixed `width`/`height`, so each theme exports a deterministic `measure(data, options)` for height.
- Keep responses small: fetch images at the smallest useful `size`, run fetches in parallel with timeouts (Lanyard 5s,
  images 4s), and show a placeholder when one fails. Aim for under 1 MB even with animated avatar and decoration.
- Headers: `image/svg+xml; charset=utf-8`, `Cache-Control: public, max-age=0, s-maxage=30, stale-while-revalidate=3600`.
  The long SWR window matters: GitHub Camo gives up on slow origins (a Vercel cold start plus image fetches can pass 4s),
  and SWR lets the Vercel edge answer instantly from cache. Keep total render time low.
- Live clocks use the snapshot technique already proven in the Spotify repo: CSS step animations with negative
  `animation-delay` so the elapsed time keeps counting after the image is served.
- Security: React escapes text. The KV `banner` URL must be `https:` only, must not resolve to a private or loopback
  host, must be `image/*`, and is capped at 2 MB. Validate every ID as a snowflake (`^\d{17,20}$`).

## 6. Themes (my call: 7 themes, each with `mode=dark|light`)

Each theme follows `docs/DESIGN-discord.md`: deep-indigo canvas, Blurple `#5865f2` primary, green `#35ed7e` only for
highest-intent accents, magenta `#ec48bd`, generous radii, a heavy display weight for names, and no flat grey canvases.
Light mode uses Discord's light palette but keeps the same brand chord.

| theme | Purpose |
|---|---|
| `profile` (default) | Discord profile-popout style: banner strip (KV banner → nameplate → accent gradient), avatar + decoration overlapping, status dot, display name, @username, guild tag chip, badges, custom-status bubble, platform icons, optional KV bio/pronouns, activity + Spotify sections. |
| `nitro` | Signature look: indigo canvas with an animated Blurple→violet→magenta gradient mesh, big all-caps display name, glowing avatar ring. |
| `member` | Discord member-list row with the nameplate as background: avatar + decoration, name, tag, one status/activity line. |
| `compact` | Slim single row for tight READMEs: avatar, name, status, current activity. |
| `activity` | Activity-first: large art for the current game/Spotify/stream, progress or elapsed clock, small identity header. |
| `glass` | Frosted glass card over a blurred avatar/banner backdrop. |
| `badge` | Tiny shields-style pill: status dot + "Playing X" / "Listening to Y" / custom status. |

## 7. Query params (snake_case, same as the Spotify repo; shared by `/api/{id}` and `/live/{id}`)

`theme`, `mode` (`dark`|`light`), `accent` (hex, default `5865f2`), `bg` (hex or `transparent`), `radius` (px, default 16),
`width` (theme-clamped), `animated` (default `true`; animated avatar/decoration/nameplate where possible),
`max_activities` (1–4, default 2), `idle_text`, `name_gradient` (dash-separated hex) + `force_gradient`,
`show_banner` (uses KV `banner`), and the hide toggles: `hide_decoration`, `hide_nameplate`, `hide_tag`, `hide_badges`,
`hide_status`, `hide_platforms`, `hide_custom_status`, `hide_activity`, `hide_spotify`, `hide_timestamps`, `hide_kv`.
Invalid values fall back to defaults and never cause a 500. The theme registry declares which params each theme supports,
so Studio can show only the relevant controls (same idea as `getThemeFeatures()` in the Spotify builder).

## 8. Site pages

- `/` **Card Studio**. It follows the DESIGN doc's marketing language: indigo canvas with gradient mesh, heavy display
  headline (Hanken Grotesk 800 via `next/font`, `vietnamese` subset) and Inter body, Blurple buttons, and green for the
  primary copy action. It has a Discord ID input (default demo ID), a **live preview** (WebSocket), a theme gallery,
  options limited to what the theme supports, and an output panel with tabs: Markdown (image linked to
  `https://discord.com/users/{id}`), HTML `<img>`, a `<picture>` dark/light snippet, the iframe embed for the live card,
  and the raw SVG URL. It also has copy buttons, reset, and a short "Join discord.gg/lanyard" explainer with KV setup tips.
- `/live/{id}`: live card only, transparent background, auto-sized for iframes.
- `/api/{id}`: the SVG. The error and not-monitored states are themed cards with status 200, so READMEs never show a
  broken image.
- Base site URL comes from `NEXT_PUBLIC_SITE_URL` with request-origin fallback. The deploy domain is still undecided
  (pending the owner's Vercel setup), so docs use one placeholder constant that is easy to replace.

## 9. Repo docs (mirror `../spotify-github-profile`)

`README.md` (intro, quick start, theme gallery from generated `public/examples/*.svg`, link to wiki), `wiki/Home.md`
(single page with a TOC: every theme, every param, live card, KV keys, self-hosting, development), `LICENSE`,
`AGENTS.md` (Vietnamese, same shape as the Spotify one), `CLAUDE.md` (`@AGENTS.md` + note), `GEMINI.md` (`@./AGENTS.md`),
`docs/PROJECT.md`, `docs/PROGRESS.md`, `docs/memory/{gotchas,decisions,history}.md`,
`docs/skills/{session-handoff,graphify-navigation,discord-card}/SKILL.md`, `.graphifyignore`, `/graphify-out` in `.gitignore`,
`.github/workflows/ci.yml` (install, lint, typecheck, test, build). Add `scripts/generate-examples.ts` to render every
theme from a fixture (and optionally the live demo ID) into `public/examples/`.

## 10. Build order (my call: phases instead of a separate plan document; each phase is one Opus agent)

1. **Foundation**: scaffold; `lib/lanyard`, `lib/discord`, options, asset inliner, SVG renderer, `profile` theme,
   `/api/[id]`, error/not-monitored cards, Vitest suites (normalizer, URL builders, options, measure, render smoke),
   CI, fixtures (real JSON snapshot of the demo user plus synthetic ones: game with timestamps, Spotify, streaming, no
   decoration, offline, not monitored).
2. **Themes** (parallel with 3): the other 6 themes, light mode, examples generator + `public/examples/`. Owns only
   `src/card/themes/*`, theme-registry entries, `scripts/`, `public/examples/`.
3. **Live + Studio** (parallel with 2): `useLanyard`, `/live/[id]`, Studio `/`, embed-code builder + tests. Owns only
   `src/hooks/`, `src/app/(site)` pages/styles, `src/lib/embed.ts`, and Studio components.
4. **Docs**: everything in section 9, plus `python -m graphify update .` in the repo.
5. **Review**: a fresh code-review agent, then fixes, then a full `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
   and a visual check of every theme (headless Edge/Chrome screenshot of the SVGs).

During parallel phases, agents never edit files they do not own, never add dependencies (they request them in their
report instead), and do not run `next build`. They only run their own tests and `tsc`.

## 11. Done when

Every theme renders correctly for the demo ID and all fixtures in both modes, and the SVG opens in a browser `<img>` with
no external requests. The live card updates within seconds of a Discord status change without a reload. Studio produces
working Markdown/HTML/iframe snippets. Lint, typecheck, tests and build are all green. Docs and checkpoint are complete.

## Open (owner)

- Production domain / Vercel project for this repo: `https://discord-pulse-lian.vercel.app` (Vercel project `discord-pulse`). The old domain `lianharman-discord.vercel.app` still serves the old repo.
- When to commit and push.
