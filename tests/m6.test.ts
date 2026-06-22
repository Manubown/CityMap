import { describe, it, expect } from "vitest";
import { createGame } from "../src/engine/world";
import { stepGame } from "../src/engine/tick";
import { stepAgents, AGENT_CAP } from "../src/engine/systems/agents";
import { villagerName } from "../src/engine/agents/names";
import type { Agent } from "../src/engine/types";

describe("villager identity", () => {
  it("names are deterministic and varied", () => {
    expect(villagerName(0)).toBe(villagerName(0));
    expect(villagerName(0)).not.toBe(villagerName(1));
    expect(villagerName(7)).toMatch(/\w+ \w+/);
  });
});

const norm = (ag: Agent[]) =>
  ag.map((x) => `${x.id}:${x.col},${x.row}>${x.ncol},${x.nrow}:${x.state}`).join("|");

describe("M6 villagers", () => {
  it("spawns one villager per resident (capped)", () => {
    const s = createGame(9);
    s.regions[0].stock.food = 100000;
    for (let i = 0; i < 200; i++) stepGame(s);
    const r = s.regions[0];
    expect(r.agents.length).toBe(Math.min(AGENT_CAP, Math.floor(r.population)));
    expect(r.agents.length).toBeGreaterThan(0);
  });

  it("movement is deterministic across a save/reload", () => {
    const cont = createGame(9);
    cont.regions[0].stock.food = 100000;
    for (let i = 0; i < 120; i++) stepGame(cont);

    const split = createGame(9);
    split.regions[0].stock.food = 100000;
    for (let i = 0; i < 60; i++) stepGame(split);
    const reloaded = JSON.parse(JSON.stringify(split));
    for (let i = 0; i < 60; i++) stepGame(reloaded);

    expect(norm(reloaded.regions[0].agents)).toBe(norm(cont.regions[0].agents));
  });

  it("never touches the economy (purely cosmetic)", () => {
    const s = createGame(9);
    const r = s.regions[0];
    for (let i = 0; i < 60; i++) stepGame(s);
    const stock = { ...r.stock };
    const coins = s.coins;
    const pop = r.population;
    for (let i = 0; i < 50; i++) stepAgents(r); // step ONLY the villagers
    expect(r.stock).toEqual(stock);
    expect(s.coins).toBe(coins);
    expect(r.population).toBe(pop);
    expect(r.agents.length).toBeGreaterThan(0); // they did spawn/move
  });
});
