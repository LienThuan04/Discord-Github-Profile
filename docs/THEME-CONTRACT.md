# Card theme contract

The shared card tree renders a GitHub SVG snapshot and, in Phase 3, a live card. Components are pure functions: no hooks, network access, browser globals or implicit clocks.

## Files and types

- `src/lib/lanyard/types.ts`: REST presence, cosmetics, activity and WebSocket protocol types.
- `src/lib/lanyard/normalize.ts`: `normalize(presence: LanyardPresence, { now: number }): CardData`. Time is supplied by the caller; normalization does not fetch or mutate the payload.
- `src/lib/lanyard/card-data.ts`: `CardData`, including identity, platforms, custom status, activities, Spotify and whitelisted KV.
- `src/lib/options.ts`: `CardOptions`, `OptionName`, `OPTION_NAMES`, `parseOptions(input: QueryInput): CardOptions`. Query names remain snake_case. Invalid values fall back independently. Profile width is 300–600px (default 420), radius 0–48px, and activity count 1–4.
- `src/card/types.ts`: `AssetResolver`, `CardProps`, `CardSize`, `CardError`, `ThemeDefinition` and `directAssets`.
- `src/card/theme-registry.ts`: `themes` and `getTheme(name)`, which falls back to profile.
- `src/card/parts/`: shared identity, activity, Spotify, progress and snapshot-clock components.
- `src/card/themes/profile.tsx`: profile component, `profileLayout()` and `profileTheme`. Its CSS lives in `profile-css.ts` and is scoped under `.dgp-profile` with prefixed keyframes.
- `src/lib/svg/render.tsx`: synchronous `renderSvg(data, options, assets, error?)` and asynchronous `renderInlinedSvg(data, options, error?, inlineOptions?)`.

```ts
interface CardProps {
  data: CardData;
  options: CardOptions;
  assets: AssetResolver;
  error?: CardError;
  target?: "svg" | "live";
}
interface ThemeDefinition {
  name: string;
  label: string;
  supportedParams: readonly OptionName[];
  usesProfile: boolean;
  measure(data: CardData, options: CardOptions, error?: CardError): CardSize;
  Component: ComponentType<CardProps>;
}
```

`measure()` returns the exact outer border-box width and height. Share section-height calculations with the component. Bound long content with ellipsis or an explicit line count; do not measure using DOM, text guesses, randomness or the current wall clock. Both `mode=dark` and `mode=light`, error cards and hide toggles must use the same calculations.

`AssetResolver` is `(url: string, kind?: "image" | "banner", fallback?: string | readonly string[]) => string`. Every image passes through `assets`; a raw remote `src` or CSS `url()` is forbidden. Animated avatars, decorations and emoji supply a static fallback; frames supply an ordered format/size fallback chain. Banner requests carry the `banner` kind so only that role can request a public HTTPS host beyond the CDN allowlist. SVG rendering collects the visible images, prefetches them in parallel, then supplies a data-URI resolver. Links/buttons in SVG images are presentational: Discord supplies button labels, not URLs.

## Add a theme

1. Add `src/card/themes/<name>.tsx`, implementing `ThemeDefinition`, and a scoped CSS string. Reuse `src/card/parts/` and `CardData`; never parse raw Discord payloads in a theme.
2. Define deterministic `measure()` and keep layout constants shared with the component.
3. Register it in `src/card/theme-registry.ts`. Extend the `theme` validator in `src/lib/options.ts`; list only supported controls in `supportedParams` for Studio.
4. Add fixture-based tests in `tests/`: both modes, narrow/wide widths, long text, hides, empty/offline/error states, clocks and exact dimensions.
5. Render SVGs using `renderInlinedSvg()`. Check well-formed XML, no external image references, and size under 1 MB. Inspect them through browser `<img>` elements.

## Render live in Phase 3

Keep the WebSocket subscription and ticking clock in a client wrapper outside `src/card/`. On `INIT_STATE` or `PRESENCE_UPDATE`, validate the presence and call `normalize(presence, { now: Date.now() })`; a timer refreshes `now` while activities are active. Pass the selected registry component `data`, `options`, `target="live"`, and `assets={directAssets}`. Apply the dimensions from `measure()`. This enables animated nameplate video when `animated=true`; SVG defaults to the static PNG. Client code must import the registry and card parts without importing `src/lib/svg/` or server fetching modules.

