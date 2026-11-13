import { z } from "zod";
import type { LanyardPresence } from "./types";

const nullableText = z.string().nullable().optional();
const timestamps = z.object({ start: z.number().finite().nullable().optional(), end: z.number().finite().nullable().optional() });
const guild = z.object({ tag: z.string().nullable(), badge: z.string().nullable(), identity_guild_id: z.string().nullable(), identity_enabled: z.boolean().nullable() });

/** Validate fields consumed by normalize; tolerate new Discord fields without forwarding them. */
export const presenceSchema: z.ZodType<LanyardPresence> = z.object({
  kv: z.record(z.string(), z.string()).optional(),
  discord_user: z.object({
    id: z.string().regex(/^\d{17,20}$/), username: z.string(), avatar: z.string().nullable(),
    global_name: nullableText, display_name: nullableText, discriminator: z.string().optional(), bot: z.boolean().optional(), public_flags: z.number().int().nonnegative().optional(),
    avatar_decoration_data: z.object({ asset: z.string(), sku_id: nullableText, expires_at: z.number().nullable().optional() }).nullable().optional(),
    collectibles: z.object({ nameplate: z.object({ asset: z.string(), label: nullableText, palette: nullableText, sku_id: nullableText, expires_at: z.number().nullable().optional() }).nullable().optional() }).nullable().optional(),
    display_name_styles: z.object({ font_id: z.number(), effect_id: z.number(), colors: z.array(z.number()) }).nullable().optional(),
    primary_guild: guild.nullable().optional(), clan: guild.nullable().optional(),
  }),
  activities: z.array(z.object({
    id: z.string(), name: z.string(), type: z.number(), state: nullableText, details: nullableText, url: nullableText, application_id: z.string().regex(/^\d{17,20}$/).nullable().optional(),
    timestamps: timestamps.nullable().optional(), assets: z.object({ large_image: nullableText, small_image: nullableText, large_text: nullableText, small_text: nullableText }).nullable().optional(),
    party: z.object({ id: nullableText, size: z.tuple([z.number(), z.number()]).nullable().optional() }).nullable().optional(),
    emoji: z.object({ name: z.string(), id: nullableText, animated: z.boolean().nullable().optional() }).nullable().optional(), buttons: z.array(z.string()).nullable().optional(), sync_id: nullableText,
  })),
  discord_status: z.enum(["online", "idle", "dnd", "offline"]),
  active_on_discord_web: z.boolean(), active_on_discord_desktop: z.boolean(), active_on_discord_mobile: z.boolean(), active_on_discord_embedded: z.boolean().optional(), active_on_discord_vr: z.boolean().optional(),
  listening_to_spotify: z.boolean(), spotify: z.object({ track_id: z.string().nullable(), song: z.string(), artist: z.string(), album: z.string(), album_art_url: z.string().nullable(), timestamps: z.object({ start: z.number().finite(), end: z.number().finite() }).nullable() }).nullable(),
});
