/**
 * Save/load to the browser via IndexedDB (idb-keyval). GameState is already
 * plain JSON-serialisable, so we store it directly. A future server save would
 * implement the same two functions against an API.
 */

import { get, set, del } from "idb-keyval";
import type { GameState } from "../types";
import { STATE_VERSION } from "../world";

const SAVE_KEY = "citymap:save";

export async function saveGame(state: GameState): Promise<void> {
  // Structured-clone-safe deep copy so we never persist live references.
  const snapshot: GameState = JSON.parse(JSON.stringify(state));
  await set(SAVE_KEY, snapshot);
}

export async function loadGame(): Promise<GameState | null> {
  const data = (await get(SAVE_KEY)) as GameState | undefined;
  if (!data) return null;
  if (data.version !== STATE_VERSION) {
    // Slice 1: no migrations yet — ignore incompatible saves.
    console.warn(`Ignoring save with version ${data.version} (expected ${STATE_VERSION}).`);
    return null;
  }
  return data;
}

export async function clearSave(): Promise<void> {
  await del(SAVE_KEY);
}
