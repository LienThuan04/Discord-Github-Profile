import type { ProfileExtras } from "@/lib/discord/profile";
import { normalize } from "@/lib/lanyard/normalize";
import { demoUserPresence, FIXED_NOW } from ".";
import { parseFrameProduct } from "@/lib/discord/profile";
import frameProduct from "./discord-frame-product.json";

/** Synthetic public profile: never use the owner's real About Me text here. */
export const profileExtras: ProfileExtras = {
  frame: null,
  bannerUrl: { static: "https://cdn.discordapp.com/banners/94490510688792576/bb4bff6e0bfc94ea9e01d6ad31750494.webp?size=600", animated: "https://cdn.discordapp.com/banners/94490510688792576/bb4bff6e0bfc94ea9e01d6ad31750494.webp?size=600&animated=true" },
  bannerColor: "#8b6dd8", themeColors: ["#543ba2", "#bd4c88"],
  bio: "Placeholder bio for a synthetic Discord profile.\nBuilding things together.", pronouns: "they/them",
  effect: { skuId: "1139323093991575696", title: "Sample petals", staticUrl: "https://cdn.discordapp.com/assets/content/196b75b6dc1ea082963c8c69c0ddc2c31efcaf18ee09f517e12760b3a105f790", animatedUrl: "https://cdn.discordapp.com/assets/content/865386444cad732750a74e393e3c3e14ccd5de4a5a2905e91e546e58b2603180", layers: [
    { url: "https://cdn.discordapp.com/assets/content/4d89d846e27e98e767e31222a16adb13cdf0fa8e55431827fb728a38b230d229", width: 450, height: 880, x: 0, y: 0, start: 0, duration: 2000, loop: false, loopDelay: 0, zIndex: 2 },
    { url: "https://cdn.discordapp.com/assets/content/865386444cad732750a74e393e3c3e14ccd5de4a5a2905e91e546e58b2603180", width: 450, height: 880, x: 0, y: 0, start: 2000, duration: 4000, loop: true, loopDelay: 1000, zIndex: 1 },
  ] },
  badges: [{ id: "quest_completed", description: "Completed a Quest", iconUrl: "https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png" }],
};
export const profileCardData = () => ({ ...normalize({ ...demoUserPresence, kv: {} }, { now: FIXED_NOW }), profile: structuredClone(profileExtras) });
export const frameCardData = () => ({ ...profileCardData(), profile: { ...structuredClone(profileExtras), bannerUrl: null, themeColors: null, frame: parseFrameProduct(frameProduct.sku_id, frameProduct) } });
