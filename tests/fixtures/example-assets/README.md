# Frozen example artwork

These 36 files (908,652 bytes) were extracted locally from the previously verified Phase 7 fixture SVG matrix. They contain only image artwork: no profile response, About Me text, credentials or runtime cache. Public examples use synthetic placeholder bios.

`manifest.json` maps the original fixture image URL to its content-addressed local file, MIME type and decoded byte count. Those URLs identify the artwork; the examples script never requests them. Identical images share a file, including successful static fallbacks for animated URLs. Sources include the demo avatar, decoration, nameplate and guild tag; Discord badge, frame and effect artwork; synthetic activity artwork; Spotify, Twitch, YouTube and pinned Twemoji imagery.

`scripts/example-assets.ts` reads only these files and throws if a required fixture asset is absent. `pnpm examples` does not fetch Lanyard, profiles, collectibles, CDN art or fonts. The integration regression denies network APIs while regenerating the gallery twice, compares every output byte and checks that adding the optional fixture matrix leaves the public gallery unchanged.
