import test from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./harness.js";

const { Engine } = loadModules(["rng", "engine"]);

// Helper: a full valid 40-piece placement for the given owner.
function fullSetup(owner) {
  const rows = Engine.deployRows(owner);
  const ranks = [];
  for (const { rank, count } of Engine.RANKS) {
    for (let i = 0; i < count; i++) ranks.push(rank);
  }
  assert.equal(ranks.length, 40);
  const placements = [];
  let i = 0;
  for (const row of rows) {
    for (let col = 0; col < 10; col++) {
      placements.push({ row, col, rank: ranks[i++] });
    }
  }
  return placements;
}

test("board is 10x10", () => {
  assert.equal(Engine.ROWS, 10);
  assert.equal(Engine.COLS, 10);
});

test("lakes occupy rows 4-5, cols 2-3 and 6-7", () => {
  const lake = [];
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++)
      if (Engine.isLake(r, c)) lake.push([r, c]);
  assert.deepEqual(lake.sort(), [
    [4, 2], [4, 3], [4, 6], [4, 7],
    [5, 2], [5, 3], [5, 6], [5, 7],
  ].sort());
});

test("RANKS sum to 40 per side", () => {
  const total = Engine.RANKS.reduce((s, r) => s + r.count, 0);
  assert.equal(total, 40);
});

test("validateSetup accepts a full valid setup", () => {
  assert.deepEqual(Engine.validateSetup("red", fullSetup("red")), { ok: true });
});

test("validateSetup rejects wrong piece count", () => {
  const p = fullSetup("red").slice(0, 39);
  assert.equal(Engine.validateSetup("red", p).ok, false);
});

test("validateSetup rejects a piece outside deploy rows", () => {
  const p = fullSetup("red");
  p[0] = { row: 5, col: 0, rank: p[0].rank };
  assert.equal(Engine.validateSetup("red", p).ok, false);
});

test("validateSetup rejects duplicate squares", () => {
  const p = fullSetup("red");
  p[1] = { row: p[0].row, col: p[0].col, rank: p[1].rank };
  assert.equal(Engine.validateSetup("red", p).ok, false);
});

test("validateSetup rejects wrong rank multiset (two marshals)", () => {
  const p = fullSetup("red");
  // find a non-10 and make it a 10
  const idx = p.findIndex((x) => x.rank !== 10);
  p[idx] = { ...p[idx], rank: 10 };
  assert.equal(Engine.validateSetup("red", p).ok, false);
});

test("newGame builds a board with lakes, pieces, and red to move", () => {
  const s = Engine.newGame(fullSetup("red"), fullSetup("blue"));
  assert.equal(s.turn, "red");
  assert.equal(s.winner, null);
  assert.ok(s.board[4][2].lake);
  assert.equal(s.board[4][0], null);
  const p = s.board[9][0];
  assert.equal(p.owner, "red");
  assert.equal(p.hasMoved, false);
  assert.equal(p.revealed, false);
  // all 80 pieces have unique ids
  const ids = new Set();
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
      const cell = s.board[r][c];
      if (cell && !cell.lake) ids.add(cell.id);
    }
  assert.equal(ids.size, 80);
});

test("newGame throws on invalid setup", () => {
  assert.throws(() => Engine.newGame(fullSetup("red").slice(0, 39), fullSetup("blue")));
});

test("cloneState produces an independent deep copy", () => {
  const s = Engine.newGame(fullSetup("red"), fullSetup("blue"));
  const c = Engine.cloneState(s);
  c.board[9][0].rank = 999;
  c.turn = "blue";
  assert.notEqual(s.board[9][0].rank, 999);
  assert.equal(s.turn, "red");
});

test("cloneState deep-copies pieceMoveLog from/to arrays", () => {
  const s = Engine.newGame(fullSetup("red"), fullSetup("blue"));
  // Manually add a pieceMoveLog entry (simulating what happens in later tasks)
  s.pieceMoveLog[1] = [{ from: [9, 0], to: [8, 0] }];
  const c = Engine.cloneState(s);
  // Mutate the clone's pieceMoveLog
  c.pieceMoveLog[1][0].from[0] = 99;
  // Verify the original is unchanged
  assert.equal(s.pieceMoveLog[1][0].from[0], 9);
  assert.equal(c.pieceMoveLog[1][0].from[0], 99);
});
