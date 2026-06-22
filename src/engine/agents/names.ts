/** Deterministic villager names from an id (so a villager keeps its name). */

const FIRST = [
  "Aldric", "Bera", "Cael", "Dunn", "Edda", "Finn", "Gwen", "Hale",
  "Inga", "Joss", "Kael", "Lina", "Mabon", "Nessa", "Orin", "Petra",
  "Quill", "Rolf", "Sela", "Tarn", "Ulla", "Vorn", "Wren", "Yara",
];

const LAST = [
  "Stonehand", "Fairwind", "Oakheart", "Brooke", "Thatcher",
  "Mossfoot", "Ashby", "Greengate", "Hillborn", "Reedmarsh",
];

export function villagerName(id: number): string {
  const first = FIRST[((id % FIRST.length) + FIRST.length) % FIRST.length];
  const last = LAST[(Math.floor(id / FIRST.length) % LAST.length + LAST.length) % LAST.length];
  return `${first} ${last}`;
}
