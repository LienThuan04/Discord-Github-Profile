import type { CSSProperties, ReactNode } from "react";
import type { ProfileFrame } from "@/lib/discord/profile";
import type { CardProps, CardSize, ThemeDefinition } from "../types";
import { LiveFrameArt } from "@/live/LiveFrameArt";
import { isMissingImage } from "./image-state";

/** Overflow is rounded up once; all card and layer coordinates retain subpixel precision. */
export function frameGeometry(size: CardSize, frame: ProfileFrame | null | undefined) {
  const scale = frame?.layers.length ? size.width / frame.innerWidth : 0;
  const left = (frame?.overflowHorizontal ?? 0) * scale;
  const top = (frame?.overflowTop ?? 0) * scale;
  const bottom = (frame?.overflowBottom ?? 0) * scale;
  return {
    width: Math.ceil(size.width + left * 2), height: Math.ceil(size.height + top + bottom), left, top, scale,
    layerWidth: size.width + left * 2,
    layers: (frame?.layers ?? []).map((layer) => ({ ...layer, left: 0, ...(layer.anchor === "top" ? { top: 0 } : { bottom: 0 }) })),
  };
}

/** One display pixel per layer pixel; requesting originals is never necessary for README artwork. */
export function frameLayerSources(url: string, width: number, ratio = 1): string[] {
  const pixels = Math.min(1200, Math.ceil(width));
  // Discord ignores width alone and pads mismatched bounding ratios, shifting transparent art.
  const height = Math.max(1, Math.round(pixels / ratio));
  return [`${url}?format=webp&width=${pixels}&height=${height}`, `${url}?width=${pixels}&height=${height}`, url];
}

export interface FrameImage { sources: string[]; style: CSSProperties; order: "front" | "back" }
function FrameCanvas({ props, size, frame, children }: { props: CardProps; size: CardSize; frame: ProfileFrame; children: ReactNode }) {
  const geometry = frameGeometry(size, frame);
  const images: FrameImage[] = geometry.layers.map((layer) => ({
    sources: frameLayerSources(layer.url, geometry.layerWidth, layer.width && layer.height ? layer.width / layer.height : 1), order: layer.order,
    // A 32px badge cannot contain the crown's base. Keep its geometry outside the pill and its pixels behind it.
    style: { position: "absolute", left: layer.left, ...(layer.anchor === "top" ? { top: 0 } : { bottom: 0 }), width: geometry.layerWidth, height: "auto", maxWidth: "none", pointerEvents: "none", zIndex: layer.order === "front" && props.options.theme !== "badge" ? 2 : 0 },
  }));
  const resolved = props.target === "live" ? [] : images.map((image) => props.assets(image.sources[0]!, "image", image.sources.slice(1)));
  const ready = resolved.every((src) => !isMissingImage(src));
  return <div className="pf-frame-canvas" style={{ position: "relative", isolation: "isolate", width: geometry.width, height: geometry.height }}>
    {props.target === "live" ? <LiveFrameArt images={images} label={frame.label} /> : ready && images.map((image, index) => <img key={index} src={resolved[index]} alt="" aria-label={index === 0 ? frame.label : undefined} style={image.style} />)}
    <div style={{ position: "absolute", left: geometry.left, top: geometry.top, width: size.width, height: size.height, zIndex: 1 }}>{children}</div>
  </div>;
}

/** Registry boundary: individual themes keep measuring their card body, avoiding recursive grown measurements. */
export function withProfileFrame(theme: ThemeDefinition): ThemeDefinition {
  return { ...theme, usesProfile: true, supportedParams: [...new Set([...theme.supportedParams, "hide_frame" as const])],
    measure(data, options, error) { const { width, height } = frameGeometry(theme.measure(data, options, error), !error && !options.hide_frame ? data.profile?.frame : null); return { width, height }; },
    Component: function FramedCard(props) {
      const Body = theme.Component;
      const frame = !props.error && !props.options.hide_frame ? props.data.profile?.frame : null;
      return frame?.layers.length ? <FrameCanvas props={props} frame={frame} size={theme.measure(props.data, props.options, props.error)}><Body {...props} /></FrameCanvas> : <Body {...props} />;
    },
  };
}
