/** The SVG resolver uses a transparent 1×1 PNG on failure. Keep this check browser-safe. */
export const isMissingImage = (source: string): boolean => source.startsWith("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB");
