import test from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./harness.js";

const { Engine } = loadModules(["rng", "engine"]);

// Build a state directly from a sparse piece list for focused tests.
// pieces: [{row,col,owner,rank,revealed?}]
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
      id: id++, owner: p.owner, rank: p.rank,
      hasMoved: !!p.hasMoved, revealed: !!p.revealed,
    };
  }
  return {
    board, turn, moveHistory: [], pieceMoveLog: {},
    winner: null, winReason: null, nextPieceId: id,
  };
}

function tos(moves) {
  return moves.map((m) => `${m.from}->${m.to}${m.isAttack ? "*" : ""}`).sort();
}

test("a lone infantry piece has 4 moves in open space", () => {
  const s = makeState([{ row: 2, col: 5, owner: "red", rank: 6 }]);
  const m = Engine.legalMoves(s, "red");
  assert.deepEqual(tos(m), tos([
    { from: [2, 5], to: [1, 5] }, { from: [2, 5], to: [3, 5] },
    { from: [2, 5], to: [2, 4] }, { from: [2, 5], to: [2, 6] },
  ]));
});

test("edges and lakes block movement", () => {
  const s = makeState([{ row: 4, col: 1, owner: "red", rank: 6 }]);
  // right neighbor [4,2] is a lake; up/down/left allowed
  const m = Engine.legalMoves(s, "red");
  assert.deepEqual(tos(m), tos([
    { from: [4, 1], to: [3, 1] }, { from: [4, 1], to: [5, 1] },
    { from: [4, 1], to: [4, 0] },
  ]));
});

test("friendly piece blocks, enemy piece is an attack", () => {
  const s = makeState([
    { row: 2, col: 5, owner: "red", rank: 6 },
    { row: 2, col: 6, owner: "red", rank: 5 },   // friendly, blocks
    { row: 1, col: 5, owner: "blue", rank: 7 },  // enemy, attackable
  ]);
  const m = Engine.legalMoves(s, "red").filter((x) => x.pieceId === 1);
  assert.deepEqual(tos(m), tos([
    { from: [2, 5], to: [1, 5], isAttack: true },
    { from: [2, 5], to: [3, 5] },
    { from: [2, 5], to: [2, 4] },
  ]));
});

test("bombs and flag never move", () => {
  const s = makeState([
    { row: 3, col: 3, owner: "red", rank: "B" },
    { row: 5, col: 5, owner: "red", rank: "F" },
  ]);
  assert.equal(Engine.legalMoves(s, "red").length, 0);
});

test("scout slides across empty squares and stops at first enemy (attack)", () => {
  const s = makeState([
    { row: 0, col: 0, owner: "red", rank: 2 },
    { row: 0, col: 4, owner: "blue", rank: 9 },
  ]);
  const m = Engine.legalMoves(s, "red").filter((x) => x.from[0] === 0 && x.from[1] === 0);
  const horiz = m.filter((x) => x.to[0] === 0);
  assert.deepEqual(tos(horiz), tos([
    { from: [0, 0], to: [0, 1] }, { from: [0, 0], to: [0, 2] },
    { from: [0, 0], to: [0, 3] }, { from: [0, 0], to: [0, 4], isAttack: true },
  ]));
});

test("scout slide is blocked by a friendly piece (no attack, stops before it)", () => {
  const s = makeState([
    { row: 0, col: 0, owner: "red", rank: 2 },
    { row: 0, col: 3, owner: "red", rank: 9 },
  ]);
  const horiz = Engine.legalMoves(s, "red")
    .filter((x) => x.pieceId === 1 && x.to[0] === 0);
  assert.deepEqual(tos(horiz), tos([
    { from: [0, 0], to: [0, 1] }, { from: [0, 0], to: [0, 2] },
  ]));
});

test("scout slide cannot cross a lake", () => {
  const s = makeState([{ row: 4, col: 0, owner: "red", rank: 2 }]);
  const horiz = Engine.legalMoves(s, "red").filter((x) => x.to[0] === 4);
  assert.deepEqual(tos(horiz), tos([{ from: [4, 0], to: [4, 1] }]));
});

test("legalMoves only returns the requested owner's moves", () => {
  const s = makeState([
    { row: 3, col: 3, owner: "red", rank: 6 },
    { row: 6, col: 6, owner: "blue", rank: 6 },
  ]);
  const red = Engine.legalMoves(s, "red");
  assert.ok(red.every((m) => s.board[m.from[0]][m.from[1]].owner === "red"));
});
