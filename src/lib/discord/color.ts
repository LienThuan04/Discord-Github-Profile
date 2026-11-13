/** Small color helpers. Every color that reaches CSS goes through these, so CSS stays injection-free. */

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

/** `abc` → `#aabbcc`, `#5865F2` → `#5865f2`. Returns `null` for anything else. */
export function normalizeHex(value: string): string | null {
  const match = HEX.exec(value.trim());
  if (!match) return null;
  let hex = match[1]!.toLowerCase();
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
  return `#${hex}`;
}

/** Discord stores colors as RGB integers. */
export function colorIntToHex(value: number): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffff) return null;
  return `#${value.toString(16).padStart(6, "0")}`;
}

/** Appends an alpha channel to a `#rrggbb` color. */
export function withAlpha(hex: string, alpha: number): string {
  const base = hex.slice(0, 7);
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${base}${a}`;
}
