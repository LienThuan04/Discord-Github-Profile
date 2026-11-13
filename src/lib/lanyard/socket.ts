import { presenceSchema } from "./schema";
import type { LanyardPresence } from "./types";

export type ConnectionStatus = "connecting" | "live" | "polling" | "error";
export type PresenceError = "not_monitored" | "unavailable" | "invalid_id";
export interface PresenceSnapshot {
  data: LanyardPresence | null;
  status: ConnectionStatus;
  lastUpdate: number | null;
  error: PresenceError | null;
}
export interface SocketState extends PresenceSnapshot {
  id: string;
  phase: "idle" | "connecting" | "subscribed" | "backoff" | "polling" | "stopped";
  failures: number;
  heartbeatInterval: number | null;
  heartbeatAt: number;
  deadline: number;
  lastMessage: number;
  stableSince: number | null;
  probeAt: number | null;
  pollAt: number;
}
export type PollResult = { data: LanyardPresence; error?: never } | { data?: never; error: PresenceError };
export type SocketEvent =
  | { type: "start"; now: number }
  | { type: "message"; value: unknown; now: number }
  | { type: "failure"; now: number; random: number }
  | { type: "tick"; now: number; random: number }
  | { type: "poll"; result: PollResult; now: number }
  | { type: "stop" };
export type SocketEffect = { type: "connect" | "close" | "poll" } | { type: "send"; value: unknown };
export interface Transition { state: SocketState; effects: SocketEffect[] }

export const POLL_INTERVAL = 30_000;
export const HANDSHAKE_TIMEOUT = 10_000;
export const MAX_FAILURES = 5;
const RECOVER_AFTER = 300_000;
const subscribe = (id: string): SocketEffect => ({ type: "send", value: { op: 2, d: { subscribe_to_id: id } } });

export function createSocketState(id: string, initial: LanyardPresence | null = null, error: PresenceError | null = null): SocketState {
  return { id, data: initial?.discord_user.id === id ? initial : null, error, status: "connecting", lastUpdate: null, phase: "idle", failures: 0, heartbeatInterval: null, heartbeatAt: Infinity, deadline: Infinity, lastMessage: 0, stableSince: null, probeAt: null, pollAt: Infinity };
}

export function reconnectDelay(failures: number, random: number): number {
  return Math.round(Math.min(30_000, 1000 * 2 ** Math.min(Math.max(failures - 1, 0), 5)) * (0.75 + Math.max(0, Math.min(1, random)) * 0.5));
}

function failed(state: SocketState, now: number, random: number): Transition {
  const failures = state.failures + 1;
  const polling = failures >= MAX_FAILURES;
  return { state: { ...state, phase: polling ? "polling" : "backoff", status: polling ? "polling" : "connecting", failures, heartbeatInterval: null, heartbeatAt: Infinity, probeAt: null, stableSince: null, deadline: now + (polling ? RECOVER_AFTER : reconnectDelay(failures, random)), pollAt: polling ? now + POLL_INTERVAL : Infinity }, effects: [{ type: "close" }, ...(polling ? [{ type: "poll" } as const] : [])] };
}

