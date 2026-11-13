import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { renderSvg } from "../src/lib/svg/render";
import { themes } from "../src/card/theme-registry";
import { FIXED_NOW } from "../tests/fixtures";
import { exampleCardFixtures, exampleDefinitions, exampleModes, exampleOptions, escapeHtml, type ExampleDefinition } from "./example-data";
import { bundledExampleAssets } from "./example-assets";
import { validateExampleSvg } from "./validate-example";

const argument = (name: string) => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };

async function main() {
  const output = resolve(argument("--out-dir") ?? "public/examples");
  const matrixDir = argument("--matrix-dir");
  const fixtures = exampleCardFixtures();
  const assets = bundledExampleAssets();
  const manifest: (ExampleDefinition & { width: number; height: number; bytes: number })[] = [];
  async function save(directory: string, definition: ExampleDefinition) {
    const { file, theme, mode, fixture, query } = definition;
    const data = fixtures[fixture]!;
    const options = exampleOptions(theme, mode, query);
    const size = themes[theme]!.measure(data, options);
    let svg = renderSvg(data, options, assets.resolve);
    // Preserve the existing static fallback for a fixture with exceptionally large animation art.
    if (Buffer.byteLength(svg) >= 1_000_000) svg = renderSvg(data, { ...options, animated: false }, assets.resolve);
    const bytes = validateExampleSvg(svg, size, file);
    await mkdir(dirname(join(directory, file)), { recursive: true });
    await writeFile(join(directory, file), svg);
    return { ...definition, ...size, bytes };
  }
  for (const definition of exampleDefinitions()) manifest.push(await save(output, definition));
  const head = (title: string) => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#0a0d3a;color:#f1f0ff;font:14px/1.4 "Segoe UI",sans-serif}h1{margin:0 0 8px;font-weight:900;font-size:28px}p{color:#b3b8e2;margin:0 0 24px}a{color:#b9c1ff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,444px),1fr));gap:16px}.tile{padding:12px;background:#171d4a;border:1px solid #434b7b;border-radius:18px;overflow:hidden}.tile.light{background:#dfdef1}.label{margin-bottom:10px;color:#acb5df;font-size:11px;letter-spacing:1px;text-transform:uppercase;overflow-wrap:anywhere}.light .label{color:#44446a}img{display:block;max-width:100%;height:auto}section{margin-top:28px}h2{font-size:22px}nav{display:flex;gap:20px;flex-wrap:wrap;margin-bottom:24px}</style><h1>${escapeHtml(title)}</h1><p>Frozen snapshot: ${new Date(FIXED_NOW).toISOString()} · SVGs rendered through &lt;img&gt; · bundled local fixture artwork; no network.</p>`;
  const tile = (entry: typeof manifest[number], prefix = "") => `<div class="tile ${entry.mode}"><div class="label">${escapeHtml(entry.file)} · ${entry.width} × ${entry.height} · ${(entry.bytes / 1024).toFixed(1)} KiB</div><img src="${prefix}${escapeHtml(entry.file)}" width="${entry.width}" height="${entry.height}" alt="${escapeHtml(entry.file)}"></div>`;
  await writeFile(join(output, "index.html"), head("Discord presence / themes and styles") + '<nav><a href="styles/index.html">Style gallery</a></nav>' + `<div class="grid">${manifest.map((entry) => tile(entry)).join("")}</div></html>`);
  await writeFile(join(output, "styles/index.html"), head("Discord presence / style gallery") + '<nav><a href="../index.html">All themes</a></nav>' + `<div class="grid">${manifest.filter(({ file }) => file.startsWith("styles/")).map((entry) => tile({ ...entry, file: entry.file.slice("styles/".length) })).join("")}</div></html>`);
  // An optional QA matrix must not change any public gallery bytes, including asset metadata.
  await writeFile(join(output, "manifest.json"), JSON.stringify({ now: FIXED_NOW, assets: { source: "bundled fixtures", loaded: assets.requested.size, requested: assets.requested.size }, examples: manifest }, null, 2) + "\n");
  let matrixCount = 0;
  if (matrixDir) {
    const matrix = resolve(matrixDir);
    await mkdir(matrix, { recursive: true });
    const sections: string[] = [];
    for (const theme of Object.keys(themes)) {
      const tiles: string[] = [];
      // Keep the established ten-fixture matrix compatible with screenshot-examples.ps1.
      for (const fixture of Object.keys(fixtures).filter((name) => name !== "extras" && name !== "gallery")) for (const mode of exampleModes) {
        const entry = await save(matrix, { file: `${theme}-${fixture}-${mode}.svg`, theme, mode, fixture });
        matrixCount++;
        tiles.push(tile(entry));
      }
      const section = `<section id="${theme}"><h2>${theme}</h2><div class="grid">${tiles.join("")}</div></section>`;
      sections.push(section);
      await writeFile(join(matrix, `${theme}.html`), head(`Discord / ${theme} / fixture matrix`) + section + "</html>");
    }
    await writeFile(join(matrix, "index.html"), head("Discord / complete fixture matrix") + `<nav>${Object.keys(themes).map((theme) => `<a href="${theme}.html">${theme}</a>`).join("")}</nav>` + sections.join("") + "</html>");
  }
  console.log(`Generated ${manifest.length} examples${matrixDir ? ` and ${matrixCount} matrix SVGs` : ""}; ${assets.requested.size} bundled fixture assets; no network.`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
