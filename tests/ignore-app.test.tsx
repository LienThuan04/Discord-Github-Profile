import { expect, it } from "vitest";
import { getTheme, themes } from "@/card/theme-registry";
import { normalize } from "@/lib/lanyard/normalize";
import { filterApplications } from "@/lib/lanyard/filter";
import { parseOptions } from "@/lib/options";
import { renderSvg } from "@/lib/svg/render";
import { serializeOptions } from "@/lib/embed";
import { PLACEHOLDER } from "@/lib/svg/assets";
import { FIXED_NOW, gamePresence, spotifyPresence } from "./fixtures";

it("drops ignored applications before measuring and rendering every registered theme", () => {
  const data = normalize(gamePresence, { now: FIXED_NOW });
  const before = JSON.stringify(data);
  for (const name of Object.keys(themes)) {
    const options = parseOptions({ theme: name, ignore_app_id: "383226320970055681" });
    const filtered = filterApplications(data, options);
    expect(filtered.activities).toEqual([]);
    expect(renderSvg(data, options, () => PLACEHOLDER)).not.toContain("Editing normalize.ts");
    expect(getTheme(name).measure(data, options)).toEqual(getTheme(name).measure(filtered, options));
    expect(serializeOptions(options).get("ignore_app_id")).toBe("383226320970055681");
  }
  expect(JSON.stringify(data)).toBe(before);
  expect(filterApplications(data, parseOptions())).toBe(data);
});

it("retains unlisted and missing IDs in order, filtering before the max-activities limit", () => {
  const data = normalize(gamePresence, { now: FIXED_NOW });
  data.activities.push({ ...data.activities[0]!, applicationId: null, name: "Keep this activity", key: "keep" });
  const options = parseOptions({ ignore_app_id: "383226320970055681", max_activities: "1" });
  expect(filterApplications(data, options).activities.map((a) => a.name)).toEqual(["Keep this activity"]);
  expect(renderSvg(data, options, () => PLACEHOLDER)).toContain("Keep this activity");
});

it("carries the actual Spotify application ID through normalization and ignores it when supplied", () => {
  const presence = { ...spotifyPresence, activities: spotifyPresence.activities.map((a) => ({ ...a, application_id: "123456789012345678" })) };
  const data = normalize(presence, { now: FIXED_NOW });
  expect(data.spotify?.applicationId).toBe("123456789012345678");
  expect(filterApplications(data, parseOptions({ ignore_app_id: "123456789012345678" })).spotify).toBeNull();
  expect(filterApplications(normalize(spotifyPresence, { now: FIXED_NOW }), parseOptions({ ignore_app_id: "123456789012345678" })).spotify).not.toBeNull();
});
