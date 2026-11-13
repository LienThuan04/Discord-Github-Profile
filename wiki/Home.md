# Discord-Github-Profile Wiki

Discord presence cards for GitHub READMEs and websites, by [LianHarman(LienThuan04)](https://github.com/LienThuan04). Everything is on this one page.

**Deploy first:** replace `https://YOUR-DEPLOYMENT.vercel.app` with your deployment's origin. A production domain has not been selected.

**Quick start:** join [Lanyard](https://discord.gg/lanyard), copy your Discord user ID and open [Card Studio](https://YOUR-DEPLOYMENT.vercel.app).

## Contents

1. [Card Studio](#card-studio)
2. [Themes](#themes)
3. [Options](#options)
4. [Profile extras and privacy](#profile-extras-and-privacy)
5. [README snapshot](#readme-snapshot)
6. [Live card](#live-card)
7. [Lanyard KV](#lanyard-kv)
8. [Self-hosting Lanyard](#self-hosting-lanyard)
9. [Deploying to Vercel](#deploying-to-vercel)
10. [Caching and GitHub Camo](#caching-and-github-camo)
11. [SVG size tips](#svg-size-tips)
12. [Troubleshooting](#troubleshooting)
13. [Development](#development)

## Card Studio

1. Enable Discord's **Settings → Advanced → Developer Mode**, then right-click your profile and **Copy User ID**. Use the 17–20 digit number, rather than your username or server ID.
2. Enter it in [Card Studio](https://YOUR-DEPLOYMENT.vercel.app) and choose **Load presence**. The default demo ID is `983724520789655613`.
3. Pick a theme and dark or light appearance. Studio shows only the controls declared by that theme.
4. Adjust colors, width, radius, animation and visible sections. Text fields apply on blur or Enter. Switch between the live preview and the SVG snapshot to check the actual image output.
5. Copy **Markdown**, **HTML**, **Picture**, **Live iframe** or **SVG URL**. Markdown links the image to your Discord profile; Picture chooses dark/light images using `prefers-color-scheme`. Live iframe includes a resize listener for your website.

Studio keeps shareable settings in its URL. `/?id=983724520789655613&theme=member` opens a preconfigured editor. The Studio-only `id` query is a 17–20 digit string; missing or invalid values use the demo ID. API/live routes put the ID in the path instead. **Reset** restores the demo ID and default options. If clipboard access fails, Studio selects the code for manual copying.

[↑ Back to contents](#contents)

## Themes

All fifteen themes support dark and light modes. Sizes are CSS pixels before responsive scaling and collectible-frame overflow. Tall themes calculate height from visible content. The live wrapper scales down to fit its container.

| Theme | Purpose | Card body size, before collectible-frame overflow |
|---|---|---|
| `profile` | Discord profile popout | 300–600 wide; content height |
| `nitro` | Bold color and glowing avatar | 300–600 wide; content height |
| `member` | Member-list row | 360–420 wide; 96 high |
| `compact` | Slim presence strip | 300–600 wide; 68 high |
| `activity` | Current activity and artwork | 300–600 wide; content height |
| `glass` | Frosted panels | 300–600 wide; content height |
| `badge` | Tiny presence pill | Content-sized width; 32 high; ignores `width` |
| `chat` | Discord message and embeds | 300–600 wide; content height |
| `banner` | Wide identity banner | 600–1000 wide (default 800); 200 high |
| `terminal` | Command-line presence | 300–600 wide; content height |
| `neon` | Glowing panels | 300–600 wide; content height |
| `retro` | Pixel game interface | 300–600 wide; content height |
| `polaroid` | Still photo and caption | Photo frame clamped to 300–400, plus 36 horizontal / 42 vertical margin; height follows photo |
| `mobile` | Lock-screen notifications | 320–400 wide; content height |
| `voice` | Voice-channel tile | 300–600 wide; 5:3 aspect ratio |

### Supported controls by theme

All themes support `theme`, `mode`, `accent`, `bg`, `hide_status`, `hide_activity`, `hide_spotify`, `hide_custom_status`, `idle_text`, `banner_source`, `hide_effect`, `hide_badges` and `hide_frame`. Other section/identity controls depend on the layout. Studio only offers controls in that theme's [metadata](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/src/card/theme-registry.ts), and omits unsupported parameters from copied URLs. `profile`, `nitro` and `glass` support every option except `tz`; `tz` applies to `chat`, `mobile` and `polaroid`.

`member`, `compact` and `badge` use small static identity artwork; `activity` also uses a static avatar. Compact and activity omit avatar decorations. On member/compact, `animated` can still affect supported display-name effects. Badge's visible radius is capped at 16px. Polaroid is always static; mobile and retro keep their fixed silhouettes.

### Style axes

The eight axes use CSS, inline SVG and system fonts without extra image/font requests. They do not change card dimensions. Animation follows `animated` and `prefers-reduced-motion`; every choice has a still appearance. A visible avatar decoration suppresses line rings, softens glow/pulse halos and makes `status_style=ring` fall back to a dot. `hide_status` also removes a status-colored ring.

| Themes | Supported style axes |
|---|---|
| `profile`, `nitro`, `member`, `compact`, `activity`, `glass`, `chat`, `banner`, `neon` | All eight: `avatar_shape`, `ring`, `pattern`, `effect`, `status_style`, `eq_style`, `font`, `border` |
| `badge` | `pattern`, `effect`, `border` |
| `terminal` | `pattern`, `effect`, `border`, `eq_style` |
| `retro` | `pattern`, `eq_style` |
| `mobile` | `pattern`, `effect`, `border`, `font`, `eq_style` |
| `voice` | `avatar_shape`, `pattern`, `effect`, `border`, `font`, `eq_style` |
| `polaroid` | None; keeps its photograph presentation |

See the [style gallery](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/public/examples/styles/index.html) for every value on a fixed base card, plus all `banner_source` choices and both values of `hide_effect` / `hide_frame`. All accepted values and defaults appear in [Options](#options). `effect` styles and the Discord profile effect controlled by `hide_effect` are independent.

Full themes show custom status separately from activities. Playing (type 0), Streaming (1), Listening (2), Watching (3) and Competing (5) can include details, state, artwork, party size, timestamps and up to two button labels when Lanyard supplies them. Custom status (4) supports Unicode and custom emoji. Activity buttons are presentation only: Discord supplies labels without action URLs.

Member, compact and badge choose Spotify first, then the first visible activity, then custom status or an idle/status fallback. Activity uses custom status text or `idle_text` in its idle panel. `max_activities` limits layouts with multiple activity sections; Spotify is separate. Badges merge exposed public flags with the profile provider's badge list; Nitro or boost ownership is only shown when supplied, never inferred. Native display-name styles use best-effort system-font/effect mappings.

### Dark and light previews

| Theme | Dark | Light |
|---|---|---|
| Profile | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/profile-dark.svg" width="280" alt="Profile dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/profile-light.svg" width="280" alt="Profile light" /> |
| Nitro | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/nitro-dark.svg" width="280" alt="Nitro dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/nitro-light.svg" width="280" alt="Nitro light" /> |
| Member | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/member-dark.svg" width="280" alt="Member dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/member-light.svg" width="280" alt="Member light" /> |
| Compact | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/compact-dark.svg" width="280" alt="Compact dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/compact-light.svg" width="280" alt="Compact light" /> |
| Activity | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/activity-dark.svg" width="280" alt="Activity dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/activity-light.svg" width="280" alt="Activity light" /> |
| Glass | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/glass-dark.svg" width="280" alt="Glass dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/glass-light.svg" width="280" alt="Glass light" /> |
| Badge | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/badge-dark.svg" width="256" alt="Badge dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/badge-light.svg" width="256" alt="Badge light" /> |
| Chat | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/chat-dark.svg" width="280" alt="Chat dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/chat-light.svg" width="280" alt="Chat light" /> |
| Banner | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/banner-dark.svg" width="280" alt="Banner dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/banner-light.svg" width="280" alt="Banner light" /> |
| Terminal | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/terminal-dark.svg" width="280" alt="Terminal dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/terminal-light.svg" width="280" alt="Terminal light" /> |
| Neon | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/neon-dark.svg" width="280" alt="Neon dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/neon-light.svg" width="280" alt="Neon light" /> |
| Retro | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/retro-dark.svg" width="280" alt="Retro dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/retro-light.svg" width="280" alt="Retro light" /> |
| Polaroid | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/polaroid-dark.svg" width="280" alt="Polaroid dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/polaroid-light.svg" width="280" alt="Polaroid light" /> |
| Mobile | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/mobile-dark.svg" width="280" alt="Mobile dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/mobile-light.svg" width="280" alt="Mobile light" /> |
| Voice | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/voice-dark.svg" width="280" alt="Voice dark" /> | <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/voice-light.svg" width="280" alt="Voice light" /> |

The [complete fixture gallery](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/public/examples/index.html) also includes every theme × dark/light with profile extras (frame, effect and banner color). Preview text is synthetic; no real bio is bundled.

[↑ Back to contents](#contents)

## Options

Use the same 35 snake_case query parameters on `/api/{id}` and `/live/{id}`. The authoritative parser is [src/lib/options.ts](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/src/lib/options.ts), with style values in [src/lib/style-options.ts](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/src/lib/style-options.ts); theme support comes from the [registry](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/src/card/theme-registry.ts) and each theme's metadata.

Unknown keys are ignored. Repeated keys use the first value. Invalid fields fall back independently. Finite numeric values are rounded and clamped; empty, nonnumeric or nonfinite values use the default. Boolean URL values are exactly `true` or `false`.

Style values and `banner_source` are case-insensitive and trimmed. Other enums use the listed spelling. `tz` accepts named IANA zones and rejects numeric offsets.

Colors accept 3, 6 or 8 hex digits, with an optional `#`; use bare hex in URLs, or encode `#` as `%23`. Three-digit colors expand to six digits; eight-digit colors include alpha. The background default is theme-specific and automatic rather than a URL value named `null`. `banner_source=profile` tries the KV override and profile tiers, then accent; `nameplate` tries only nameplate then accent; `accent` uses native theme art; `none` removes banner artwork and Nitro tint. `show_banner` affects only the KV override.

| Parameter | Accepted values | Default | Effect |
|---|---|---|---|
| `theme` | `profile`, `nitro`, `member`, `compact`, `activity`, `glass`, `badge`, `chat`, `banner`, `terminal`, `neon`, `retro`, `polaroid`, `mobile`, `voice` | `profile` | Card layout |
| `mode` | `dark`, `light` | `dark` | Appearance |
| `accent` | 3, 6 or 8 hex digits; optional `#` | `5865f2` | Accent; this default allows valid KV `accent` to take precedence |
| `bg` | Hex color or `transparent` | Automatic (`null` internally) | Theme background; overlays can remain visible |
| `radius` | Number, 0–48px | `16` | Outer radius where supported; badge caps it at 16px |
| `width` | Number, 300–600px; banner 600–1000px | `420`; banner `800` | Card body width before responsive scaling; member/mobile/polaroid apply their own clamps; badge sizes itself |
| `animated` | `true`, `false` | `true` | Supported motion/assets; SVG nameplates and profile effects use still art; polaroid is always static |
| `max_activities` | Number, 1–4 | `2` | Non-Spotify activity count on layouts with multiple sections; Spotify is separate |
| `idle_text` | Trimmed nonempty text, at most 120 characters | `Enjoying a quiet moment` | Idle message |
| `name_gradient` | 2–8 hex colors separated by `-` | `[]` (no custom gradient) | Custom name gradient; native Discord colors win unless forced |
| `force_gradient` | `true`, `false` | `false` | Let a valid custom gradient override native name colors |
| `show_banner` | `true`, `false` | `true` | Enable the KV banner override when `hide_kv=false`; other banner tiers still apply |
| `hide_decoration` | `true`, `false` | `false` | Hide avatar decoration |
| `hide_nameplate` | `true`, `false` | `false` | Hide nameplate artwork; other banner tiers still apply |
| `hide_tag` | `true`, `false` | `false` | Hide guild/server tag |
| `hide_badges` | `true`, `false` | `false` | Hide merged public-flag and profile badges |
| `hide_status` | `true`, `false` | `false` | Hide status indicators and status wording where supported |
| `hide_platforms` | `true`, `false` | `false` | Hide desktop/web/mobile/console/VR indicators |
| `hide_custom_status` | `true`, `false` | `false` | Hide custom-status text and emoji |
| `hide_activity` | `true`, `false` | `false` | Hide non-Spotify activities; summaries use the next visible source |
| `hide_spotify` | `true`, `false` | `false` | Hide Spotify content |
| `hide_timestamps` | `true`, `false` | `false` | Hide activity clocks and progress bars |
| `hide_kv` | `true`, `false` | `false` | Hide bio/About Me and pronouns from KV and profile, KV location/website and the KV banner; KV accent remains independent |
| `avatar_shape` | `circle`, `squircle`, `square`, `hexagon`, `octagon` | `circle` | Avatar silhouette |
| `ring` | `status`, `none`, `accent`, `gradient`, `rainbow`, `glow`, `pulse`, `dashed`, `double` | `status` | Avatar ring; visible decorations suppress line rings and soften halo rings |
| `pattern` | `none`, `dots`, `grid`, `diagonal`, `waves`, `stars`, `circuit`, `confetti`, `bubbles`, `aurora`, `noise`, `hex` | `none` | Background pattern |
| `effect` | `none`, `float`, `shimmer`, `glow`, `scanline`, `sparkle` | `none` | Decorative style effect, independent of Discord profile effects |
| `status_style` | `dot`, `pill`, `text`, `ring` | `dot` | Presence indicator; ring falls back to dot with a visible decoration |
| `eq_style` | `bars`, `wave`, `pulse`, `dots`, `line`, `blocks`, `mirror`, `circle`, `spectrum`, `none` | `bars` | Equalizer beside Spotify or Listening titles |
| `font` | `default`, `rounded`, `mono`, `serif`, `condensed`, `display` | `default` | System font stack; explicit choices override native name fonts |
| `border` | `subtle`, `none`, `accent`, `gradient`, `glow` | `subtle` | Card border |
| `banner_source` | `auto`, `profile`, `nameplate`, `accent`, `none` | `auto` | Banner family; `auto` tries KV → profile image → Nitro colors → banner color → nameplate → accent (member prefers nameplate) |
| `hide_effect` | `true`, `false` | `false` | Hide the Discord profile effect, independently of the `effect` style |
| `hide_frame` | `true`, `false` | `false` | Hide the collectible frame; otherwise its overflow grows the output canvas |
| `tz` | Named IANA time zone, e.g. `Asia/Ho_Chi_Minh` | `UTC` | Chat/mobile clock and polaroid date; invalid zones and numeric offsets fall back to UTC; Studio initially uses the browser zone |

Example:

```text
https://YOUR-DEPLOYMENT.vercel.app/api/983724520789655613?theme=profile&mode=light&accent=ec48bd&width=420&animated=false&name_gradient=5865f2-ec48bd&force_gradient=true
```

[↑ Back to contents](#contents)

## Profile extras and privacy

All themes wear your collectible profile frame by default. `hide_frame=true` removes it. Frames grow the SVG/live canvas by their scaled overflow; `width` continues to mean card width. Failed frame layers disappear together without changing reserved dimensions. Banner art and effects render at full strength. Short layouts place effects behind readable foreground text and panels; tall layouts retain Discord-style overlay art. Small themes use your profile color as their accent.

<img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/profile-extras-dark.svg" width="280" alt="Profile with synthetic About Me, Discord banner and profile effect" /> <img src="https://github.com/LienThuan04/Discord-Github-Profile/raw/main/public/examples/profile-extras-light.svg" width="280" alt="Light profile with synthetic About Me and profile extras" />

Nitro theme colors tint the surface; a solid profile banner gets a subtle sheen. KV bio/pronouns override Discord About Me, with `hide_kv` hiding both. The optional profile provider and cache behavior are documented in [the theme contract](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/docs/THEME-CONTRACT.md#profile-extras).

Profile effects use a compact still frame in README SVGs and timed APNG layers in live cards (a still for reduced motion or `animated=false`). Use `hide_effect=true` to hide them. All 15 themes fetch profile data. Studio exposes a visible **Show on card** group of accessible switches for effect, frame, banner, an opt-in **Nameplate background** (off by default; sets `banner_source=nameplate` so the nameplate art replaces the profile banner), decoration, nameplate, guild tag, badges, status, platforms, custom status, activity, Spotify, timestamps and About/KV, filtered by theme support. Switching themes or IDs, re-enabling the effect, or pressing **Replay effect** restarts its intro (reduced motion stays static). Studio shows source/timezone controls only for supported themes, and fetches public normalized profile data from `/api/{id}/profile` once per user ID.

### Sources and environment

The card combines optional public sources; missing, invalid or slow extras leave a usable presence card. Lanyard and profile requests run in parallel. Profile callers wait at most 1,500ms; unfinished upstream requests can warm the cache for the next render. Successful profiles cache for 10 minutes, failures/degraded responses for one minute, and collectible catalogs for 24 hours (failed catalog lookups for 10 minutes).

| Source | What it supplies | Configuration |
|---|---|---|
| [Lanyard](https://github.com/Phineas/lanyard) REST/WebSocket | Presence, activities, Spotify, exposed user cosmetics/public flags and six whitelisted KV keys | Public endpoints work without secrets; self-hosting variables below |
| Public `https://dcdn.dstn.to/profile/{id}` mirror | Profile bio/pronouns, banner and banner color, Nitro theme colors, effect/frame identifiers and extra badges | `DISCORD_PROFILE_PROVIDER=dstn` by default; `off` disables it; `DISCORD_PROFILE_PROVIDER_URL` overrides the base URL |
| Official Discord `GET /api/v10/users/{id}` | Banner and accent color; wins over mirror values when supplied | Optional server-only `DISCORD_BOT_TOKEN`; no user token or OAuth flow |
| Public Discord `GET /api/v10/collectibles-products/{sku}` | Effect still/APNG layers and type-3 profile-frame geometry/artwork, fetched from Discord's CDN | No token; used when a public profile supplies the SKU |

The dstn mirror is **unofficial**, independent of Discord and this project, and has no availability guarantee. It receives the user IDs requested from it. Discord's public collectibles endpoint is undocumented and can change; failures omit the unavailable artwork.

| Profile variable | Default | Purpose |
|---|---|---|
| `DISCORD_PROFILE_PROVIDER` | `dstn` | Enable the public mirror; set `off` to disable |
| `DISCORD_PROFILE_PROVIDER_URL` | Empty → `https://dcdn.dstn.to` | Compatible mirror base; app appends `/profile/{id}` |
| `DISCORD_BOT_TOKEN` | Empty | Optional official user lookup; server-only, never prefix with `NEXT_PUBLIC_` |

See [.env.example](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/.env.example). Public Lanyard and the default mirror require no credentials. A Discord bot can be created in the [Developer Portal](https://discord.com/developers/applications); keep its token only in server environment settings.

### Privacy and visibility

The card displays what the user's public Discord profile and whitelisted Lanyard KV expose. KV bio/pronouns override profile text independently. **`hide_kv=true` hides bio/About Me and pronouns from both KV and profile, KV location/website and the KV banner.** The KV accent and separately controlled profile artwork remain available. Use `banner_source=none`, `hide_effect=true`, `hide_frame=true`, `hide_badges=true` and the other `hide_*` options for the corresponding content.

These switches control rendered content; they do not make public upstream data private or disable profile lookup. Set `DISCORD_PROFILE_PROVIDER=off` to stop mirror requests. Never put secrets in public KV. Bundled examples use placeholder bio text.

[↑ Back to contents](#contents)

## README snapshot

```markdown
[![Discord presence](https://YOUR-DEPLOYMENT.vercel.app/api/YOUR_DISCORD_ID?theme=profile)](https://discord.com/users/YOUR_DISCORD_ID)
```

`GET /api/{id}` returns `image/svg+xml; charset=utf-8`. Invalid IDs, unmonitored accounts and unavailable presence produce themed error images with HTTP 200, so an expected data error remains readable in a README.

The SVG contains the shared React card inside `foreignObject`, with remote artwork inlined as data URIs and system fonts. CSS can animate snapshot clocks/progress and cosmetic effects. It cannot receive new presence, pauses, seeks or song changes; those require a fresh image response. Clock animations have bounded run times and stop at a known activity endpoint.

[↑ Back to contents](#contents)

## Live card

Open `/live/{id}` with the same supported options. The page background is transparent; use `bg=transparent` if you also want a transparent card base. Theme overlays may remain visible. A normal React tree uses direct asset URLs, a Lanyard WebSocket and a JavaScript clock refreshed each second. Nameplate video is available on full themes when animation is enabled.

### Iframe and auto-resize

Card height changes when activities or sections change. The embedded page sends `postMessage({ type: 'dgp:height', height }, '*')` to its parent, with its scaled height in pixels. Copy Studio's complete iframe snippet, or use:

```html
<iframe id="dgp-card"
  src="https://YOUR-DEPLOYMENT.vercel.app/live/983724520789655613?theme=profile"
  title="Live Discord presence" width="420" height="416"
  style="border:0;width:100%;max-width:420px" loading="lazy"></iframe>
<script>
  (() => {
    const frame = document.getElementById('dgp-card');
    window.addEventListener('message', (event) => {
      if (event.origin !== new URL(frame.src).origin ||
          event.source !== frame.contentWindow) return;
      const { type, height } = event.data || {};
      if (type === 'dgp:height' && Number.isFinite(height) &&
          height > 0 && height < 10000) {
        frame.style.height = Math.ceil(height) + 'px';
      }
    });
  })();
</script>
```

Give each iframe a unique ID when embedding multiple cards. Keep both origin and source checks, and use a finite positive height below 10,000px. Without the listener the iframe keeps its initial height and may clip new content. GitHub READMEs do not execute this embed.

### Connection behavior and fallback

The server fetches an initial REST snapshot. In the browser, the lazy `useLanyard` subscription opens one connection per mounted hook and cleans it up when unused or when the ID changes. Server rendering opens no WebSocket.

The client receives Hello (op 1), subscribes with op 2 and sends heartbeats (op 3) at the server's interval. Validated `INIT_STATE` and `PRESENCE_UPDATE` events update the card. A quiet presence is healthy: Lanyard does not send heartbeat acknowledgements. After at least 90 seconds of silence (or three heartbeat intervals, whichever is longer), the client resubscribes to request a fresh state. A missed 10-second handshake/probe triggers reconnect backoff.

Retries use exponential delay with jitter. Five failures switch to an immediate REST request followed by polling every 30 seconds. A WebSocket recovery attempt follows five minutes later. Browser polling uses the host and path prefix from `NEXT_PUBLIC_LANYARD_WS_URL`; REST requests have a five-second timeout. Transient failures retain the last known presence when available; an unmonitored polling result clears it. The connection status is available in Studio and as accessible status text on the live page.

[↑ Back to contents](#contents)

## Lanyard KV

Lanyard does not include your Discord bio or profile banner in its standard user fields. Its public KV store lets you override the optional profile sources for this card. This card reads only the six keys below; other keys are ignored. Treat these values as public profile information.

| Key | Accepted value | Card limit or behavior |
|---|---|---|
| `bio` | Text | Trimmed to 240 characters; full themes show up to two lines |
| `pronouns` | Text | Trimmed to 40 characters |
| `location` | Text | Trimmed to 80 characters |
| `website` | Absolute HTTPS URL without credentials | Display label capped at 80 characters; SVG text is presentational |
| `banner` | Public HTTPS image URL without credentials | SVG download capped at 2 MiB; public DNS, MIME/signature, port and redirect checks apply. Arbitrary SVG banners are refused |
| `accent` | 3, 6 or 8 hex digits, optional `#` | Used when query accent equals the default `5865f2` |

Join [the Lanyard server](https://discord.gg/lanyard), select the **Lanyard bot's** `/set` command and fill its key/value fields. For example:

```text
/set key:bio value:Building little things for the internet
/set key:pronouns value:he/him
/set key:location value:Vietnam
/set key:website value:https://github.com/LienThuan04
/set key:accent value:ec48bd
```

For `banner`, use `/set` with key `banner` and a direct public HTTPS image URL as the value. Remove a key with `/del key:bio`. Follow the bot's current command help if its interface changes. Bot commands and the optional authenticated KV API are documented in [Lanyard's KV guide](https://github.com/Phineas/lanyard#kv). Public presence reads need no API key; this app has no KV write token setting. KV changes emit presence updates, so the live card follows them too.

[↑ Back to contents](#contents)

## Self-hosting Lanyard

This app can use a compatible Lanyard instance. Running the upstream service, its bot and Redis is separate from deploying this card; follow [Lanyard's self-hosting instructions](https://github.com/Phineas/lanyard#self-host-with-docker).

Start with [.env.example](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/.env.example) in the repository root:

| Variable | Default | Used by |
|---|---|---|
| `LANYARD_API_URL` | `https://api.lanyard.rest/v1` | Server REST fetches; `/users/{id}` is appended |
| `NEXT_PUBLIC_LANYARD_WS_URL` | `wss://api.lanyard.rest/socket` | Browser WebSocket and REST polling fallback |
| `NEXT_PUBLIC_SITE_URL` | Empty | Studio embed origin; empty uses the browser's request origin |

Set both Lanyard URLs to your instance. The REST base must include `/v1` and the WebSocket path must end in `/socket`. Browser fallback changes `wss` to `https`, replaces trailing `/socket` with `/v1/users/{id}` and preserves a path prefix. Ensure that REST endpoint permits your card site's browser origin through CORS. Monitor your account on that instance through its bot/server.

Use HTTPS/WSS in production. Restart local development after environment changes. Public Next.js variables are bundled at build time, so rebuild/redeploy after changing the public socket URL; Vercel environment changes also require a new deployment. See [Vercel environment variables](https://vercel.com/docs/environment-variables).

[↑ Back to contents](#contents)

## Deploying to Vercel

1. Put this repository in your own GitHub account and import it as a **new Vercel project**. Select the repository root and Next.js framework preset. Follow [Vercel's Next.js guide](https://vercel.com/docs/frameworks/full-stack/nextjs).
2. Use the repository's Node.js `24.x` pin to match CI; Vercel supports this line and honors [`engines.node`](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions#version-overrides-in-package.json). Set `ENABLE_EXPERIMENTAL_COREPACK=1` in the Vercel project so [Corepack](https://vercel.com/docs/builds/configure-a-build#corepack) uses the pinned `pnpm@11.22.0` from `packageManager`. Install with `pnpm install --frozen-lockfile`; build with `pnpm build`; let Next.js select the output directory. On Windows these commands use `pnpm.cmd`.
3. Keep the two public Lanyard endpoints at their defaults unless self-hosting. Set `NEXT_PUBLIC_SITE_URL` to your chosen public HTTPS origin, or leave it empty to use each deployment's request origin.
4. Deploy. Set or correct environment variables for the appropriate Production/Preview environment, then redeploy. The card needs no database or OAuth setup. `DISCORD_BOT_TOKEN` is optional and server-only; the default public mirror works without it. Set `DISCORD_PROFILE_PROVIDER=off` if you do not want mirror requests.
5. Replace every `https://YOUR-DEPLOYMENT.vercel.app` in your copied embeds and documentation with the actual origin. Test `/`, `/api/983724520789655613` and `/live/983724520789655613`, including one light theme and one live status change.
6. Confirm the API image is publicly accessible without a login/protection page before embedding it in GitHub. Check the rendered README separately because Camo can cache an older response.

The owner has not selected this repository's production domain or Vercel project yet.

[↑ Back to contents](#contents)

## Caching and GitHub Camo

The API sends:

```http
Content-Type: image/svg+xml; charset=utf-8
Cache-Control: public, max-age=0, s-maxage=30, stale-while-revalidate=3600
X-Content-Type-Options: nosniff
```

The edge can reuse a snapshot for 30 seconds and serve a stale response while refreshing during the following 3,600-second window. This reduces cold-start and asset-download delays. It is a cache policy, not a guarantee that GitHub refreshes every 30 seconds. Error images have the same policy.

GitHub proxies images through Camo and can retain a snapshot independently. Its proxy fetch does not run the live card's JavaScript or open a socket. SVG artwork is inlined because external image loads inside the image cannot be relied on. A direct URL working in your browser does not prove the GitHub proxy can fetch it quickly.

For diagnostics, compare the direct image, its HTTP content type/cache headers, and the README image. Keep the long stale-while-revalidate window when tuning performance. GitHub documents content-type checks and a sparingly used Camo purge in its [image troubleshooting guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls#troubleshooting-issues-with-camo). Purging an image affects all viewers of that cached image.

[↑ Back to contents](#contents)

## SVG size tips

- Try `animated=false` first. Static avatars and decorations can save far more bytes than changing the layout alone.
- Choose `badge`, `compact` or `member` for small identity assets and fewer sections. Activity is also small when there is no large artwork.
- Use `hide_decoration=true`, `hide_effect=true` or `hide_frame=true` when artwork dominates. `banner_source=none` removes banner artwork; `show_banner=false` only disables the KV override and can still show profile/nameplate fallbacks.
- Reduce `max_activities` on full themes. Keep banner source images modest; the 2 MiB banner download cap is not a final SVG budget.
- Aim below **1,000,000 response bytes**, including base64 overhead. A visually small card can still contain large animated art. Failed or over-budget assets use safe placeholders.

[↑ Back to contents](#contents)

## Troubleshooting

### Not monitored

“Join discord.gg/lanyard to show your presence” means Lanyard is not monitoring that ID. Join the server with the account whose user ID you copied, check Developer Mode → Copy User ID, and wait for the service to register it. On a private instance, join its configured server instead. An offline card is a valid presence, not an unmonitored error.

### Broken image

Replace the placeholder origin and `YOUR_DISCORD_ID`, open the API URL directly and confirm it returns SVG rather than a login page or an HTML error. A user ID must be 17–20 digits. Try a small theme with `animated=false`; compare direct and GitHub-proxied responses. Invalid input and expected presence failures should show a themed HTTP 200 card. A completely broken image points to deployment, response, proxy or browser rendering trouble. Missing individual artwork can be an upstream CDN failure or a rejected/over-budget asset.

### Stale image

A README is a cached snapshot. CSS clocks advancing do not mean presence is being fetched again. Check the direct API URL, allow edge and Camo caches to refresh, and consult [Caching and GitHub Camo](#caching-and-github-camo). Use the live iframe on your own website when changes must appear without reloading.

### Live card stays disconnected or is clipped

Check the public socket URL, browser connectivity and self-hosted REST CORS. After repeated failures, polling can take up to 30 seconds between updates. Keep the complete iframe resize listener and its origin/source checks. If `NEXT_PUBLIC_LANYARD_WS_URL` changed, rebuild/redeploy so the browser receives the new value.

[↑ Back to contents](#contents)

## Development

Use Node.js `24.x` (matching CI and `engines.node`) and pnpm 11.22.0. Run from the repository root; on Windows use `pnpm.cmd` to avoid PowerShell's `.ps1` execution policy. Copy the environment example only if you do not already have a local `.env`:

```powershell
Copy-Item .env.example .env
pnpm.cmd install --frozen-lockfile
pnpm.cmd dev
```

Open localhost on port 3000. Public Lanyard works without secrets. The project uses Next.js App Router, React, strict TypeScript, Zod, CSS Modules, ESLint and Vitest. The [project map](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/docs/PROJECT.md) describes the layout.

| Command | Purpose |
|---|---|
| `pnpm.cmd dev` | Development server |
| `pnpm.cmd lint` | ESLint |
| `pnpm.cmd typecheck` | TypeScript without emitting files |
| `pnpm.cmd test` | Complete Vitest suite |
| `pnpm.cmd build` | Production build |
| `pnpm.cmd start` | Serve a production build |
| `pnpm.cmd examples` | Regenerate deterministic offline SVG examples, galleries and manifest |
| `python scripts/check-doc-links.py --remote` | Check README/wiki local paths, anchors and remote links |

### Generate and inspect examples

The [examples generator](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/scripts/generate-examples.ts) uses frozen fixtures and checked-in asset bytes, with no network. Its 136 public SVGs include 60 theme previews (15 themes × dark/light × with/without profile extras), 10 additional activity showcases and 66 style/control variants. The style gallery contains every style-axis value and the banner/effect/frame controls. Output is deterministic: the same fixtures produce identical bytes. The manifest records exact dimensions and byte sizes. Generated SVGs must be well-formed XML, contain no external asset URLs, and remain below 1,000,000 bytes. Fixture bios are synthetic.

```powershell
pnpm.cmd examples
pnpm.cmd examples --out-dir .verification/examples --matrix-dir .verification/theme-matrix
powershell -File scripts/screenshot-examples.ps1 -MatrixDir .verification/theme-matrix
```

`--out-dir` changes the gallery destination; `--matrix-dir` adds 300 SVGs (15 themes × 10 fixtures × 2 modes, including a sanitized frame profile) and per-theme HTML matrices. Open the gallery through browser `<img>` elements, then inspect each generated PNG matrix. The screenshot helper uses Chrome or Edge and an isolated profile. Check actual clipping, long names, missing artwork, light mode and timer boundaries; markup tests alone do not prove those visuals.

To inspect a deployed response's size and timing without changing it:

```powershell
curl.exe -sS -o .verification/card.svg -w "bytes=%{size_download} seconds=%{time_total}\n" "https://YOUR-DEPLOYMENT.vercel.app/api/983724520789655613?theme=profile&animated=false"
```

Create `.verification` first if needed. Repeat once after the cache is warm, then check the GitHub README separately. Cold and warm timings depend on upstream services and the deployment region. The maintained [discord-card workflow](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/docs/skills/discord-card/SKILL.md#4-check-svg-byte-size-and-github-camo-timing) records measured per-theme owner-card sizes and timings. Public Camo verification requires a chosen public deployment.

### Add or modify a theme

Follow the [theme contract](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/docs/THEME-CONTRACT.md) and the [discord-card workflow](https://github.com/LienThuan04/Discord-Github-Profile/blob/main/docs/skills/discord-card/SKILL.md). Keep `Component` pure, share layout constants with deterministic `measure()`, route every image through `assets`, register the theme and its supported parameters, and extend the option validator. Reuse the normalized view model for both SVG and live output.

Verify relevant fixtures, both modes, width limits, hides, offline/error states and clocks. Run lint, typecheck, tests and a build; regenerate examples and inspect browser screenshots. Update the theme/parameter reference here and the README gallery/options table. Runtime dependencies need a concrete reason, and all implementation is original under MIT.

[↑ Back to contents](#contents)
