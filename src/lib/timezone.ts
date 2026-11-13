/**
 * IANA time zones for snapshot clocks. Pure and deterministic: the same `now` and zone always give the same
 * strings (ICU data ships with the runtime). No module here reads the wall clock.
 */

export const DEFAULT_TIME_ZONE = "UTC";
/** Letters, digits and the punctuation IANA names and UTC offsets use; blocks anything else before Intl sees it. */
const ZONE_SHAPE = /^[A-Za-z0-9_+\-/:]{1,64}$/;

/**
 * Canonical zone name for a valid IANA time zone (`asia/ho_chi_minh` → `Asia/Ho_Chi_Minh`), otherwise `null`.
 * Validation is `Intl.DateTimeFormat` itself, so the accepted set follows the runtime's ICU data.
 */
export function parseTimeZone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!ZONE_SHAPE.test(candidate) || /^[+-]/.test(candidate)) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: candidate }).resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** `UTC`, `Etc/UTC` and friends all mean "no local zone": cards keep the explicit "UTC" suffix for them. */
export function isUtcZone(zone: string): boolean {
  return /^(?:Etc\/)?(?:UTC|UCT|GMT|Universal|Zulu|Greenwich)$/i.test(zone);
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday. */
  weekday: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function formatter(zone: string): Intl.DateTimeFormat {
  let cached = formatters.get(zone);
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short" });
    if (formatters.size > 64) formatters.clear();
    formatters.set(zone, cached);
  }
  return cached;
}

/** Calendar fields of `now` in `zone`. An invalid zone falls back to UTC instead of throwing. */
export function zonedParts(now: number, zone: string = DEFAULT_TIME_ZONE): ZonedParts {
  const safe = parseTimeZone(zone) ?? DEFAULT_TIME_ZONE;
  const parts: Record<string, string> = {};
  for (const part of formatter(safe).formatToParts(new Date(now))) parts[part.type] = part.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: WEEKDAY_INDEX[parts.weekday ?? "Sun"] ?? 0,
  };
}
