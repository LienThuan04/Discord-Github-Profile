# Deploying a Next.js app to Cloudflare Workers (OpenNext)

This is the checklist used for this repo and for the owner's portfolio (`LienThuan04/My-Portfolio`, live at
`https://lian.harmanit.workers.dev`). It works for any Next.js app with pnpm; the last sections list every error hit
on the way and its fix. The git tag `cloudflare-deploy-guide` points at the commit that added it.

Cloudflare runs Next.js through [OpenNext](https://opennext.js.org/cloudflare): `opennextjs-cloudflare build` runs
`next build`, then bundles the server into `.open-next/worker.js` and copies static files to `.open-next/assets`.
Workers Builds (Cloudflare's Git integration) builds and deploys on every push.

## Before you start

- **CPU time.** Workers Free allows 10 ms of CPU per request; Workers Paid ($5/month) allows 30 s by default. Pages that
  render a lot per request (this repo's SVG cards) can hit the Free limit and fail with error 1102. Watch the logs.
- **Caching.** A Worker runs in front of Cloudflare's cache, so `Cache-Control: s-maxage` does not make Cloudflare cache
  its responses the way Vercel's CDN does. Every request runs the code.
- **Size.** Workers have no compressed size limit; the uncompressed bundle may be up to 64 MiB.
- **Runtime.** Code runs in `workerd` with `nodejs_compat`, not in Node.js. Most Next.js code works; a few `fetch`
  options do not (see troubleshooting). Python apps (Flask, `firebase-admin`) do not run on Workers.
- **Address.** The app gets `https://<worker-name>.<account-subdomain>.workers.dev`. Keep the old host running until the
  new one is verified.

## 1. Add OpenNext to the repo

1. Allow the build scripts pnpm 11 blocks by default, in `pnpm-workspace.yaml`:

   ```yaml
   allowBuilds:
     esbuild: true
     workerd: true
   ```

   If the file has no `packages` field and the build might run on pnpm 9, also add `packages: ["."]` (pnpm 9 rejects a
   settings-only workspace file).

2. Install the adapter and the CLI:

   ```sh
   pnpm add @opennextjs/cloudflare
   pnpm add -D wrangler
   ```

3. Create `wrangler.jsonc` in the repository root:

   ```jsonc
   {
     "$schema": "node_modules/wrangler/config-schema.json",
     "name": "discord-github-profile",
     "main": ".open-next/worker.js",
     "compatibility_date": "2026-11-10",
     "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
     "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
     "services": [{ "binding": "WORKER_SELF_REFERENCE", "service": "discord-github-profile" }],
     "observability": { "enabled": true },
     "vars": {
       "FEEDBACK_URL": "https://lian.harmanit.workers.dev",
       "DISCORD_PROFILE_PROVIDER": "dstn",
       "LANYARD_API_URL": "https://api.lanyard.rest/v1"
     }
   }
   ```

   - `name` must equal the Worker name in the Cloudflare dashboard, and `services[0].service` must equal `name`.
   - Keep `main` and `assets` as they are; they point at the OpenNext output.
   - Add `"images": { "binding": "IMAGES" }` when the app uses `next/image` optimization (the portfolio does). This repo
     only uses `next/image` with `unoptimized`, so it has no Images binding.
   - `vars` holds runtime variables that are not secret. A deploy replaces plain-text variables set in the dashboard
     with these, so keep them here. Secrets (API tokens) go in the dashboard as type **Secret**; deploys keep them.

4. Create `open-next.config.ts`:

   ```ts
   import { defineCloudflareConfig } from "@opennextjs/cloudflare";

   export default defineCloudflareConfig();
   ```

   That default suits apps that render per request (this repo). For a site whose pages are all prerendered and never
   revalidate (the portfolio), serve them from static assets instead:

   ```ts
   import { defineCloudflareConfig } from "@opennextjs/cloudflare";
   import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

   export default defineCloudflareConfig({
     incrementalCache: staticAssetsIncrementalCache,
     enableCacheInterception: true,
   });
   ```

5. Add scripts to `package.json` and keep `"build": "next build"` (OpenNext calls it):

   ```json
   "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
   "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
   "upload": "opennextjs-cloudflare build && opennextjs-cloudflare upload",
   "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
   ```

   Run them with `pnpm run deploy`: plain `pnpm deploy` is a built-in pnpm command.

6. Ignore the generated files: `.open-next`, `.wrangler` and `.dev.vars*` in `.gitignore`, and `.open-next/**`,
   `.wrangler/**` and `cloudflare-env.d.ts` in the ESLint `globalIgnores`.

7. Optional: cache hashed build files for a year with `public/_headers`:

   ```text
   /_next/static/*
     Cache-Control: public,max-age=31536000,immutable
   ```

8. Delete an SPA rule such as `/* /index.html 200` from `public/_redirects`. Workers apply `_redirects` to every request,
   and an OpenNext build has no `/index.html`.

9. Check locally: `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build`. `pnpm run preview` serves the real Worker
   at `http://localhost:8787`; on Windows it needs symlink permission (turn on Developer Mode in Settings → System → For
   developers), otherwise the bundling step fails with `EPERM: symlink` and you can rely on the Cloudflare build.

## 2. Create the Worker in Cloudflare

1. **Workers & Pages → Create → Import a repository → GitHub**, then pick the repository. For a private repository,
   allow the Cloudflare GitHub app to access it.
2. **Project name** = `name` in `wrangler.jsonc`.
3. **Settings → Build**:

   | Setting | Value |
   | --- | --- |
   | Build command | `pnpm exec opennextjs-cloudflare build` |
   | Deploy command | `pnpm exec opennextjs-cloudflare deploy` |
   | Preview command (if "Enable Preview Builds" is on) | `pnpm exec opennextjs-cloudflare upload` |
   | Branch control | the production branch (`main`) |

4. **Build variables and secrets** (used while building): every `NEXT_PUBLIC_*` value, and `PNPM_VERSION` when
   `package.json` has no `"packageManager"` field. This repo pins `"packageManager": "pnpm@11.22.0"`, which Workers
   Builds reads first, so it needs no `PNPM_VERSION`.
5. **Settings → Variables and Secrets** (runtime): secrets only, for this repo `DISCORD_BOT_TOKEN` as type Secret if
   you use one. Plain runtime values live in `wrangler.jsonc` `vars`.
6. Every push to the production branch now builds and deploys. Settings changes apply to the next build; **Retry** a
   failed deployment after changing them.

## 3. Domains

- **workers.dev:** Workers & Pages → **Change** next to *Your subdomain* sets the account part (`harmanit`). Each Worker
  is then `https://<worker-name>.harmanit.workers.dev`; there is no bare `harmanit.workers.dev`. Worker → Settings →
  **Domains & Routes** must show `workers.dev` as enabled.
- **Your own domain:** buy or add a domain so it is an **active zone** in the account (the "Connect your domain" screen
  with DNS import and nameservers is this step, and only works for domains you own), then Worker → Settings → Domains &
  Routes → **Add → Custom Domain**. You cannot add `workers.dev` itself as a domain.
- After moving, update every link that pointed at the old host (READMEs, other apps' environment variables).

## 4. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `ERROR packages field missing or empty` during install | The build ran pnpm 9, which needs `packages` in `pnpm-workspace.yaml` | Pin pnpm with `"packageManager"` or the `PNPM_VERSION` build variable, or add `packages: ["."]` |
| Log keeps showing the wrong `pnpm@…` version | `PNPM_VERSION` was set as a runtime variable, or a `packageManager` field overrides it | Set it under **Build variables and secrets**; `packageManager` wins when present |
| `ERR_PNPM_IGNORED_BUILDS … esbuild, workerd` in the deploy step | The repo had no `wrangler.jsonc`, so `wrangler deploy` ran its own OpenNext setup, and pnpm 11 blocked the new build scripts | Commit the OpenNext setup above, with `esbuild` and `workerd` in `allowBuilds` |
| Build fails because the Worker name does not match | Dashboard Worker name differs from `wrangler.jsonc` | Make `name` (and the self-reference `service`) equal to the dashboard name |
| `<name>.<subdomain>.workers.dev` returns 404 | No Worker with that name, or the workers.dev route is disabled | Check the Worker name and Settings → Domains & Routes |
| A route returns 502 instantly; `fetch` throws `Invalid redirect value, must be one of "follow" or "manual"` | `workerd` does not support `redirect: "error"` (Node.js does) | Use `redirect: "manual"` and treat a non-2xx (3xx) status as a failure |
| Every page shows the home page or 404 | A `_redirects` rule like `/* /index.html 200` applies to every request | Remove it |
| `EPERM: operation not permitted, symlink` when building OpenNext on Windows | Creating symlinks needs Developer Mode or an elevated shell | Turn on Developer Mode, use WSL, or let Cloudflare build |
| Error 1102 / exceeded CPU in the Worker logs | Workers Free allows 10 ms CPU per request | Move to Workers Paid, or do less work per request |
| A `NEXT_PUBLIC_*` change has no effect | Public variables are built into the bundle | Set it as a build variable and rebuild |
| A runtime variable set in the dashboard disappears after a deploy | Deploys replace plain-text dashboard variables with `wrangler.jsonc` `vars` | Put it in `vars`, or store it as a Secret |
| Missing modules under `.verification/pnpm-virtual` during the OpenNext build | Older revisions of this repo kept pnpm's virtual store outside `node_modules` | Remove `virtualStoreDir` from `pnpm-workspace.yaml` (done in `v1.0.2`) |

Logs: Worker → **Observability** (enabled by `"observability"` in `wrangler.jsonc`) and the Deployments tab.

## 5. This repository

| Item | Value |
| --- | --- |
| Worker name | `discord-github-profile` |
| Address | `https://discord-github-profile.harmanit.workers.dev` once the Worker exists |
| Runtime `vars` | `FEEDBACK_URL`, `DISCORD_PROFILE_PROVIDER`, `LANYARD_API_URL` |
| Secret (optional) | `DISCORD_BOT_TOKEN` |
| Build variables | none required; `NEXT_PUBLIC_SITE_URL` may stay empty (Studio then uses the request origin) |

The Vercel deployment keeps working alongside it: Vercel ignores `wrangler.jsonc`. When switching, update the card URLs in
the profile README and `NEXT_PUBLIC_DISCORD_CARD_URL` in the portfolio.
