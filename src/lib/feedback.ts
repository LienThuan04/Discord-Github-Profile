/** The owner's GitHub profile: the fallback place to send theme and feature ideas. */
export const OWNER_PROFILE_URL = "https://github.com/LienThuan04";

/**
 * Where Card Studio sends visitors with theme or feature ideas. It reads the server-side `FEEDBACK_URL` (any http(s)
 * URL, read at request time, so no rebuild is needed) and falls back to the owner's GitHub profile.
 */
export function feedbackUrl(value: string | undefined = process.env.FEEDBACK_URL): string {
  const trimmed = value?.trim();
  if (!trimmed) return OWNER_PROFILE_URL;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : OWNER_PROFILE_URL;
  } catch {
    return OWNER_PROFILE_URL;
  }
}
