import type { FontStyle } from "@/lib/style-options";

/**
 * System font stacks only: no font file is ever requested. Every stack ends in a family with
 * Vietnamese coverage (Segoe UI, Calibri, Cambria, Georgia, Consolas), so names such as "LiênThuận"
 * keep matching diacritics. `default` keeps whatever the theme declares.
 */
export const FONT_STACKS: Record<Exclude<FontStyle, "default">, string> = {
  rounded: 'ui-rounded,"SF Pro Rounded",Nunito,"Varela Round",Calibri,Candara,"Segoe UI",sans-serif',
  mono: 'ui-monospace,"Cascadia Mono","Cascadia Code","SF Mono",Menlo,Consolas,"Liberation Mono","Courier New",monospace',
  serif: 'ui-serif,"Iowan Old Style",Charter,Cambria,Georgia,"Times New Roman",serif',
  condensed: '"Bahnschrift SemiCondensed",Bahnschrift,"Roboto Condensed","Arial Narrow","Segoe UI",sans-serif',
  display: '"Arial Black","Segoe UI Black","Segoe UI",system-ui,-apple-system,"Helvetica Neue",sans-serif',
};
