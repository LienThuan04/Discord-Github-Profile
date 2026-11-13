import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(
    [".next/**", "out/**", "build/**", "coverage/**", "graphify-out/**", "next-env.d.ts", ".npm-cache/**", ".pnpm-store/**", ".verification/**",
      ".open-next/**", ".wrangler/**", ".dev.var*", "cloudflare-env.d.ts" // ignore generated files and directories for Next.js, Cloudflare, and other tools
    ]),
  {
    rules: {
      // SVG output must inline images as data URIs, so next/image does not apply to card markup.
      "@next/next/no-img-element": "off",
    },
  },
]);
