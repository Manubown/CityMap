/** Villager role colours (M6). Role = the worker's workplace building type. */

export const ROLE_COLORS: Record<string, number> = {
  resident: 0xe6ddcd,
  forester: 0x76b85a,
  gatherer: 0xe7b85a,
  quarry: 0xb4bac1,
  miner: 0x9aa0a6,
  toolmaker: 0xd08a44,
  farm: 0xe2cf66,
  hunter: 0xa9794f,
  reed_cutter: 0x7faf6a,
  sand_pit: 0xdcc89a,
  copper_mine: 0xe0843a,
  tin_mine: 0xccd2da,
  smelter: 0xd98a52,
  bronze_foundry: 0xc8884a,
};

export function roleColor(role: string): number {
  return ROLE_COLORS[role] ?? 0xd2d8e0;
}
