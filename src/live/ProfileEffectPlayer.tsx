"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ProfileEffectLayer } from "@/lib/discord/profile";
import { startEffectLayer } from "./profile-effect-timeline";

const query = "(prefers-reduced-motion: reduce)";
const motionSnapshot = () => !window.matchMedia(query).matches;
const serverMotionSnapshot = () => false;
function subscribeMotion(notify: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

function Layer({ layer, scale, moving }: { layer: ProfileEffectLayer; scale: number; moving: boolean }) {
  const [cycle, setCycle] = useState<number | null>(null);
  const signature = JSON.stringify(layer);
  useEffect(() => {
    if (!moving) return;
    return startEffectLayer(JSON.parse(signature) as ProfileEffectLayer, setCycle);
  }, [signature, moving]);
  if (!moving || cycle === null) return null;
  return <img key={cycle} className="pf-fx-layer" src={layer.url} alt="" style={{ left: layer.x * scale, top: layer.y * scale, width: layer.width * scale, height: layer.height * scale }} />;
}

/** Browser-only playback keeps the shared card tree pure and survives the live clock's one-second updates. */
export function ProfileEffectPlayer({ layers, still, scale }: { layers: ProfileEffectLayer[]; still: string | null; scale: number }) {
  const moving = useSyncExternalStore(subscribeMotion, motionSnapshot, serverMotionSnapshot);
  return <div className={`pf-player${moving ? " pf-playing" : ""}`}>
    {still && <img className="pf-fx-still" src={still} alt="" />}
    {layers.map((layer, index) => <Layer key={`${index}-${layer.url}`} layer={layer} scale={scale} moving={moving} />)}
  </div>;
}