/** Pure protocol reducer. Time, randomness, transport and REST are supplied by the caller. */
export function reduceSocket(state: SocketState, event: SocketEvent): Transition {
  const unchanged = { state, effects: [] };
  if (event.type === "stop") return { state: { ...state, phase: "stopped" }, effects: [{ type: "close" }] };
  if (state.phase === "stopped") return unchanged;
  if (event.type === "start") {
    if (!/^\d{17,20}$/.test(state.id)) return { state: { ...state, status: "error", error: "invalid_id", phase: "stopped" }, effects: [] };
    return { state: { ...state, phase: "connecting", deadline: event.now + HANDSHAKE_TIMEOUT }, effects: [{ type: "connect" }] };
  }
  if (event.type === "failure") return ["connecting", "subscribed"].includes(state.phase) ? failed(state, event.now, event.random) : unchanged;
  if (event.type === "poll") {
    if (state.phase !== "polling") return unchanged;
    return { state: { ...state, data: event.result.data ?? (event.result.error === "not_monitored" ? null : state.data), error: event.result.error ?? null, status: event.result.error ? "error" : "polling", lastUpdate: event.result.data ? event.now : state.lastUpdate }, effects: [] };
  }
  if (event.type === "tick") {
    if (state.phase === "backoff" || state.phase === "polling") {
      if (event.now >= state.deadline) return { state: { ...state, phase: "connecting", status: "connecting", deadline: event.now + HANDSHAKE_TIMEOUT, pollAt: Infinity }, effects: [{ type: "connect" }] };
      if (state.phase === "polling" && event.now >= state.pollAt) return { state: { ...state, pollAt: event.now + POLL_INTERVAL }, effects: [{ type: "poll" }] };
      return unchanged;
    }
    if (state.phase !== "connecting" && state.phase !== "subscribed") return unchanged;
    if (event.now >= state.deadline) return failed(state, event.now, event.random);
    let next = state;
    const effects: SocketEffect[] = [];
    if (state.stableSince !== null && event.now - state.stableSince >= 60_000 && state.failures) next = { ...next, failures: 0 };
    // Lanyard has no heartbeat ACK. Re-subscribe after a quiet window to elicit INIT_STATE;
    // only a missed probe is stale, so an unchanged Discord status stays connected.
    if (state.phase === "subscribed" && state.probeAt === null && event.now - state.lastMessage >= Math.max(90_000, (state.heartbeatInterval ?? 30_000) * 3)) {
      next = { ...next, probeAt: event.now, deadline: event.now + HANDSHAKE_TIMEOUT };
      effects.push(subscribe(state.id));
    }
    if (state.heartbeatInterval && event.now >= state.heartbeatAt) {
      next = { ...next, heartbeatAt: event.now + state.heartbeatInterval };
      effects.push({ type: "send", value: { op: 3 } });
    }
    return { state: next, effects };
  }
  if (event.type === "message") {
    if (!["connecting", "subscribed"].includes(state.phase) || !event.value || typeof event.value !== "object") return unchanged;
    const message = event.value as { op?: unknown; d?: unknown; t?: unknown };
    if (message.op === 1 && state.heartbeatInterval === null) {
      const interval = (message.d as { heartbeat_interval?: unknown } | null)?.heartbeat_interval;
      if (typeof interval !== "number" || !Number.isFinite(interval) || interval < 1000 || interval > 120_000) return unchanged;
      return { state: { ...state, heartbeatInterval: interval, heartbeatAt: event.now + interval, lastMessage: event.now, deadline: event.now + HANDSHAKE_TIMEOUT }, effects: [subscribe(state.id)] };
    }
    if (message.op !== 0 || !["INIT_STATE", "PRESENCE_UPDATE"].includes(String(message.t)) || state.heartbeatInterval === null) return unchanged;
    const value = message.d && typeof message.d === "object" && state.id in message.d ? (message.d as Record<string, unknown>)[state.id] : message.d;
    const parsed = presenceSchema.safeParse(value);
    if (!parsed.success || parsed.data.discord_user.id !== state.id) return unchanged;
    return { state: { ...state, data: parsed.data, error: null, status: "live", phase: "subscribed", lastUpdate: event.now, lastMessage: event.now, stableSince: state.stableSince ?? event.now, probeAt: null, deadline: Infinity }, effects: [] };
  }
  return unchanged;
}

export type SocketTransport = Pick<WebSocket, "readyState" | "onmessage" | "onclose" | "onerror" | "send" | "close">;
export interface ConnectionOptions {
  initial?: LanyardPresence | null;
  initialError?: PresenceError | null;
  url?: string;
  createWebSocket?: (url: string) => SocketTransport;
  fetchImpl?: typeof fetch;
  now?: () => number;
  random?: () => number;
}

