"use client";
import { useEffect, useState } from "react";
import type { FrameImage } from "@/card/parts/profile-frame";

/** Load the entire frame atomically. Failed art never paints an image or changes the reserved canvas. */
export function LiveFrameArt({ images, label }: { images: FrameImage[]; label: string }) {
  const signature = JSON.stringify(images.map((image) => image.sources));
  const [loaded, setLoaded] = useState<{ signature: string; urls: string[] } | null>(null);
  useEffect(() => {
    let active = true;
    const load = async (sources: string[]): Promise<string> => {
      for (const src of sources) {
        if (!active) throw new Error("Disposed frame");
        const image = new Image();
        try { await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = src; }); return src; } catch { /* Try the next CDN format. */ }
      }
      throw new Error("Frame unavailable");
    };
    Promise.all((JSON.parse(signature) as string[][]).map(load)).then((urls) => { if (active) setLoaded({ signature, urls }); }, () => { if (active) setLoaded(null); });
    return () => { active = false; };
  }, [signature]);
  if (loaded?.signature !== signature) return null;
  return <>{images.map((image, index) => <img key={index} src={loaded.urls[index]} alt="" aria-label={index === 0 ? label : undefined} style={image.style} onError={() => setLoaded(null)} />)}</>;
}
