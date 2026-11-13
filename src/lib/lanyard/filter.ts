import type { CardOptions } from "../options";
import type { CardData } from "./card-data";

/** Filter once at the registry boundary, before any theme selects, measures or collects activity artwork. */
export function filterApplications(data: CardData, options: Pick<CardOptions, "ignore_app_id">): CardData {
  if (!options.ignore_app_id) return data;
  const ignored = new Set(options.ignore_app_id.split(","));
  return {
    ...data,
    activities: data.activities.filter((activity) => !activity.applicationId || !ignored.has(activity.applicationId)),
    spotify: data.spotify?.applicationId && ignored.has(data.spotify.applicationId) ? null : data.spotify,
  };
}
