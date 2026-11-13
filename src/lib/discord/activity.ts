/** Activity helpers: type labels, section titles and party sizes. */

import type { ActivityParty } from "@/lib/lanyard/types";

const TYPE_LABELS: Readonly<Record<number, string>> = {
  0: "Playing",
  1: "Streaming",
  2: "Listening to",
  3: "Watching",
  5: "Competing in",
};

/** Verb shown before the activity name, e.g. "Playing" or "Listening to". */
export function activityTypeLabel(type: number): string {
  return TYPE_LABELS[type] ?? "";
}

/** Section header text, styled like the Discord profile popout. */
export function sectionTitle(type: number, name: string): string {
  switch (type) {
    case 0:
      return "Playing";
    case 1:
      return `Live on ${name}`;
    case 2:
      return `Listening to ${name}`;
    case 3:
      return `Watching ${name}`;
    case 5:
      return "Competing";
    default:
      return name;
  }
}

/** Types rendered as activity sections (custom status, type 4, has its own bubble). */
export function isShownActivityType(type: number): boolean {
  return type === 0 || type === 1 || type === 2 || type === 3 || type === 5;
}

export function formatParty(party: ActivityParty | null | undefined): string | null {
  const size = party?.size;
  if (!Array.isArray(size)) return null;
  const [current, max] = size;
  if (!(typeof current === "number" && current > 0)) return null;
  if (typeof max === "number" && max > 0) return `${current} of ${max}`;
  return `${current} in party`;
}