/** Browser REST follows the public WS host, including a self-hosted path prefix. */
export function pollingUrl(socketUrl: string, id: string): string {
  const url = new URL(socketUrl);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = url.pathname.replace(/\/socket\/?$/, "") + `/v1/users/${id}`;
  url.search = "";
  url.hash = "";
  return url.href;
}

/** Small effect runner used by the React adapter and real-endpoint verification. */
export function connectLanyard(id: string, onChange: (snapshot: PresenceSnapshot) => void, options: ConnectionOptions = {}): () => void {
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const url = options.url ?? process.env.NEXT_PUBLIC_LANYARD_WS_URL ?? "wss://api.lanyard.rest/socket";
  let state = createSocketState(id, options.initial, options.initialError);
  let socket: SocketTransport | null = null;
  let stopped = false;
  let request: AbortController | null = null;
  let pollTimeout: ReturnType<typeof setTimeout> | null = null;
  const close = () => {
    if (!socket) return;
    const previous = socket;
    socket = null;
    previous.onmessage = previous.onclose = previous.onerror = null;
    previous.close();
  };
  const poll = async () => {
    if (request || stopped) return;
    const controller = new AbortController();
    request = controller;
    pollTimeout = setTimeout(() => controller.abort(), 5000);
    let result: PollResult;
    try {
      const response = await (options.fetchImpl ?? fetch)(pollingUrl(url, id), { signal: controller.signal, cache: "no-store" });
      const body = await response.json() as { success?: unknown; data?: unknown; error?: { code?: unknown } };
      const parsed = presenceSchema.safeParse(body.data);
      result = response.ok && body.success === true && parsed.success && parsed.data.discord_user.id === id ? { data: parsed.data } : { error: body.error?.code === "user_not_monitored" ? "not_monitored" : "unavailable" };
    } catch { result = { error: "unavailable" }; }
    finally { if (pollTimeout) clearTimeout(pollTimeout); request = null; }
    if (!stopped) dispatch({ type: "poll", result, now: now() });
  };
  function dispatch(event: SocketEvent) {
    if (stopped) return;
    const transition = reduceSocket(state, event);
    const previous = state;
    state = transition.state;
    if (previous.data !== state.data || previous.status !== state.status || previous.lastUpdate !== state.lastUpdate || previous.error !== state.error) onChange({ data: state.data, status: state.status, lastUpdate: state.lastUpdate, error: state.error });
    for (const effect of transition.effects) {
      if (effect.type === "close") close();
      else if (effect.type === "poll") void poll();
      else if (effect.type === "connect") {
        close();
        try {
          const current = (options.createWebSocket ?? ((address) => new WebSocket(address)))(url);
          socket = current;
          current.onmessage = (message) => {
            if (socket !== current || stopped) return;
            try { dispatch({ type: "message", value: JSON.parse(String(message.data)), now: now() }); } catch { /* Ignore malformed and unknown frames. */ }
          };
          const failure = () => { if (socket === current) dispatch({ type: "failure", now: now(), random: random() }); };
          current.onclose = failure;
          current.onerror = failure;
        } catch { dispatch({ type: "failure", now: now(), random: random() }); }
      } else if (effect.type === "send") {
        try {
          if (!socket || socket.readyState !== 1) throw new Error("Socket is not open");
          socket.send(JSON.stringify(effect.value));
        } catch { dispatch({ type: "failure", now: now(), random: random() }); }
      }
    }
  }
  dispatch({ type: "start", now: now() });
  const tick = () => dispatch({ type: "tick", now: now(), random: random() });
  const timer = setInterval(tick, 250);
  const onVisibilityChange = () => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") tick();
  };
  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  return () => {
    stopped = true;
    clearInterval(timer);
    if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
    if (pollTimeout) clearTimeout(pollTimeout);
    request?.abort();
    state = reduceSocket(state, { type: "stop" }).state;
    close();
  };
}
