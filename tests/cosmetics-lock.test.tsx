import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { cosmeticCommands } from "@/lib/studio-controls";
import { CosmeticsLock } from "@/components/studio/CosmeticsLock";
import { profileExtras } from "./fixtures/profile-extras";
import type { ProfileExtras } from "@/lib/discord/profile";

const EFFECT = "1139323093991575696";
const FRAME = "1484726324580061191";
const profile: ProfileExtras = {
  ...profileExtras,
  effect: { skuId: EFFECT, title: "Sakura Dreams" },
  frame: { skuId: FRAME, name: "Crystals (Amethyst)", label: "Purple crystals", innerWidth: 1200, overflowTop: 304, overflowBottom: 0, overflowHorizontal: 56, layers: [{ id: "1514422966870347837", order: "front", anchor: "top", url: "https://cdn.discordapp.com/x" }] },
};

it("builds Lanyard /set commands for the shown effect and frame and marks saved ones", () => {
  expect(cosmeticCommands(profile, { profile_effect: EFFECT })).toEqual([
    { kind: "effect", key: "profile_effect", value: EFFECT, label: "Sakura Dreams", command: `/set key:profile_effect value:${EFFECT}`, saved: true },
    { kind: "frame", key: "profile_frame", value: FRAME, label: "Crystals (Amethyst)", command: `/set key:profile_frame value:${FRAME}`, saved: false },
  ]);
  expect(cosmeticCommands({ ...profile, effect: null, frame: null }, {})).toEqual([]);
  expect(cosmeticCommands(null, undefined)).toEqual([]);
});

it("renders the helper only when there is something to keep", () => {
  const html = renderToStaticMarkup(<CosmeticsLock profile={profile} kv={{ profile_effect: EFFECT }} />);
  expect(html).toContain("Keep your frame and effect");
  expect(html).toContain(`/set key:profile_frame value:${FRAME}`);
  expect(html).toContain("Saved");
  expect(renderToStaticMarkup(<CosmeticsLock profile={null} kv={undefined} />)).toBe("");
  const done = renderToStaticMarkup(<CosmeticsLock profile={profile} kv={{ profile_effect: EFFECT, profile_frame: FRAME }} />);
  expect(done).toContain("Frame and effect saved");
});
