/**
 * Save/load to the browser via IndexedDB (idb-keyval). GameState is plain
 * JSON-serialisable, so we store it directly. Multiple named slots are
 * supported ("auto" is the autosave); a future server save would implement the
 * same functions against an API.
 */

import { get, set, del } from "idb-keyval";
import type { GameState } from "../types";
import { STATE_VERSION } from "../world";

export type SaveSlot = "auto" | "1" | "2" | "3";

const keyOf = (slot: SaveSlot): string => `citymap:save:${slot}`;

export async function saveGame(state: GameState, slot: SaveSlot = "auto"): Promise<void> {
  // Structured-clone-safe deep copy so we never persist live references.
  const snapshot: GameState = JSON.parse(JSON.stringify(state));
  await set(keyOf(slot), snapshot);
}

export async function loadGame(slot: SaveSlot = "auto"): Promise<GameState | null> {
  const data = (await get(keyOf(slot))) as GameState | undefined;
  if (!data) return null;
  if (data.version !== STATE_VERSION) {
    console.warn(`Ignoring save v${data.version} in slot ${slot} (expected ${STATE_VERSION}).`);
    return null;
  }
  return data;
}

export async function clearSave(slot: SaveSlot = "auto"): Promise<void> {
  await del(keyOf(slot));
}

export interface SlotInfo {
  tick: number;
  version: number;
  compatible: boolean;
}

/** Lightweight metadata for a slot (for the save/load menu), or null if empty. */
export async function slotInfo(slot: SaveSlot): Promise<SlotInfo | null> {
  const data = (await get(keyOf(slot))) as GameState | undefined;
  if (!data) return null;
  return { tick: data.tick, version: data.version, compatible: data.version === STATE_VERSION };
}
