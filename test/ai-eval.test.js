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

test("evaluate favors the side with more material", () => {
  const s = makeState([
    { id: 1, row: 0, col: 0, owner: "blue", rank: 10 },
    { id: 2, row: 0, col: 1, owner: "blue", rank: 9 },
    { id: 3, row: 9, col: 9, owner: "red", rank: 2, revealed: true },
  ]);
  const b = AI.createBeliefs(s, "blue");
  assert.ok(AI.evaluate(s, b, "blue") > 0);
  assert.ok(AI.evaluate(s, b, "red") < 0);
});

test("chooseMove returns a legal move for the AI side", () => {
  const s = makeState([
    { id: 1, row: 3, col: 3, owner: "blue", rank: 6 },
    { id: 2, row: 8, col: 8, owner: "red", rank: "F" },
    { id: 3, row: 8, col: 7, owner: "red", rank: "B" },
  ], "blue");
  const b = AI.createBeliefs(s, "blue");
  const legal = Engine.legalMoves(s, "blue");
  const m = AI.chooseMove(s, b, { level: "easy", rng: RNG.create(1) });
  assert.ok(legal.some((x) =>
    x.pieceId === m.pieceId && x.to[0] === m.to[0] && x.to[1] === m.to[1]));
});

test("chooseMove is deterministic for a fixed seed", () => {
  const build = () => makeState([
    { id: 1, row: 3, col: 3, owner: "blue", rank: 6 },
    { id: 2, row: 3, col: 5, owner: "blue", rank: 5 },
    { id: 3, row: 0, col: 0, owner: "red", rank: 7 },
    { id: 4, row: 9, col: 9, owner: "red", rank: "F" },
  ], "blue");
  const m1 = AI.chooseMove(build(), AI.createBeliefs(build(), "blue"),
    { level: "easy", rng: RNG.create(42) });
  const m2 = AI.chooseMove(build(), AI.createBeliefs(build(), "blue"),
    { level: "easy", rng: RNG.create(42) });
  assert.deepEqual(m1, m2);
});

test("chooseMove takes a free winning flag capture at argmax (hard fallback)", () => {
  const s = makeState([
    { id: 1, row: 8, col: 8, owner: "blue", rank: 6 },
    { id: 2, row: 8, col: 9, owner: "red", rank: "F", revealed: true },
    { id: 3, row: 0, col: 0, owner: "blue", rank: 5 },
    { id: 4, row: 0, col: 9, owner: "red", rank: 7 },
  ], "blue");
  const b = AI.createBeliefs(s, "blue");
  const m = AI.chooseMove(s, b, { level: "hard", rng: RNG.create(1) });
  assert.deepEqual([m.to[0], m.to[1]], [8, 9]);
});

test("chooseMove returns null when no legal moves", () => {
  const s = makeState([
    { id: 1, row: 0, col: 0, owner: "blue", rank: "F" },
    { id: 2, row: 0, col: 1, owner: "blue", rank: "B" },
    { id: 3, row: 9, col: 9, owner: "red", rank: 6 },
  ], "blue");
  const b = AI.createBeliefs(s, "blue");
  assert.equal(AI.chooseMove(s, b, { level: "easy", rng: RNG.create(1) }), null);
});
