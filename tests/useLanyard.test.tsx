import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { createLanyardStore, useLanyard } from "@/hooks/useLanyard";
import type { SocketTransport } from "@/lib/lanyard/socket";
import { demoUserPresence } from "./fixtures";

const id = demoUserPresence.discord_user.id;
function socket(): SocketTransport { return { readyState: 1, onmessage: null, onerror: null, onclose: null, send: vi.fn(), close: vi.fn() }; }
afterEach(() => vi.useRealTimers());

describe("useLanyard external store lifecycle", () => {
  it("renders initial presence on the server without opening a socket", () => {
    function Probe() { const { data, status, lastUpdate } = useLanyard(id, { initial: demoUserPresence }); return <p>{data?.discord_user.username}:{status}:{String(lastUpdate)}</p>; }
    expect(renderToString(<Probe />)).toContain("lianharman<!-- -->:<!-- -->connecting<!-- -->:<!-- -->null");
  });
  it("creates a lazy store with stable server and client snapshots", () => {
    const createWebSocket = vi.fn(socket);
    const store = createLanyardStore(id, { initial: demoUserPresence, createWebSocket });
    expect(store.getSnapshot()).toBe(store.getServerSnapshot());
    expect(store.getSnapshot()).toBe(store.getSnapshot());
    expect(createWebSocket).not.toHaveBeenCalled();
  });
  it("shares a subscription within a mounted store and closes after the last subscriber", () => {
    vi.useFakeTimers();
    const transport = socket();
    const createWebSocket = vi.fn(() => transport);
    const store = createLanyardStore(id, { createWebSocket });
    const off1 = store.subscribe(vi.fn()); const off2 = store.subscribe(vi.fn());
    expect(createWebSocket).toHaveBeenCalledOnce();
    off1(); expect(transport.close).not.toHaveBeenCalled();
    off2(); expect(transport.close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it("notifies subscribers and preserves the server snapshot for hydration", () => {
    vi.useFakeTimers();
    const transport = socket();
    const store = createLanyardStore(id, { createWebSocket: () => transport });
    const notify = vi.fn(); const off = store.subscribe(notify);
    transport.onmessage?.call(transport as WebSocket, new MessageEvent("message", { data: JSON.stringify({ op: 1, d: { heartbeat_interval: 30_000 } }) }));
    transport.onmessage?.call(transport as WebSocket, new MessageEvent("message", { data: JSON.stringify({ op: 0, t: "INIT_STATE", d: demoUserPresence }) }));
    expect(store.getSnapshot().status).toBe("live"); expect(notify).toHaveBeenCalledOnce();
    expect(store.getServerSnapshot().status).toBe("connecting"); off();
  });
  it("isolates an ID change from the previous user's presence and callbacks", () => {
    vi.useFakeTimers();
    const oldSocket = socket();
    const previous = createLanyardStore(id, { initial: demoUserPresence, createWebSocket: () => oldSocket });
    const off = previous.subscribe(vi.fn()); off();
    const next = createLanyardStore("12345678901234567", { initial: demoUserPresence, createWebSocket: socket });
    expect(next.getSnapshot().data).toBeNull(); expect(oldSocket.onmessage).toBeNull();
    const offNext = next.subscribe(vi.fn()); offNext(); expect(vi.getTimerCount()).toBe(0);
  });
  it("supports React Strict Mode's subscribe-cleanup-subscribe cycle", () => {
    vi.useFakeTimers(); const createWebSocket = vi.fn(socket);
    const store = createLanyardStore(id, { createWebSocket });
    store.subscribe(vi.fn())(); const off = store.subscribe(vi.fn());
    expect(createWebSocket).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(1);
    off(); expect(vi.getTimerCount()).toBe(0);
  });
});