Do not hydrate `renderToStaticMarkup()` output. Mount the shared component as a normal React tree. Profile uses system fonts with Vietnamese coverage; Discord font/effect IDs receive best-effort open/system equivalents. Name gradients prefer native `display_name_styles` unless `force_gradient=true`.

Phase 1 ships only `profile`. The `nitro`, `member`, `compact`, `activity`, `glass` and `badge` themes belong to Phase 2; WebSocket hooks and Studio belong to Phase 3.

## Style axes

Eight optional query params restyle any theme that opts in. Values live in `src/lib/style-options.ts` (first value is the default); rendering lives in `src/card/styles/` (start with the usage block at the top of `src/card/styles/index.ts`).

| param | values (default first) | rendered by |
|---|---|---|
| `avatar_shape` | `circle`, `squircle`, `square`, `hexagon`, `octagon` | shared `Avatar` part |
| `ring` | `status`, `none`, `accent`, `gradient`, `rainbow`, `glow`, `pulse`, `dashed`, `double` | `AvatarRing` inside `Avatar` |
| `pattern` | `none`, `dots`, `grid`, `diagonal`, `waves`, `stars`, `circuit`, `confetti`, `bubbles`, `aurora`, `noise`, `hex` | `PatternLayer` (in `StyleLayers`) |
| `effect` | `none`, `float`, `shimmer`, `glow`, `scanline`, `sparkle` | `EffectLayer` (in `StyleLayers`); `float` animates `.avatar-wrap` or `.sx-float` |
| `status_style` | `dot`, `pill`, `text`, `ring` | `StatusIndicator` inside `Avatar`, plus `StatusText` placed by the theme |
| `eq_style` | `bars`, `wave`, `pulse`, `dots`, `line`, `blocks`, `mirror`, `circle`, `spectrum`, `none` | `Equalizer` next to Spotify and "Listening to" titles |
| `font` | `default`, `rounded`, `mono`, `serif`, `condensed`, `display` | root class; system font stacks in `FONT_STACKS` |
| `border` | `subtle`, `none`, `accent`, `gradient`, `glow` | root class plus `BorderFrame` (in `StyleLayers`) |

Adopting the axes in a theme:

1. List the supported axes in `supportedParams` (`allStyleParams`, `surfaceStyleParams`, or an explicit list). Studio shows only those in its Style group, and the embed builder serializes only those.
2. Start the component with `const { props, className, css } = cardStyle(raw, theme.supportedParams)`. It resets undeclared axes to their defaults, so a hand-written URL cannot switch on an axis the theme did not opt into. Pass the returned `props` to every part.
3. Add `className` to the root and append `css` to the theme CSS in the same `<style>` element. The root needs `position:relative` and `overflow:hidden`; `.sx-root` adds `isolation:isolate`, so the pattern layer can sit at `z-index:-1`.
4. Render `<StyleLayers {...props} />` as an early child of the root. The pattern sits behind the content; the effect overlay (`z-index:5`) and border frame (`z-index:6`) sit above it.
5. Use the shared `Avatar` part, or compose `resolveAvatarLook`, `AvatarRing`, `StatusIndicator` and `avatarShapeClass` yourself. A theme that supports `status_style` places `<StatusText {...props} separator />` in its copy (it renders nothing unless `status_style=text`). Small avatars can set `--sx-ring-w` and `--sx-ring-gap`.
6. Put `<Equalizer options={options} />` after Spotify and "Listening to" titles (`isListeningActivity(activity)`). The shared `SpotifyBlock`, `ActivityBlock` and `Summary` parts already do this.

Rules:

- Style axes never change `measure()`. Everything they add is absolutely positioned, inline at a fixed size, or paint only. The root `border` keeps its width; `border=none` only makes it transparent.
- Only CSS gradients, inline SVG and system font stacks. No external URL, image or font. SVG ids (`sx-pt-*`, `sx-<ring>-*`) carry the user ID, so they stay unique per document.
- Only the rules for the active values are emitted. Every animation sits inside `@media (prefers-reduced-motion: no-preference)` and is not emitted at all when `animated=false`; each value has a designed static frame.
- Precedence: a user's explicit `font` overrides theme fonts and native Discord name fonts. `border` overrides the theme's border colour.

**Decoration-aware ring rule** (`resolveAvatarLook()`):

