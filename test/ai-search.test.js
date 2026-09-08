import test from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./harness.js";

const { Engine, AI, RNG } = loadModules(["rng", "engine", "ai"]);

function makeState(pieces, turn = "blue") {
  const board = [];
  for (let r = 0; r < 10; r++) {
    const row = [];
    for (let c = 0; c < 10; c++) row.push(Engine.isLake(r, c) ? { lake: true } : null);
    board.push(row);
  }
  let id = 1;
  for (const p of pieces) {
    board[p.row][p.col] = {
      id: p.id ?? id++, owner: p.owner, rank: p.rank,
      hasMoved: !!p.hasMoved, revealed: !!p.revealed,
    };
  }
  return {
    board, turn, moveHistory: [], pieceMoveLog: {},
    winner: null, winReason: null, nextPieceId: 100,
  };
}

function legalContains(state, owner, m) {
  return Engine.legalMoves(state, owner).some((x) =>
    x.pieceId === m.pieceId && x.to[0] === m.to[0] && x.to[1] === m.to[1]);
}

test("DIFFICULTY table exposes four tiers with increasing depth", () => {
  assert.deepEqual(
    ["easy", "medium", "hard", "expert"].map((k) => AI.DIFFICULTY[k].depth),
    [1, 2, 3, 4]);
});

for (const level of ["easy", "medium", "hard", "expert"]) {
  test(`chooseMove returns a legal move at ${level}`, () => {
    const s = makeState([
      { id: 1, row: 3, col: 3, owner: "blue", rank: 6 },
      { id: 2, row: 4, col: 4, owner: "blue", rank: 3 },
      { id: 3, row: 6, col: 6, owner: "red", rank: 7 },
      { id: 4, row: 9, col: 9, owner: "red", rank: "F" },
      { id: 5, row: 9, col: 8, owner: "red", rank: "B" },
    ], "blue");
    const b = AI.createBeliefs(s, "blue");
    const m = AI.chooseMove(s, b, { level, rng: RNG.create(3) });
    assert.ok(m && legalContains(s, "blue", m));
  });
}

test("deeper search avoids a one-move trap that 1-ply walks into", () => {
  // blue captain (6) can take an exposed red 5, but doing so parks it next to
  // a revealed red 9 that recaptures. A 2-ply search should prefer a safe move.
  const s = makeState([
    { id: 1, row: 5, col: 0, owner: "blue", rank: 6 },
    { id: 2, row: 5, col: 1, owner: "red", rank: 5, revealed: true },
    { id: 3, row: 4, col: 1, owner: "red", rank: 9, revealed: true },
    { id: 4, row: 0, col: 9, owner: "blue", rank: "F" },
    { id: 5, row: 9, col: 9, owner: "red", rank: "F" },
  ], "blue");
  const b = AI.createBeliefs(s, "blue");
  const easy = AI.chooseMove(s, b, { level: "easy", rng: RNG.create(1) });
  // easy (argmax path when rng doesn't trigger noise) grabs the piece
  const hard = AI.chooseMove(s, b, { level: "hard", rng: RNG.create(1) });
  assert.notDeepEqual([hard.to[0], hard.to[1]], [5, 1],
    "hard should not walk into the recapture");
});

test("chooseMove deterministic per seed at every level", () => {
  const build = () => makeState([
    { id: 1, row: 3, col: 3, owner: "blue", rank: 6 },
    { id: 2, row: 2, col: 2, owner: "blue", rank: 2 },
    { id: 3, row: 6, col: 6, owner: "red", rank: 7 },
    { id: 4, row: 9, col: 9, owner: "red", rank: "F" },
  ], "blue");
  for (const level of ["easy", "medium", "hard", "expert"]) {
    const a = AI.chooseMove(build(), AI.createBeliefs(build(), "blue"),
      { level, rng: RNG.create(11) });
    const c = AI.chooseMove(build(), AI.createBeliefs(build(), "blue"),
      { level, rng: RNG.create(11) });
    assert.deepEqual(a, c, `nondeterministic at ${level}`);
  }
});

test("expert steps down gradually on a node-cap hit (not straight to 1-ply)", () => {
  // A dense scout-heavy midgame that blows the node cap at depth 4.
  const pieces = [];
  let id = 1;
  for (let c = 0; c < 10; c++) {
    pieces.push({ id: id++, row: 2, col: c, owner: "blue", rank: 2 });
    pieces.push({ id: id++, row: 1, col: c, owner: "blue", rank: 6 });
    pieces.push({ id: id++, row: 7, col: c, owner: "red", rank: 2 });
    pieces.push({ id: id++, row: 8, col: c, owner: "red", rank: 6 });
  }
  pieces.push({ id: id++, row: 0, col: 4, owner: "blue", rank: "F" });
  pieces.push({ id: id++, row: 9, col: 4, owner: "red", rank: "F" });
  const s = makeState(pieces, "blue");
  const b = AI.createBeliefs(s, "blue");
  const m1 = AI.chooseMove(s, b, { level: "expert", rng: RNG.create(5) });
  const diag = AI._lastSearchDiag();
  const m2 = AI.chooseMove(s, b, { level: "expert", rng: RNG.create(5) });
  assert.deepEqual(m1, m2, "deterministic");
  assert.ok(legalContains(s, "blue", m1), "legal");
  assert.ok(diag.depth >= 1 && diag.depth < 4, "stepped down below full depth");
  assert.ok(diag.depth >= 2, "did not collapse straight to the 1-ply floor");
});

test("NODE_CAP was raised for deeper expert search", () => {
  assert.ok(AI.NODE_CAP >= 60000);
});

test("search respects the node cap and still returns a legal root move", () => {
  // a fairly open midgame position
  const pieces = [];
  let id = 1;
  for (let c = 0; c < 8; c++) pieces.push({ id: id++, row: 3, col: c, owner: "blue", rank: 6 });
  for (let c = 0; c < 8; c++) pieces.push({ id: id++, row: 6, col: c, owner: "red", rank: 6 });
  pieces.push({ id: id++, row: 0, col: 9, owner: "blue", rank: "F" });
  pieces.push({ id: id++, row: 9, col: 9, owner: "red", rank: "F" });
  const s = makeState(pieces, "blue");
  const b = AI.createBeliefs(s, "blue");
  const m = AI.chooseMove(s, b, { level: "expert", rng: RNG.create(5) });
  assert.ok(m && legalContains(s, "blue", m));
});
