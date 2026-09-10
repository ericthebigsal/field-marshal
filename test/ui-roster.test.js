import test from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./harness.js";

const S = loadModules(["rng", "engine", "ai", "ui"]);
const { Engine } = S;
const { aliveByRank } = S.UI;

function fullSetup(owner) {
  const ranks = [];
  for (const { rank, count } of Engine.RANKS)
    for (let i = 0; i < count; i++) ranks.push(rank);
  const out = [];
  let i = 0;
  for (const row of Engine.deployRows(owner))
    for (let col = 0; col < 10; col++) out.push({ row, col, rank: ranks[i++] });
  return out;
}

test("aliveByRank on a fresh game returns each rank's full complement", () => {
  const g = Engine.newGame(fullSetup("red"), fullSetup("blue"));
  assert.deepEqual(aliveByRank(g, "red"), {
    10: 1, 9: 1, 8: 2, 7: 3, 6: 4, 5: 4, 4: 4, 3: 5, 2: 8, 1: 1, B: 6, F: 1,
  });
  assert.deepEqual(aliveByRank(g, "blue"), aliveByRank(g, "red"));
});

test("aliveByRank drops a rank's count when a piece of it leaves the board", () => {
  const g = Engine.newGame(fullSetup("red"), fullSetup("blue"));
  let killed = 0;
  for (let r = 0; r < 10 && killed < 3; r++)
    for (let c = 0; c < 10 && killed < 3; c++) {
      const cell = g.board[r][c];
      if (cell && !cell.lake && cell.owner === "blue" && cell.rank === 2) {
        g.board[r][c] = null; killed++;
      }
    }
  assert.equal(aliveByRank(g, "blue")[2], 5);
  assert.equal(aliveByRank(g, "red")[2], 8);
});

test("aliveByRank reports 0 for a fully eliminated rank", () => {
  const g = Engine.newGame(fullSetup("red"), fullSetup("blue"));
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
      const cell = g.board[r][c];
      if (cell && !cell.lake && cell.owner === "red" && cell.rank === 1)
        g.board[r][c] = null;
    }
  assert.equal(aliveByRank(g, "red")[1], 0);
});
