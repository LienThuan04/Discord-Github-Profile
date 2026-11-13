import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync(new URL("../src/components/studio/CardStudio.module.css", import.meta.url), "utf8");

it("keeps the preview column in view while the editor scrolls, and only in the two-column layout", () => {
  expect(css).toMatch(/\.previewColumn \{ position: sticky; top: 20px; align-self: start; \}/);
  const singleColumn = css.slice(css.indexOf("@media (max-width: 800px)"));
  expect(singleColumn).toMatch(/\.previewColumn \{ position: static; \}/);
  // A clipping ancestor with overflow:hidden would disable sticky; the page shell uses overflow:clip instead.
  expect(css).toMatch(/\.site \{[^}]*overflow: clip;/);
});
