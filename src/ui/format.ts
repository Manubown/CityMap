import type { ResourceId, ResourceMap } from "../engine/types";
import { RESOURCES } from "../engine/economy/resources";

export function toHex(color: number): string {
  return "#" + color.toString(16).padStart(6, "0");
}

/** "🪵 2  🪨 1" style summary of a resource map. */
export function resourceMapString(map: ResourceMap): string {
  const parts = (Object.keys(map) as ResourceId[]).map(
    (id) => `${RESOURCES[id].glyph} ${map[id]}`,
  );
  return parts.join("   ");
}
