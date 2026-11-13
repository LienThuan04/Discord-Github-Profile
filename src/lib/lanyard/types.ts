/**
 * Types for the Lanyard API (https://github.com/Phineas/lanyard).
 *
 * Shapes were verified against the live REST response for the demo user on 2026-11-12.
 * Optional fields are marked optional because Lanyard (and Discord) omit or null them
 * inconsistently across clients.
 */

export type DiscordStatus = "online" | "idle" | "dnd" | "offline";

export interface AvatarDecorationData {
  asset: string;
  sku_id?: string | null;
  expires_at?: number | null;
}

/** Nameplate palette names Discord ships today. Unknown names are tolerated at runtime. */
export type NameplatePaletteName =
  | "crimson"
  | "berry"
  | "sky"
  | "teal"
  | "forest"
  | "bubble_gum"
  | "violet"
  | "cobalt"
  | "clover"
  | "lemon"
  | "white";

export interface Nameplate {
  /** Path prefix such as `nameplates/pitter_patter/1495807265175900180/` (trailing slash included). */
  asset: string;
  label?: string | null;
  palette?: NameplatePaletteName | (string & {}) | null;
  sku_id?: string | null;
  expires_at?: number | null;
}

export interface Collectibles {
  nameplate?: Nameplate | null;
}

export interface DisplayNameStyles {
  font_id: number;
  effect_id: number;
  /** RGB integers, e.g. 16711680 for #ff0000. */
  colors: number[];
}

export interface PrimaryGuild {
  tag: string | null;
  badge: string | null;
  identity_guild_id: string | null;
  identity_enabled: boolean | null;
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  display_name?: string | null;
  discriminator?: string;
  avatar: string | null;
  avatar_decoration_data?: AvatarDecorationData | null;
  collectibles?: Collectibles | null;
  display_name_styles?: DisplayNameStyles | null;
  primary_guild?: PrimaryGuild | null;
  public_flags?: number;
  bot?: boolean;
  clan?: PrimaryGuild | null;
}

export interface ActivityTimestamps {
  start?: number | null;
  end?: number | null;
}

export interface ActivityAssets {
  large_image?: string | null;
  large_text?: string | null;
  small_image?: string | null;
  small_text?: string | null;
}

export interface ActivityParty {
  id?: string | null;
  /** `[current, max]` */
  size?: [number, number] | null;
}

export interface ActivityEmoji {
  name: string;
  id?: string | null;
  animated?: boolean | null;
}

/** Activity types as sent by Discord. */
export const ActivityType = {
  Playing: 0,
  Streaming: 1,
  Listening: 2,
  Watching: 3,
  Custom: 4,
  Competing: 5,
} as const;
export type ActivityTypeValue = (typeof ActivityType)[keyof typeof ActivityType];

export interface Activity {
  id: string;
  name: string;
  type: number;
  state?: string | null;
  details?: string | null;
  url?: string | null;
  application_id?: string | null;
  created_at?: number;
  session_id?: string;
  sync_id?: string | null;
  flags?: number;
  platform?: string;
  timestamps?: ActivityTimestamps | null;
  assets?: ActivityAssets | null;
  party?: ActivityParty | null;
  emoji?: ActivityEmoji | null;
  /** Button labels only; Discord does not expose button URLs to other users. */
  buttons?: string[] | null;
  status_display_type?: number;
  details_url?: string | null;
  state_url?: string | null;
}

export interface SpotifyData {
  track_id: string | null;
  timestamps: { start: number; end: number } | null;
  song: string;
  artist: string;
  album_art_url: string | null;
  album: string;
}

export type LanyardKV = Record<string, string>;

export interface LanyardPresence {
  kv?: LanyardKV;
  discord_user: DiscordUser;
  activities: Activity[];
  discord_status: DiscordStatus;
  active_on_discord_web: boolean;
  active_on_discord_desktop: boolean;
  active_on_discord_mobile: boolean;
  active_on_discord_embedded?: boolean;
  active_on_discord_vr?: boolean;
  listening_to_spotify: boolean;
  spotify: SpotifyData | null;
}

export interface LanyardErrorBody {
  code: string;
  message: string;
}

export type LanyardRestResponse =
  | { success: true; data: LanyardPresence }
  | { success: false; error: LanyardErrorBody };

// ---------------------------------------------------------------------------
// WebSocket protocol (wss://api.lanyard.rest/socket)
// ---------------------------------------------------------------------------

export const LanyardOp = {
  Event: 0,
  Hello: 1,
  Initialize: 2,
  Heartbeat: 3,
} as const;

export interface WsHello {
  op: typeof LanyardOp.Hello;
  d: { heartbeat_interval: number };
}

export interface WsInitialize {
  op: typeof LanyardOp.Initialize;
  d:
    | { subscribe_to_id: string }
    | { subscribe_to_ids: string[] }
    | { subscribe_to_all: true };
}

export interface WsHeartbeat {
  op: typeof LanyardOp.Heartbeat;
}

/** A single subscription carries one presence; multi/all subscriptions map IDs to presences. */
export interface WsInitState {
  op: typeof LanyardOp.Event;
  seq?: number;
  t: "INIT_STATE";
  d: LanyardPresence | Record<string, LanyardPresence>;
}

export interface WsPresenceUpdate {
  op: typeof LanyardOp.Event;
  seq?: number;
  t: "PRESENCE_UPDATE";
  d: LanyardPresence;
}

export type WsServerMessage = WsHello | WsInitState | WsPresenceUpdate;
export type WsClientMessage = WsInitialize | WsHeartbeat;
