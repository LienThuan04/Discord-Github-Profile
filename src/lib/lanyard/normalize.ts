import { flagsToBadges } from "@/lib/discord/badges";
import { activityAssetUrl, avatarSource, customEmojiUrl, decorationSource, guildTagBadgeUrl, nameplateUrls, spotifyAlbumArtUrl, twemojiUrl } from "@/lib/discord/cdn";
import { colorIntToHex, normalizeHex } from "@/lib/discord/color";
import { activityTypeLabel, formatParty, isShownActivityType, sectionTitle } from "@/lib/discord/activity";
import { nameplatePalette } from "@/lib/discord/nameplate";
import type { CardData, Platform } from "./card-data";
import type { LanyardPresence } from "./types";

const text = (value: string | null | undefined, limit = 240): string | null => value?.trim().slice(0, limit) || null;
const isExpired = (expiresAt: number | null | undefined, now: number): boolean =>
  typeof expiresAt === "number" && (expiresAt >= 1e11 ? expiresAt <= now : expiresAt * 1000 <= now);

export function httpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/** The Spotify activity's application ID, as a spreadable fragment that is empty when Discord omits it. */
function spotifyApplication(presence: LanyardPresence, trackId: string | null): { applicationId?: string } {
  const id = presence.activities.find((activity) => activity.type === 2 && (activity.name === "Spotify" || activity.sync_id === trackId))?.application_id;
  return id ? { applicationId: id } : {};
}

/** Pure: the caller supplies snapshot time, so fixtures and live renders share identical math. */
export function normalize(presence: LanyardPresence, { now }: { now: number }): CardData {
  const user = presence.discord_user;
  const kv = presence.kv ?? {};
  const nameplate = user.collectibles?.nameplate;
  const guild = user.primary_guild ?? user.clan;
  const custom = presence.activities.find((activity) => activity.type === 4);
  const website = httpsUrl(kv.website);
  const spotify = presence.listening_to_spotify ? presence.spotify : null;
  const platforms: Platform[] = ["desktop", "web", "mobile", "embedded", "vr"];
  return {
    now,
    user: {
      id: user.id, username: user.username,
      displayName: text(user.global_name, 80) ?? text(user.display_name, 80) ?? user.username,
      legacyTag: user.discriminator && user.discriminator !== "0" ? `${user.username}#${user.discriminator}` : null,
      bot: user.bot ?? false,
      avatar: avatarSource(user.id, user.avatar, user.discriminator, 128),
      decoration: user.avatar_decoration_data?.asset && !isExpired(user.avatar_decoration_data.expires_at, now) ? { source: decorationSource(user.avatar_decoration_data.asset, 96), skuId: user.avatar_decoration_data.sku_id ?? null } : null,
      nameplate: nameplate?.asset && !isExpired(nameplate.expires_at, now) ? { ...nameplateUrls(nameplate.asset), label: text(nameplate.label), palette: nameplatePalette(nameplate.palette) } : null,
      guildTag: guild?.identity_enabled && guild.tag ? { tag: text(guild.tag, 12)!, badge: guild.identity_guild_id && guild.badge ? guildTagBadgeUrl(guild.identity_guild_id, guild.badge) : null, guildId: guild.identity_guild_id } : null,
      nameStyle: user.display_name_styles ? { colors: user.display_name_styles.colors.slice(0, 8).map(colorIntToHex).filter((color): color is string => color !== null), fontId: user.display_name_styles.font_id, effectId: user.display_name_styles.effect_id } : null,
      badges: flagsToBadges(user.public_flags),
    },
    status: presence.discord_status,
    platforms: presence.discord_status === "offline" ? [] : platforms.filter((platform) => presence[`active_on_discord_${platform}`]),
    customStatus: custom ? {
      text: text(custom.state),
      emoji: custom.emoji ? { name: custom.emoji.name, url: custom.emoji.id ? customEmojiUrl(custom.emoji.id, custom.emoji.animated ?? false) : twemojiUrl(custom.emoji.name), custom: Boolean(custom.emoji.id) } : null,
    } : null,
    activities: presence.activities.filter((activity) => isShownActivityType(activity.type) && !(spotify && activity.type === 2 && (activity.name === "Spotify" || activity.sync_id === spotify.track_id))).slice(0, 16).map((activity, index) => {
      const large = activityAssetUrl(activity.application_id, activity.assets?.large_image);
      const small = activityAssetUrl(activity.application_id, activity.assets?.small_image, 64);
      return {
        key: `${activity.id}-${index}`, type: activity.type, verb: activityTypeLabel(activity.type), title: sectionTitle(activity.type, activity.name),
        name: text(activity.name, 100) ?? "Activity", details: text(activity.details), state: text(activity.state),
        largeImage: large ? { url: large, text: text(activity.assets?.large_text) } : null,
        smallImage: small ? { url: small, text: text(activity.assets?.small_text) } : null,
        applicationId: activity.application_id ?? null, appIcon: null,
        timestamps: activity.timestamps && (typeof activity.timestamps.start === "number" || typeof activity.timestamps.end === "number")
          ? { ...(typeof activity.timestamps.start === "number" ? { start: activity.timestamps.start } : {}), ...(typeof activity.timestamps.end === "number" ? { end: activity.timestamps.end } : {}) }
          : null,
        party: formatParty(activity.party), buttons: (activity.buttons ?? []).slice(0, 2).map((label) => label.slice(0, 40)), url: httpsUrl(activity.url),
      };
    }),
    // Discord's Spotify activity normally has no application ID; add the key only when one is supplied, keeping the existing view shape.
    spotify: spotify ? { ...spotifyApplication(presence, spotify.track_id), trackId: spotify.track_id, song: text(spotify.song) ?? "Unknown song", artist: text(spotify.artist) ?? "Unknown artist", album: text(spotify.album) ?? "", albumArt: spotifyAlbumArtUrl(spotify.album_art_url), timestamps: spotify.timestamps } : null,
    kv: {
      bio: text(kv.bio), banner: httpsUrl(kv.banner), pronouns: text(kv.pronouns, 40), location: text(kv.location, 80),
      website: website ? { url: website, label: website.replace(/^https:\/\//, "").replace(/\/$/, "").slice(0, 80) } : null,
      accent: kv.accent ? normalizeHex(kv.accent) : null,
    },
    // Lanyard has no profile extras; servers attach `fetchProfileExtras()` results after normalizing.
    profile: null,
  };
}

/** Local identity for error cards; no network request is needed to render it. */
export function emptyCardData(id: string, now: number): CardData {
  return normalize({ discord_user: { id, username: "Discord presence", avatar: null }, discord_status: "offline", activities: [], active_on_discord_web: false, active_on_discord_desktop: false, active_on_discord_mobile: false, listening_to_spotify: false, spotify: null }, { now });
}
