import type { ProfileEffectLayer } from "@/lib/discord/profile";

/** Mount APNGs at their actual start, then remount delayed loops to restart at frame zero. */
export function startEffectLayer(layer: ProfileEffectLayer, frame: (cycle: number | null) => void): () => void {
  let timer: ReturnType<typeof setTimeout>;
  let cycle = 0;
  let stopped = false;
  const show = () => {
    if (stopped) return;
    frame(cycle++);
    if (layer.loop && layer.loopDelay <= 0) return;
    timer = setTimeout(() => {
      if (stopped) return;
      frame(null);
      if (layer.loop) timer = setTimeout(show, Math.max(0, layer.loopDelay));
    }, Math.max(1, layer.duration));
  };
  timer = setTimeout(show, Math.max(0, layer.start));
  return () => { stopped = true; clearTimeout(timer); };
}
