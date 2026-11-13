import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectLanyard, createSocketState, HANDSHAKE_TIMEOUT, MAX_FAILURES, POLL_INTERVAL, pollingUrl, reconnectDelay, reduceSocket, type PresenceSnapshot, type SocketState, type SocketTransport } from "@/lib/lanyard/socket";
import { demoUserPresence, offlinePresence } from "./fixtures";
import { presenceSchema } from "@/lib/lanyard/schema";

const id = demoUserPresence.discord_user.id;
const hello = { op: 1, d: { heartbeat_interval: 30_000 } };
const init = { op: 0, t: "INIT_STATE", d: demoUserPresence };
function liveState(): SocketState {
  let state = reduceSocket(createSocketState(id), { type: "start", now: 0 }).state;
  state = reduceSocket(state, { type: "message", value: hello, now: 0 }).state;
  return reduceSocket(state, { type: "message", value: init, now: 0 }).state;
}

export class FakeSocket implements SocketTransport {
  readyState: WebSocket["readyState"] = 1;
  onmessage: WebSocket["onmessage"] = null;
  onclose: WebSocket["onclose"] = null;
  onerror: WebSocket["onerror"] = null;
  send = vi.fn();
  close = vi.fn(() => { this.readyState = 3; });
  message(value: unknown) { this.onmessage?.call(this as unknown as WebSocket, new MessageEvent("message", { data: JSON.stringify(value) })); }
  fail() { this.onerror?.call(this as unknown as WebSocket, new Event("error")); }
}

