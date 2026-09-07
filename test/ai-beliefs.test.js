import test from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./harness.js";

const { Engine, AI } = loadModules(["rng", "engine", "ai"]);

function makeState(pieces, turn = "red") {
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

const sumProbs = (p) => Object.values(p).reduce((a, b) => a + b, 0);

test("redactState hides unrevealed enemy ranks only", () => {
  const s = makeState([
    { id: 1, row: 9, col: 0, owner: "red", rank: 10 },
    { id: 2, row: 0, col: 0, owner: "blue", rank: 9 },
    { id: 3, row: 0, col: 1, owner: "blue", rank: 8, revealed: true },
  ]);
  const v = AI.redactState(s, "blue");
  assert.equal(v.board[9][0].rank, null, "enemy hidden");
  assert.equal(v.board[0][0].rank, 9, "own piece visible");
  assert.equal(v.board[0][1].rank, 8, "revealed enemy visible");
});

test("createBeliefs: unrevealed enemy piece has a distribution summing to 1", () => {
  const s = makeState([
    { id: 1, row: 9, col: 0, owner: "red", rank: 10 },
    { id: 2, row: 0, col: 0, owner: "blue", rank: 9 },
  ]);
  const b = AI.createBeliefs(s, "blue"); // blue is viewer, red is opponent
  assert.ok(Math.abs(sumProbs(b.pieces[1].probs) - 1) < 1e-9);
  // 40 red pieces, uniform-by-count: P(bomb) = 6/40
  assert.ok(Math.abs(b.pieces[1].probs["B"] - 6 / 40) < 1e-9);
});

test("createBeliefs: revealed enemy piece is known", () => {
  const s = makeState([
    { id: 1, row: 9, col: 0, owner: "red", rank: 3, revealed: true },
    { id: 2, row: 0, col: 0, owner: "blue", rank: 9 },
  ]);
  const b = AI.createBeliefs(s, "blue");
  assert.equal(b.pieces[1].known, 3);
  assert.equal(b.pieces[1].probs[3], 1);
});

test("applyMoveTells: a moved piece cannot be a bomb or flag", () => {
  const s = makeState([
    { id: 1, row: 5, col: 0, owner: "red", rank: 6 },
    { id: 2, row: 0, col: 0, owner: "blue", rank: 9 },
  ]);
  let b = AI.createBeliefs(s, "blue");
  const { state: s2, result } = Engine.applyMove(
    { ...s, turn: "red" }, { pieceId: 1, from: [5, 0], to: [4, 0], isAttack: false });
  b = AI.applyMoveTells(b, s2, s, result, "medium");
  assert.equal(b.pieces[1].probs["B"], 0);
  assert.equal(b.pieces[1].probs["F"], 0);
  assert.ok(Math.abs(sumProbs(b.pieces[1].probs) - 1) < 1e-9);
});

test("applyMoveTells: a multi-square slide collapses to Scout (medium+)", () => {
  const s = makeState([
    { id: 1, row: 0, col: 0, owner: "red", rank: 2 },
    { id: 2, row: 9, col: 9, owner: "blue", rank: 9 },
  ]);
  let b = AI.createBeliefs(s, "blue");
  const { state: s2, result } = Engine.applyMove(
    { ...s, turn: "red" }, { pieceId: 1, from: [0, 0], to: [0, 4], isAttack: false });
  b = AI.applyMoveTells(b, s2, s, result, "medium");
  assert.equal(b.pieces[1].known, 2);
});

test("applyMoveTells easy mode ignores slide/combat tells", () => {
  const s = makeState([
    { id: 1, row: 0, col: 0, owner: "red", rank: 2 },
    { id: 2, row: 9, col: 9, owner: "blue", rank: 9 },
  ]);
  let b = AI.createBeliefs(s, "blue");
  const { state: s2, result } = Engine.applyMove(
    { ...s, turn: "red" }, { pieceId: 1, from: [0, 0], to: [0, 4], isAttack: false });
  b = AI.applyMoveTells(b, s2, s, result, "easy");
  assert.equal(b.pieces[1].known, null);
  assert.equal(b.pieces[1].probs["B"], 0); // still knows it's not a bomb (it moved)
});

test("applyMoveTells: surviving a combat collapses to the true revealed rank", () => {
  const s = makeState([
    { id: 1, row: 3, col: 3, owner: "red", rank: 9 },
    { id: 2, row: 3, col: 4, owner: "blue", rank: 6 },
  ]);
  let b = AI.createBeliefs(s, "blue");
  const { state: s2, result } = Engine.applyMove(
    { ...s, turn: "red" }, { pieceId: 1, from: [3, 3], to: [3, 4], isAttack: true });
  b = AI.applyMoveTells(b, s2, s, result, "hard");
  assert.equal(b.pieces[1].known, 9);
});
