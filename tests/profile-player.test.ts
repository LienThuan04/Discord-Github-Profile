import { afterEach, describe, expect, it, vi } from "vitest";
import { startEffectLayer } from "@/live/profile-effect-timeline";
import { requestProfile } from "@/hooks/useProfileExtras";
import { profileExtras } from "./fixtures/profile-extras";

afterEach(() => { vi.useRealTimers(); });
describe("live profile effect timing", () => {
  it("starts the intro at its offset, hides it after its duration and cancels on disposal", () => {
    vi.useFakeTimers();
    const frame = vi.fn();
    const stop = startEffectLayer({ ...profileExtras.effect!.layers![0]!, start: 500 }, frame);
    vi.advanceTimersByTime(499); expect(frame).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(frame).toHaveBeenLastCalledWith(0);
    vi.advanceTimersByTime(2000); expect(frame).toHaveBeenLastCalledWith(null);
    stop(); expect(vi.getTimerCount()).toBe(0);
  });
  it("restarts delayed loops from their first APNG frame, without restarting on presence ticks", () => {
    vi.useFakeTimers();
    const frame = vi.fn();
    const stop = startEffectLayer(profileExtras.effect!.layers![1]!, frame);
    vi.advanceTimersByTime(2000); expect(frame).toHaveBeenLastCalledWith(0);
    vi.advanceTimersByTime(4000); expect(frame).toHaveBeenLastCalledWith(null);
    vi.advanceTimersByTime(1000); expect(frame).toHaveBeenLastCalledWith(1);
    stop(); vi.advanceTimersByTime(10000); expect(frame).toHaveBeenCalledTimes(3);
  });
  it("leaves a continuous loop mounted", () => {
    vi.useFakeTimers();
    const frame = vi.fn();
    const stop = startEffectLayer({ ...profileExtras.effect!.layers![1]!, start: 0, loopDelay: 0 }, frame);
    vi.advanceTimersByTime(20000); expect(frame).toHaveBeenCalledExactlyOnceWith(0);
    stop();
  });
});
describe("Studio profile requests", () => {
  it("fetches once per ID, shares concurrent requests and never queries invalid IDs", async () => {
    const fetcher = vi.fn(async () => Response.json({ profile: profileExtras })) as unknown as typeof fetch;
    const first = requestProfile("123456789012345678", fetcher);
    const second = requestProfile("123456789012345678", fetcher);
    expect(first).toBe(second);
    expect(await first).toEqual(profileExtras);
    expect(await requestProfile("nope", fetcher)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("tolerates network and HTTP failures", async () => {
    expect(await requestProfile("123456789012345679", vi.fn(async () => { throw new Error("down"); }))).toBeNull();
    expect(await requestProfile("123456789012345680", vi.fn(async () => new Response("down", { status: 503 })))).toBeNull();
  });
});