1. A visible avatar decoration owns the space around the avatar. Line rings (`status`, `accent`, `gradient`, `rainbow`, `dashed`, `double`) are not drawn. Halo rings (`glow`, `pulse`) are toned down to a thinner, 60% opacity halo that sits behind the decoration art. A decoration that failed to load counts as not visible.
2. `status_style=ring` draws the presence colour in the ring slot and replaces the decorative ring. With a visible decoration it falls back to `dot`, so the status stays legible.
3. `ring=status` (the default) draws a ring in the presence colour. With `hide_status=true` no ring is drawn, so a hidden status is never revealed.

Avatar shapes keep the same square box, so decorations (drawn at 120% of the box) stay centred over every shape. `hexagon` and `octagon` use `clip-path` and drop the theme's cut-out border; `squircle` and `square` keep it through `border-radius`. Decorations are designed for circles, so under a visible decoration `squircle` (88%), `square` (82%, softer corners) and `octagon` (92%) are drawn slightly smaller to keep their corners inside the decoration frame; `hexagon` already fits.

Rings are SVG strokes drawn just outside the avatar box, so they follow every shape. A band in the card's `--bg` sits behind each full ring, so it stays legible over banners, nameplates and images. Themes with small avatars set `--sx-ring-w` and `--sx-ring-gap` (compact and activity use 2px).

## Profile extras

`CardData.profile: ProfileExtras | null` carries Discord profile data that Lanyard lacks. `normalize()` always sets `null`; `/api/[id]` and `/live/[id]` attach `fetchProfileExtras(id)` (`src/lib/discord/profile.ts`). Studio requests `/api/{id}/profile` once per ID and attaches it to both preview data and embed measurement. All 15 registry themes set `usesProfile=true`, including compact, activity, badge and retro, so every layout can wear the user’s frame and colors. Every theme must render correctly when it is `null`. A non-null object can still have every field empty.

| field | type | meaning |
|---|---|---|
| `bannerUrl` | `ImageSource \| null` | Discord profile banner: `static` WebP at 600px, plus `animated` for `a_` hashes. |
| `bannerColor` | `#rrggbb \| null` | Solid banner color (`accent_color`/`banner_color`) that Discord shows when there is no banner image. |
| `themeColors` | `[primary, accent] \| null` | Nitro profile theme colors, `#rrggbb`. |
| `bio` | `string \| null` | Discord "About me". Keeps `\n`, up to 400 characters; clamp lines in `measure()`. |
| `pronouns` | `string \| null` | Up to 40 characters. |
| `frame` | `{ skuId, name, label, layers, innerWidth, overflowTop, overflowBottom, overflowHorizontal, colors? } \| null` | Type-3 profile frame; each layer has `id`, `order: front/back`, `anchor: top/bottom`, and a trusted CDN URL. |
| `effect` | `{ skuId, title?, staticUrl?, animatedUrl?, layers? } \| null` | Profile effect. Art is designed for a 450px-wide popout. Scale it to card width and anchor it at the top (`pointer-events:none`); short/wide layouts place it below text/panels. `layers` lists every APNG layer with timing for faithful live playback. |
| `badges` | `{ id, description, iconUrl, link? }[]` | Every profile badge in Discord's order. It is a superset of `user.badges` (quests, orbs, Nitro, boosts). Merge with `user.badges`, deduplicating IDs (including HypeSquad aliases) and CDN icon hashes; missing flag badges precede the provider order. Every badge has a descriptive tooltip/alt; `hide_badges` hides the merged row. |

Images go through `assets()` like every other image. Data-layer consumers can use `profileImages(profile, options.animated)` from `src/lib/discord/profile.ts` to choose the URLs: static only when `animated=false`, otherwise animated with a static `fallback`. Request with kind `"image"`, because the Discord CDN is already allowlisted; `"banner"` is reserved for the KV banner's arbitrary host. The inliner budgets banner and effect art after identity art, caps effect frames at 384 KiB (real effect APNGs are often more than 2 MB, so the still frame is the usual SVG result) and caps badge icons at 64 KiB.

Choose the first available banner, in this order:

1. KV `banner` (`data.kv.banner`, with `show_banner`): the user chose it explicitly for this card.
2. Discord banner image (`profile.bannerUrl`).
3. Nitro theme colors gradient (`profile.themeColors`).
4. Profile banner color (`profile.bannerColor`).
5. Nameplate (`user.nameplate`).
6. Theme accent gradient.

