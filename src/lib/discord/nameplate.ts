/**
 * Nameplate palettes. Discord tints the area behind a nameplate with one of these colors
 * (`dark` for the dark theme, `light` for the light theme). Values match the Discord client.
 */

export interface NameplatePaletteColors {
  name: string;
  label: string;
  dark: string;
  light: string;
}

export const NAMEPLATE_PALETTES: Readonly<Record<string, Omit<NameplatePaletteColors, "name">>> = {
  crimson: { label: "Crimson", dark: "#900007", light: "#e7040f" },
  berry: { label: "Berry", dark: "#893a99", light: "#b11fcf" },
  sky: { label: "Sky", dark: "#0080b7", light: "#56ccff" },
  teal: { label: "Teal", dark: "#086460", light: "#7deed7" },
  forest: { label: "Forest", dark: "#2d5401", light: "#6aa624" },
  bubble_gum: { label: "Bubble Gum", dark: "#dc3e97", light: "#f957b3" },
  violet: { label: "Violet", dark: "#730bc8", light: "#972fed" },
  cobalt: { label: "Cobalt", dark: "#0131c2", light: "#4278ff" },
  clover: { label: "Clover", dark: "#047b20", light: "#63cd5a" },
  lemon: { label: "Lemon", dark: "#f6cd12", light: "#fed400" },
  white: { label: "White", dark: "#ffffff", light: "#ffffff" },
};

export function nameplatePalette(name: string | null | undefined): NameplatePaletteColors | null {
  if (!name || !Object.hasOwn(NAMEPLATE_PALETTES, name)) return null;
  const colors = NAMEPLATE_PALETTES[name]!;
  return { name, ...colors };
}