describe("Lanyard pure reducer", () => {
  it("starts with a hydration snapshot and validates the ID before connecting", () => {
    expect(createSocketState(id, demoUserPresence).data).toBe(demoUserPresence);
    expect(reduceSocket(createSocketState("bad"), { type: "start", now: 0 })).toMatchObject({ state: { status: "error", error: "invalid_id", phase: "stopped" }, effects: [] });
    expect(createSocketState("12345678901234567", demoUserPresence).data).toBeNull();
  });
  it("subscribes on Hello and sends op 3 at the supplied heartbeat interval", () => {
    const state = reduceSocket(createSocketState(id), { type: "start", now: 0 }).state;
    const helloResult = reduceSocket(state, { type: "message", value: { op: 1, d: { heartbeat_interval: 5000 } }, now: 100 });
    expect(helloResult.effects).toEqual([{ type: "send", value: { op: 2, d: { subscribe_to_id: id } } }]);
    const subscribed = reduceSocket(helloResult.state, { type: "message", value: init, now: 200 }).state;
    expect(reduceSocket(subscribed, { type: "tick", now: 5099, random: .5 }).effects).toEqual([]);
    expect(reduceSocket(subscribed, { type: "tick", now: 5100, random: .5 }).effects).toEqual([{ type: "send", value: { op: 3 } }]);
  });
  it.each([0, -1, NaN, Infinity, "30000", 999, 999_999])("ignores an invalid heartbeat interval: %s", (interval) => {
    const state = reduceSocket(createSocketState(id), { type: "start", now: 0 }).state;
    expect(reduceSocket(state, { type: "message", value: { op: 1, d: { heartbeat_interval: interval } }, now: 0 }).effects).toEqual([]);
  });
  it("accepts INIT_STATE and PRESENCE_UPDATE with matching, validated presence", () => {
    const state = liveState();
    expect(state).toMatchObject({ phase: "subscribed", status: "live", lastUpdate: 0, error: null });
    const updated = reduceSocket(state, { type: "message", value: { op: 0, t: "PRESENCE_UPDATE", d: offlinePresence }, now: 5000 });
    expect(updated.state).toMatchObject({ data: offlinePresence, lastUpdate: 5000, status: "live" });
  });
  it("supports an ID-keyed INIT_STATE", () => {
    expect(reduceSocket(liveState(), { type: "message", value: { op: 0, t: "INIT_STATE", d: { [id]: offlinePresence } }, now: 10 }).state.data).toEqual(offlinePresence);
  });
  it("ignores malformed payloads, wrong users, and unknown events", () => {
    const state = liveState();
    for (const value of [null, "junk", { op: 0, t: "UNKNOWN", d: offlinePresence }, { op: 0, t: "PRESENCE_UPDATE", d: {} }, { op: 0, t: "PRESENCE_UPDATE", d: { ...offlinePresence, discord_user: { ...offlinePresence.discord_user, id: "12345678901234567" } } }]) {
      expect(reduceSocket(state, { type: "message", value, now: 10 }).state).toBe(state);
    }
  });
  it("uses bounded exponential backoff with jitter", () => {
    expect([1, 2, 3, 4].map((attempt) => reconnectDelay(attempt, .5))).toEqual([1000, 2000, 4000, 8000]);
    expect(reconnectDelay(1, 0)).toBe(750);
    expect(reconnectDelay(1, 1)).toBe(1250);
    expect(reconnectDelay(100, 1)).toBe(37_500);
  });
  it("times out a missing Hello or missing INIT_STATE", () => {
    let state = reduceSocket(createSocketState(id), { type: "start", now: 0 }).state;
    expect(reduceSocket(state, { type: "tick", now: HANDSHAKE_TIMEOUT, random: .5 }).state.phase).toBe("backoff");
    state = reduceSocket(state, { type: "message", value: hello, now: 100 }).state;
    expect(reduceSocket(state, { type: "tick", now: HANDSHAKE_TIMEOUT + 100, random: .5 }).state.phase).toBe("backoff");
  });
  it("probes a quiet connection instead of treating idle Discord as stale", () => {
    const quiet = reduceSocket(liveState(), { type: "tick", now: 90_000, random: .5 });
    expect(quiet.state.status).toBe("live");
    expect(quiet.effects).toContainEqual({ type: "send", value: { op: 2, d: { subscribe_to_id: id } } });
    const answered = reduceSocket(quiet.state, { type: "message", value: init, now: 90_100 }).state;
    expect(answered.probeAt).toBeNull();
    expect(reduceSocket(answered, { type: "tick", now: 100_000, random: .5 }).state.status).toBe("live");
    expect(reduceSocket(quiet.state, { type: "tick", now: 100_000, random: .5 }).state.phase).toBe("backoff");
  });
  it("does not reset failure history on a flapping connection", () => {
    const state = { ...liveState(), failures: 3 };
    expect(reduceSocket(state, { type: "tick", now: 59_000, random: .5 }).state.failures).toBe(3);
    expect(reduceSocket(state, { type: "tick", now: 60_000, random: .5 }).state.failures).toBe(0);
  });
  it("falls back after five failures and retries WS after five minutes", () => {
    const state = { ...liveState(), failures: MAX_FAILURES - 1 };
    const failed = reduceSocket(state, { type: "failure", now: 0, random: .5 });
    expect(failed.state).toMatchObject({ phase: "polling", status: "polling", pollAt: POLL_INTERVAL });
    expect(failed.effects).toEqual([{ type: "close" }, { type: "poll" }]);
    const polled = reduceSocket(failed.state, { type: "poll", result: { data: offlinePresence }, now: 1000 });
    expect(polled.state).toMatchObject({ data: offlinePresence, status: "polling", lastUpdate: 1000 });
    expect(reduceSocket(polled.state, { type: "tick", now: 30_000, random: .5 }).effects).toEqual([{ type: "poll" }]);
    expect(reduceSocket(polled.state, { type: "tick", now: 300_000, random: .5 }).effects).toEqual([{ type: "connect" }]);
  });
  it("handles not-monitored and REST errors without discarding a good snapshot unnecessarily", () => {
    const state: SocketState = { ...liveState(), phase: "polling" };
    const failed = reduceSocket(state, { type: "poll", result: { error: "unavailable" }, now: 50 }).state;
    expect(failed.data).toBe(state.data);
    expect(failed).toMatchObject({ error: "unavailable", status: "error" });
    expect(reduceSocket(state, { type: "poll", result: { error: "not_monitored" }, now: 50 }).state.data).toBeNull();
  });
  it("stops permanently and ignores duplicate failures during backoff", () => {
    const failed = reduceSocket(liveState(), { type: "failure", now: 0, random: .5 }).state;
    expect(reduceSocket(failed, { type: "failure", now: 0, random: .5 }).state).toBe(failed);
    const stopped = reduceSocket(failed, { type: "stop" }).state;
    expect(reduceSocket(stopped, { type: "start", now: 1000 }).state).toBe(stopped);
  });
  it("derives REST polling URLs from public and self-hosted socket endpoints", () => {
    expect(pollingUrl("wss://api.lanyard.rest/socket", id)).toBe(`https://api.lanyard.rest/v1/users/${id}`);
    expect(pollingUrl("ws://localhost:4001/lanyard/socket?test=1", id)).toBe(`http://localhost:4001/lanyard/v1/users/${id}`);
  });
});