`measure()` stays deterministic: a theme may reserve banner height or bio lines from the presence of these fields, never from image loading.

## Profile rendering

`src/card/parts/profile-look.tsx` owns banner resolution, surface tint, the effect plan, merged badges and About Me fallback. Themes declare only the controls they actually consume. Profile extras never change dimensions based on network success.

- `banner_source=auto|profile|nameplate|accent|none` defaults to `auto` and follows the priority list above. `profile` includes the explicit KV override and profile tiers, then accent; `nameplate` uses the nameplate or accent. `accent` uses the native theme background; `none` removes banner art and Nitro tint. `show_banner` and `hide_kv` govern only the KV override; `hide_nameplate` governs the nameplate tier. Member rows put the nameplate first under `auto`, as Discord does. An explicit source overrides this exception.
- Banner/backdrop themes: profile, nitro, glass, banner, polaroid (inside the photograph), voice, neon, mobile and chat. Member also draws the effect. Compact, activity, badge, retro and terminal use profile colors as their accent and draw effects; every theme renders merged badges.
- Nitro theme colors tint the surface with a dark/light readability scrim. Explicit `bg` wins. Flat banner colors use a restrained diagonal sheen inspired by DESIGN-discord. Profile banner fills have no opacity, fade masks, dimming filters or readability washes; the solid `#8b6dd8` remains its true color with only a very subtle highlight. All fills use `assets()` and stay clipped to their card/photo bounds.
- `hide_effect=false` is independent of the decorative style axis named `effect`. SVG always requests the static profile-effect frame, including with `animated=true`, to fit the 1 MB total response budget. Live with `animated=true` mounts APNG layers at `start`, removes intros after `duration`, and remounts delayed loops after `loopDelay`; uninterrupted loops stay mounted. The browser player lives outside the pure card tree, respects reduced motion, and does not restart on one-second presence ticks. Effects render at full opacity without masks; pointer events pass through. Chat, banner, badge, compact and member paint the effect above the backdrop and below text/panels (`pf-underlay`, z-index -1 in an isolated card). Tall themes keep Discord's foreground overlay. Theme/ID switches, effect re-enabling and the Studio Replay effect button remount playback; clock ticks do not.
- KV bio/pronouns win over profile text; missing fields fall back independently. `hide_kv` hides both sources. Bios have bounded line counts shared with layout measurement. Discord custom emoji markup becomes `:name:`.
- `tz` defaults to `UTC`. Validate named IANA zones with `Intl.DateTimeFormat`; invalid input or numeric UTC offsets fall back to UTC. Chat/mobile clocks and polaroid date stamps use the selected zone, including calendar rollover/DST. Only UTC has an explicit suffix. Studio pre-fills the browser zone unless a URL supplies one, and exposes the field only on these themes.
- All new defaults are omitted from embeds. Width defaults are theme-specific: banner uses 800, clamps 600–1000, and Studio uses the same `THEME_WIDTHS` range.
- Profile and presence loads remain parallel, including Studio's server seed. Studio then makes one JSON request per ID to pick up the warmed result without retrying option changes. Keep `PROFILE_BUDGET_MS=1500`; unfinished upstream requests warm the provider's existing cache. `/api/{id}/profile` validates the same 17–20 digit ID, returns only normalized extras, and uses `s-maxage=30, stale-while-revalidate=3600` (5 seconds for null results); invalid IDs return 400 with `no-store`.

### Profile frame canvas

The registry wraps each theme body with `withProfileFrame()`. The body measures its own card, while the public registry `measure()` returns the grown canvas. `width` still controls the card body (subject to existing theme clamps), so the resulting image is wider when a frame exists. Given `scale = cardWidth / innerWidth`, add `overflowHorizontal * scale` on each side and the scaled top/bottom overflows. Round the final canvas dimensions up; preserve fractional card offsets. Layers are `(innerWidth + 2 * overflowHorizontal) * scale` wide. Top layers start at `cardTop - overflowTop * scale`; bottom layers end at `cardBottom + overflowBottom * scale`, using their intrinsic image aspect ratio. Back layers paint behind the card surface; front layers above it.

`hide_frame=false` is supported by every theme and omitted from default embed URLs. Badge paints front art behind its 32px pill, preserving the crown's catalog geometry without covering its avatar or text. A failed layer suppresses the entire frame, retaining reserved geometry to avoid a layout jump. Live reports the grown, responsive height through `dgp:height`. Profile/frame catalogs load in parallel within the existing 1500 ms caller budget, with 24-hour catalog success caching and 10-minute failure caching. Expired references are ignored.

