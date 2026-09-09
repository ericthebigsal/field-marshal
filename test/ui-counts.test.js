import test from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./harness.js";

const S = loadModules(["rng", "engine", "ai", "ui"]);
const { Engine } = S;
const { pieceCounts } = S.UI;

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

test("pieceCounts on a fresh game reports full complements for both sides", () => {
  const g = Engine.newGame(fullSetup("red"), fullSetup("blue"));
  assert.deepEqual(pieceCounts(g, "B", "red"), {
    mine: { alive: 6, total: 6 },
    opp: { alive: 6, total: 6 },
  });
  assert.deepEqual(pieceCounts(g, 1, "red"), {
    mine: { alive: 1, total: 1 },
    opp: { alive: 1, total: 1 },
  });
});

test("pieceCounts reflects losses on each side independently", () => {
  const g = Engine.newGame(fullSetup("red"), fullSetup("blue"));
  let redMiners = 0, blueBombs = 0;
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
      const cell = g.board[r][c];
      if (!cell || cell.lake) continue;
      if (cell.owner === "red" && cell.rank === 3 && redMiners < 2) {
        g.board[r][c] = null; redMiners++;
      } else if (cell.owner === "blue" && cell.rank === "B" && blueBombs < 1) {
        g.board[r][c] = null; blueBombs++;
      }
    }
  assert.deepEqual(pieceCounts(g, 3, "red").mine, { alive: 3, total: 5 });
  assert.deepEqual(pieceCounts(g, "B", "red").opp, { alive: 5, total: 6 });
});

test("pieceCounts is relative to the passed human owner", () => {
  const g = Engine.newGame(fullSetup("red"), fullSetup("blue"));
  let removed = false;
  for (let r = 0; r < 10 && !removed; r++)
    for (let c = 0; c < 10 && !removed; c++) {
      const cell = g.board[r][c];
      if (cell && !cell.lake && cell.owner === "red" && cell.rank === 2) {
        g.board[r][c] = null; removed = true;
      }
    }
  assert.equal(pieceCounts(g, 2, "red").mine.alive, 7);
  assert.equal(pieceCounts(g, 2, "blue").opp.alive, 7);
});
