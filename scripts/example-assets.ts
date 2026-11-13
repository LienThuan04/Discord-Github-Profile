import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AssetResolver } from "../src/card/types";
import manifest from "../tests/fixtures/example-assets/manifest.json";

/** Resolve only frozen local artwork. An unbundled URL is an error, never a download or silent placeholder. */
export function bundledExampleAssets(): { resolve: AssetResolver; requested: Set<string> } {
  const directory = fileURLToPath(new URL("../tests/fixtures/example-assets/", import.meta.url));
  const assets = new Map<string, string>();
  for (const [url, entry] of Object.entries(manifest.assets)) {
    const bytes = readFileSync(`${directory}${entry.file}`);
    if (bytes.length !== entry.bytes) throw new Error(`Fixture artwork has changed: ${entry.file}`);
    assets.set(url, `data:${entry.mime};base64,${bytes.toString("base64")}`);
  }
  const requested = new Set<string>();
  return {
    requested,
    resolve: (url, _kind, fallback) => {
      requested.add(url);
      const choices = [url, ...(typeof fallback === "string" ? [fallback] : fallback ?? [])];
      const asset = choices.map((choice) => assets.get(choice)).find(Boolean);
      if (!asset) throw new Error(`Missing bundled fixture artwork: ${url}`);
      return asset;
    },
  };
}