describe("Lanyard transport with fake WebSocket and timers", () => {
  let sockets: FakeSocket[];
  let stop: () => void;
  let snapshots: PresenceSnapshot[];
  const factory = () => { const socket = new FakeSocket(); sockets.push(socket); return socket; };
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); sockets = []; snapshots = []; stop = () => {}; });
  afterEach(() => { stop(); vi.useRealTimers(); });
  it("subscribes, updates presence, and cleans up heartbeat timers and handlers", () => {
    stop = connectLanyard(id, (snapshot) => snapshots.push(snapshot), { createWebSocket: factory });
    const socket = sockets[0]!;
    socket.message(hello); socket.message(init);
    vi.advanceTimersByTime(30_000);
    expect(socket.send.mock.calls.map(([frame]) => JSON.parse(frame as string))).toEqual([{ op: 2, d: { subscribe_to_id: id } }, { op: 3 }]);
    socket.message({ op: 0, t: "PRESENCE_UPDATE", d: offlinePresence });
    expect(snapshots.at(-1)?.data?.discord_status).toBe("offline");
    stop();
    expect(socket.close).toHaveBeenCalledOnce();
    expect(socket.onmessage).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("reconnects on error once, ignores old messages, and does not reconnect after cleanup", () => {
    stop = connectLanyard(id, (snapshot) => snapshots.push(snapshot), { createWebSocket: factory, random: () => .5 });
    const socket = sockets[0]!;
    const late = socket.onmessage;
    socket.fail();
    vi.advanceTimersByTime(999); expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1); expect(sockets).toHaveLength(2);
    late?.call(socket as unknown as WebSocket, new MessageEvent("message", { data: JSON.stringify(init) }));
    expect(snapshots.some((snapshot) => snapshot.status === "live")).toBe(false);
    stop(); vi.advanceTimersByTime(60_000); expect(sockets).toHaveLength(2);
  });
  it("falls back to validated REST snapshots every 30 seconds", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ success: true, data: demoUserPresence })));
    stop = connectLanyard(id, (snapshot) => snapshots.push(snapshot), { createWebSocket: factory, fetchImpl, random: () => .5 });
    for (let i = 0; i < MAX_FAILURES; i++) { sockets.at(-1)!.fail(); if (i < MAX_FAILURES - 1) await vi.advanceTimersByTimeAsync(reconnectDelay(i + 1, .5)); }
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(snapshots.at(-1)).toMatchObject({ status: "polling", data: presenceSchema.parse(demoUserPresence) });
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("aborts an outstanding REST request and ignores its late result on unmount", async () => {
    let signal: AbortSignal | undefined;
    let resolve: ((value: Response) => void) | undefined;
    const fetchImpl = vi.fn().mockImplementation((_url: string, init: RequestInit) => { signal = init.signal!; return new Promise<Response>((done) => { resolve = done; }); });
    stop = connectLanyard(id, (snapshot) => snapshots.push(snapshot), { createWebSocket: factory, fetchImpl, random: () => .5 });
    for (let i = 0; i < MAX_FAILURES; i++) { sockets.at(-1)!.fail(); if (i < MAX_FAILURES - 1) await vi.advanceTimersByTimeAsync(reconnectDelay(i + 1, .5)); }
    const count = snapshots.length;
    stop(); expect(signal?.aborted).toBe(true);
    resolve!(new Response(JSON.stringify({ success: true, data: demoUserPresence })));
    await vi.advanceTimersByTimeAsync(0);
    expect(snapshots).toHaveLength(count); expect(vi.getTimerCount()).toBe(0);
  });
  it("handles transport creation failures, a missing WebSocket implementation, and invalid JSON", () => {
    stop = connectLanyard(id, () => {}, { createWebSocket: () => { throw new Error("Blocked"); } });
    expect(vi.getTimerCount()).toBe(1); stop();
    stop = connectLanyard(id, (snapshot) => snapshots.push(snapshot), { createWebSocket: factory });
    sockets[0]!.onmessage?.call(sockets[0] as unknown as WebSocket, new MessageEvent("message", { data: "not JSON" }));
    expect(snapshots).toEqual([]);
  });
  it("dispatches an immediate tick when a backgrounded tab becomes visible again", () => {
    const fakeDoc = Object.assign(new EventTarget(), { visibilityState: "visible" });
    vi.stubGlobal("document", fakeDoc);
    try {
      let now = 0;
      stop = connectLanyard(id, (snapshot) => snapshots.push(snapshot), { createWebSocket: factory, now: () => now, random: () => 0.5 });
      sockets[0]!.fail();
      now = 1000;
      fakeDoc.dispatchEvent(new Event("visibilitychange"));
      expect(sockets).toHaveLength(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
