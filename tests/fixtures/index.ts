import demoUserJson from "./demo-user.json";
import notMonitoredJson from "./not-monitored.json";
import type { LanyardErrorBody, LanyardPresence, LanyardRestResponse } from "@/lib/lanyard/types";
import { UserFlag } from "@/lib/discord/badges";

export const FIXED_NOW = 1_794_492_000_000;

export const demoUserResponse = demoUserJson as LanyardRestResponse & {
  success: true;
  data: LanyardPresence;
};

export const demoUserPresence: LanyardPresence = demoUserResponse.data;

export const notMonitoredResponse = notMonitoredJson as {
  success: false;
  error: LanyardErrorBody;
};

/** Game activity with start/end timestamps, party size, large/small assets, and buttons. */
export const gamePresence: LanyardPresence = {
  ...demoUserPresence,
  kv: {
    bio: "Full-stack engineer building tools for the open web.",
    pronouns: "he/him",
    location: "Ho Chi Minh City, VN",
    website: "https://github.com/LienThuan04",
    banner: "https://cdn.discordapp.com/banners/983724520789655613/a_banner_hash.png",
    accent: "5865f2",
  },
  discord_user: {
    ...demoUserPresence.discord_user,
    public_flags: UserFlag.ActiveDeveloper | UserFlag.HypeSquadOnlineHouse2 | UserFlag.PremiumEarlySupporter,
  },
  discord_status: "dnd",
  active_on_discord_desktop: true,
  active_on_discord_web: true,
  active_on_discord_mobile: true,
  activities: [
    {
      id: "custom",
      name: "Custom Status",
      type: 4,
      state: "Shipping Phase 1",
      emoji: { name: "🔥" },
    },
    {
      id: "game-1",
      name: "Visual Studio Code",
      type: 0,
      application_id: "383226320970055681",
      details: "Editing normalize.ts",
      state: "Workspace: Discord-Github-Profile",
      timestamps: {
        start: FIXED_NOW - 125_000,
      },
      assets: {
        large_image: "1359298108856729682",
        large_text: "TypeScript JSX",
        small_image: "1359298109074706533",
        small_text: "Visual Studio Code",
      },
      party: {
        id: "party-1",
        size: [2, 4],
      },
      buttons: ["View Repository", "Open Card Studio"],
    },
  ],
};

/** Active Spotify playback alongside a game activity and a duplicate Spotify activity in `activities`. */
export const spotifyPresence: LanyardPresence = {
  ...demoUserPresence,
  discord_status: "online",
  active_on_discord_desktop: true,
  listening_to_spotify: true,
  spotify: {
    track_id: "4uLU6hMCjMI75M1A2tKUQC",
    timestamps: {
      start: FIXED_NOW - 83_400,
      end: FIXED_NOW + 126_600,
    },
    song: "Never Gonna Give You Up",
    artist: "Rick Astley",
    album: "Whenever You Need Somebody",
    album_art_url: "https://i.scdn.co/image/ab67616d0000b2731fb3115e3b35b94a49d6fe20",
  },
  activities: [
    {
      id: "spotify:1",
      name: "Spotify",
      type: 2,
      details: "Never Gonna Give You Up",
      state: "Rick Astley",
      sync_id: "4uLU6hMCjMI75M1A2tKUQC",
    },
  ],
};

/** Streaming activity (type 1) on Twitch. */
export const streamingPresence: LanyardPresence = {
  ...demoUserPresence,
  discord_status: "online",
  active_on_discord_desktop: true,
  activities: [
    {
      id: "stream-1",
      name: "Twitch",
      type: 1,
      url: "https://www.twitch.tv/shroud",
      details: "Ranked Valorant Grind",
      state: "VALORANT",
      assets: {
        large_image: "twitch:shroud",
        large_text: "Live on Twitch",
      },
      timestamps: {
        start: FIXED_NOW - 3_720_000,
      },
    },
  ],
};

/** Watching activity (type 3) with a countdown (end timestamp only). */
export const watchingPresence: LanyardPresence = {
  ...demoUserPresence,
  discord_status: "idle",
  active_on_discord_web: true,
  activities: [
    {
      id: "watch-1",
      name: "YouTube",
      type: 3,
      details: "Next.js App Router Deep Dive",
      state: "by Vercel",
      assets: {
        large_image: "youtube:dQw4w9WgXcQ",
      },
      timestamps: {
        start: FIXED_NOW - 60_000,
        end: FIXED_NOW + 240_000,
      },
    },
  ],
};

/** Minimal user with no avatar hash, no decoration, no nameplate, and no guild tag. */
export const plainUserPresence: LanyardPresence = {
  kv: {},
  discord_user: {
    id: "983724520789655613",
    username: "plainuser",
    global_name: null,
    display_name: null,
    discriminator: "0",
    avatar: null,
    avatar_decoration_data: null,
    collectibles: null,
    display_name_styles: null,
    primary_guild: null,
    public_flags: 0,
    bot: false,
  },
  activities: [],
  discord_status: "online",
  active_on_discord_web: true,
  active_on_discord_desktop: false,
  active_on_discord_mobile: false,
  listening_to_spotify: false,
  spotify: null,
};

/** User with `display_name_styles` gradient colors and a custom animated emoji status. */
export const gradientNamePresence: LanyardPresence = {
  ...demoUserPresence,
  discord_user: {
    ...demoUserPresence.discord_user,
    display_name_styles: {
      font_id: 2,
      effect_id: 1,
      colors: [0x5865f2, 0xec48bd, 0x35ed7e],
    },
  },
  activities: [
    {
      id: "custom",
      name: "Custom Status",
      type: 4,
      state: "Gradient energy",
      emoji: {
        id: "232720527448342530",
        name: "partyblob",
        animated: true,
      },
    },
  ],
};

/** Offline user with no active platforms or activities. */
export const offlinePresence: LanyardPresence = {
  ...plainUserPresence,
  discord_user: {
    ...demoUserPresence.discord_user,
  },
  discord_status: "offline",
  active_on_discord_web: false,
  active_on_discord_desktop: false,
  active_on_discord_mobile: false,
  active_on_discord_embedded: false,
  active_on_discord_vr: false,
  activities: [],
  listening_to_spotify: false,
  spotify: null,
};
