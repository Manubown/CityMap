import { describe, it, expect } from "vitest";
import { createGame } from "../src/engine/world";
import { stepGame } from "../src/engine/tick";

describe("roads", () => {
  it("villagers wear tracks into roads over time", () => {
    const s = createGame(7);
    const r = s.regions[0];
    r.stock.food = 100000;
    r.stock.wood = 100000; // let homes grow → more villagers → more traffic
    for (let i = 0; i < 2500; i++) stepGame(s);
    expect(r.map.tiles.some((t) => t.road)).toBe(true);
  });

  it("road formation is deterministic across a save/reload", () => {
    const cont = createGame(7);
    cont.regions[0].stock.food = 100000;
    for (let i = 0; i < 1600; i++) stepGame(cont);

    const split = createGame(7);
    split.regions[0].stock.food = 100000;
    for (let i = 0; i < 800; i++) stepGame(split);
    const reloaded = JSON.parse(JSON.stringify(split));
    for (let i = 0; i < 800; i++) stepGame(reloaded);

    const roads = (st: typeof cont) => st.regions[0].map.tiles.filter((t) => t.road).length;
    expect(roads(reloaded)).toBe(roads(cont));
  });
});
