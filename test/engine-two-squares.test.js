import test from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./harness.js";

const { Engine } = loadModules(["rng", "engine"]);

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

function hasMoveTo(moves, r, c) {
  return moves.some((m) => m.to[0] === r && m.to[1] === c);
}

test("piece may shuttle X->Y->X but not back to Y a third consecutive visit", () => {
  let s = makeState([{ id: 1, row: 3, col: 3, owner: "red", rank: 6 }]);
  // X = [3,3], Y = [3,4]
  ({ state: s } = Engine.applyMove(s, { pieceId: 1, from: [3, 3], to: [3, 4], isAttack: false }));
  s.turn = "red";
  ({ state: s } = Engine.applyMove(s, { pieceId: 1, from: [3, 4], to: [3, 3], isAttack: false }));
  s.turn = "red";
  const moves = Engine.movesForPiece(s, 3, 3);
  assert.equal(hasMoveTo(moves, 3, 4), false, "third consecutive X->Y is forbidden");
  // but moving elsewhere is fine
  assert.equal(hasMoveTo(moves, 2, 3), true);
});

test("oscillation lock resets after a non-oscillating move", () => {
  let s = makeState([{ id: 1, row: 3, col: 3, owner: "red", rank: 6 }]);
  ({ state: s } = Engine.applyMove(s, { pieceId: 1, from: [3, 3], to: [3, 4], isAttack: false }));
  s.turn = "red";
  ({ state: s } = Engine.applyMove(s, { pieceId: 1, from: [3, 4], to: [3, 3], isAttack: false }));
  s.turn = "red";
  ({ state: s } = Engine.applyMove(s, { pieceId: 1, from: [3, 3], to: [2, 3], isAttack: false }));
  s.turn = "red";
  const moves = Engine.movesForPiece(s, 2, 3);
  assert.equal(hasMoveTo(moves, 3, 3), true, "back to 3,3 is legal again after breaking the pattern");
});
