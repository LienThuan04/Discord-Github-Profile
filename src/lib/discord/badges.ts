/**
 * `public_flags` → profile badges.
 *
 * Icon hashes are the ones Discord's client uses on `cdn.discordapp.com/badge-icons/`. Every hash
 * below answered HTTP 200 (image/png) on 2026-11-12. Nitro and boost badges cannot be derived from
 * `public_flags`, so they are intentionally absent.
 */

import { badgeIconUrl } from "./cdn";

export const UserFlag = {
  Staff: 1 << 0,
  Partner: 1 << 1,
  HypeSquad: 1 << 2,
  BugHunterLevel1: 1 << 3,
  HypeSquadOnlineHouse1: 1 << 6,
  HypeSquadOnlineHouse2: 1 << 7,
  HypeSquadOnlineHouse3: 1 << 8,
  PremiumEarlySupporter: 1 << 9,
  BugHunterLevel2: 1 << 14,
  VerifiedBot: 1 << 16,
  VerifiedDeveloper: 1 << 17,
  CertifiedModerator: 1 << 18,
  ActiveDeveloper: 1 << 22,
} as const;

export interface Badge {
  id: string;
  label: string;
  icon: string;
}

interface BadgeDef {
  id: string;
  flag: number;
  label: string;
  hash: string;
}

/** In the order the Discord client shows them. */
const BADGE_DEFS: readonly BadgeDef[] = [
  { id: "staff", flag: UserFlag.Staff, label: "Discord Staff", hash: "5e74e9b61934fc1f67c65515d1f7e60d" },
  { id: "partner", flag: UserFlag.Partner, label: "Partnered Server Owner", hash: "3f9748e53446a137a052f3454e2de41e" },
  { id: "certified_moderator", flag: UserFlag.CertifiedModerator, label: "Moderator Programs Alumni", hash: "fee1624003e2fee35cb398e125dc479b" },
  { id: "hypesquad", flag: UserFlag.HypeSquad, label: "HypeSquad Events", hash: "bf01d1073931f921909045f3a39fd264" },
  { id: "hypesquad_bravery", flag: UserFlag.HypeSquadOnlineHouse1, label: "HypeSquad Bravery", hash: "8a88d63823d8a71cd5e390baa45efa02" },
  { id: "hypesquad_brilliance", flag: UserFlag.HypeSquadOnlineHouse2, label: "HypeSquad Brilliance", hash: "011940fd013da3f7fb926e4a1cd2e618" },
  { id: "hypesquad_balance", flag: UserFlag.HypeSquadOnlineHouse3, label: "HypeSquad Balance", hash: "3aa41de486fa12454c3761e8e223442e" },
  { id: "bug_hunter_level_1", flag: UserFlag.BugHunterLevel1, label: "Discord Bug Hunter", hash: "2717692c7dca7289b35297368a940dd0" },
  { id: "bug_hunter_level_2", flag: UserFlag.BugHunterLevel2, label: "Discord Bug Hunter (Gold)", hash: "848f79194d4be5ff5f81505cbd0ce1e6" },
  { id: "active_developer", flag: UserFlag.ActiveDeveloper, label: "Active Developer", hash: "6bdc42827a38498929a4920da12695d9" },
  { id: "verified_developer", flag: UserFlag.VerifiedDeveloper, label: "Early Verified Bot Developer", hash: "6df5892e0f35b051f8b61eace34f4967" },
  { id: "early_supporter", flag: UserFlag.PremiumEarlySupporter, label: "Early Supporter", hash: "7060786766c9c840eb3019e725d2b358" },
];

export const BADGES: readonly Badge[] = BADGE_DEFS.map((def) => ({
  id: def.id,
  label: def.label,
  icon: badgeIconUrl(def.hash),
}));

export function flagsToBadges(flags: number | null | undefined): Badge[] {
  if (typeof flags !== "number" || !Number.isInteger(flags) || flags <= 0) return [];
  const result: Badge[] = [];
  BADGE_DEFS.forEach((def, i) => {
    if ((flags & def.flag) === def.flag) result.push(BADGES[i]!);
  });
  return result;
}