Every layer uses `assets()` on the allowlisted `cdn.discordapp.com/media/v1/collectibles-shop/{sku}/{layer}/static` path. Read only each source PNG header for intrinsic dimensions and cache it with the catalog. Request display-sized WebP with both `width` and `height` matching that aspect ratio, then sized PNG, then plain, each subject to a 160 KiB cap; the 870 KB original cannot be inlined. The aggregate decoded budget remains 660 KiB (about 901 KiB after base64), leaving markup room below the unchanged 1,000,000-byte SVG cap. Identity art retains priority. Use the sanitized `frameCardData()` fixture in both modes and every theme’s render matrix.

Studio exposes a visible **Show on card** switch group before Fine-tune. It filters supported params, maps positive switches to `hide_*` values and maps Profile banner between `none` and `auto` (on only for `auto`/`profile`), and offers an opt-in Nameplate background switch (off by default) that maps `banner_source` between `auto` and `nameplate`. The nameplate switch appears only for themes that support both `banner_source` and `hide_nameplate`, and is disabled while the nameplate is hidden. Switches have a stable `id` separate from the query param they write (see `src/lib/studio-controls.ts`). Native checkbox switches have labels, `role="switch"` and `aria-checked`; URL, embeds and preview share the same option serializer.

## Wave theme, theme defaults and legacy URLs

- `wave` rebuilds the owner's original card: a header on banner art (nameplate by default) with avatar, display name, guild tag, badges and custom status, an optional About block, then a liquid panel whose wavy top edge rises 18px over the section above. `measure()` already subtracts that overlap; the panel uses `margin-top:-18px`.
- The panel shows the first visible presence (Spotify art, title, artist and progress; or an activity's art, verb, name, details, state and timer), then up to `max_activities` compact rows, or `idle_text`. The profile effect paints under the text (`pf-underlay`), as on other short themes.
- `wave_color=auto` resolves in `src/card/parts/wave-color.ts`: Spotify `#1db954`, then an exact-name brand map, then a blurred and saturated wash of the activity art with a scrim, and when idle the profile banner color, then the accent. A hex is used as-is. Ink is white whenever white reaches 2.4:1, which matches the original card's white text on Spotify green, with a soft text shadow; lighter fills switch to black, which reaches at least 4.5:1. Live cards transition the color. Reduced motion and `animated=false` disable the edge drift.
- Header art keeps full strength. A light left-to-right wash and text shadows provide readability; there is no opaque identity box.
- The header art zone spans the header and the About block, so the wave always rises over the art. Guild tag and badges follow the name, and the Spotify progress row is inline (elapsed, bar, total).
- `THEME_DEFAULTS` in `src/lib/options.ts` holds per-theme option defaults: `member` and `wave` use `banner_source=nameplate`, and `wave` also hides platforms (`hide_platforms=true`), like the original header. Malformed values fall back to the theme default, embeds omit theme defaults, and Studio switches read their default state from it.
- `ignore_app_id` drops activities by application ID before themes render.
- Legacy keys from the previous card (`theme=dark|light`, `imgStyle`, `animatedDecoration`, `showBanner`, `hide*`, `forceGradient`, `ignoreAppId`) map in `legacyOptions()` only when present; modern keys always win.

## Status glyphs

Presence markers use Discord's shapes from `src/card/parts/status-glyph.tsx`, never plain colored dots:

| Status | Shape |
|---|---|
| online | Green dot |
| idle | Yellow crescent moon |
| dnd | Red dot with a rounded bar cut out |
| offline | Grey ring |
| online, mobile only | Green phone |

- Paths are single even-odd paths on a 10×10 grid with no SVG ids.
- The avatar `.status-dot` paints `var(--bg)` behind the glyph, so cut-outs show the card background as on Discord.
- Small inline markers (`mini-dot`, `badge-dot`, `note-dot`, `polaroid-dot`, `term-dot`) add `sd-host` and render the same glyph.
- Colors are set on the path. `statusGlyphCss` ships the sizing and cut-out rules with every theme through `styleCss`.
- Themes with their own wording or icons keep them: `retro` words, `neon` tubes and `voice` microphone states.
