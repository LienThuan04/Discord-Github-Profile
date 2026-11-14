"use client";

import { useState } from "react";
import type { ProfileExtras } from "@/lib/discord/profile";
import { cosmeticCommands } from "@/lib/studio-controls";
import styles from "./CardStudio.module.css";

/**
 * Discord does not give apps a user's profile effect or frame, so the card reads them from an unofficial
 * mirror. This helper offers the Lanyard bot commands that pin them in the user's own KV.
 */
export function CosmeticsLock({ profile, kv }: { profile: ProfileExtras | null; kv: Record<string, string> | undefined }) {
  const commands = cosmeticCommands(profile, kv);
  const [copied, setCopied] = useState<string | null>(null);
  if (!commands.length) return null;
  const allSaved = commands.every((entry) => entry.saved);
  async function copy(key: string, command: string) {
    try { await navigator.clipboard.writeText(command); setCopied(key); } catch { setCopied(null); }
  }
  return (
    <section className={styles.lockPanel} aria-labelledby="lock-title">
      <h4 id="lock-title">{allSaved ? "✓ Frame and effect saved" : "Keep your frame and effect"}</h4>
      <p>{allSaved
        ? "Your Lanyard KV pins these cosmetics, so the card keeps them even when the profile mirror is down. Run the commands again after you change them on Discord."
        : "Discord does not share profile effects and frames with apps, so the card reads them from an unofficial mirror. Send these commands to the Lanyard bot once and your card keeps them even when the mirror is down."}</p>
      <ul>
        {commands.map((entry) => (
          <li key={entry.key}>
            <span className={styles.lockLabel}>{entry.label}</span>
            <code>{entry.command}</code>
            {entry.saved
              ? <span className={styles.lockSaved}>✓ Saved</span>
              : <button type="button" className={styles.replay} onClick={() => void copy(entry.key, entry.command)} aria-label={`Copy the command for ${entry.label}`}>{copied === entry.key ? "✓ Copied" : "Copy"}</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
