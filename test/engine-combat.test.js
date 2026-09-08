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

test("resolveCombat rank comparisons", () => {
  assert.equal(Engine.resolveCombat(9, 8), "attacker");
  assert.equal(Engine.resolveCombat(5, 7), "defender");
  assert.equal(Engine.resolveCombat(4, 4), "both");
});

test("resolveCombat: spy attacks marshal wins; marshal attacks spy wins", () => {
  assert.equal(Engine.resolveCombat(1, 10), "attacker");
  assert.equal(Engine.resolveCombat(10, 1), "attacker");
  assert.equal(Engine.resolveCombat(1, 9), "defender"); // spy loses to general
});

test("resolveCombat: miner defuses bomb; others die to bomb", () => {
  assert.equal(Engine.resolveCombat(3, "B"), "attacker");
  assert.equal(Engine.resolveCombat(8, "B"), "defender");
  assert.equal(Engine.resolveCombat(2, "B"), "defender");
});

test("resolveCombat: any attacker captures the flag", () => {
  assert.equal(Engine.resolveCombat(2, "F"), "attacker");
});

test("applyMove: simple relocation flips turn and marks hasMoved", () => {
  const s = makeState([{ id: 1, row: 3, col: 3, owner: "red", rank: 6 }]);
  const move = { pieceId: 1, from: [3, 3], to: [3, 4], isAttack: false };
  const { state, result } = Engine.applyMove(s, move);
  assert.equal(state.board[3][3], null);
  assert.equal(state.board[3][4].id, 1);
  assert.equal(state.board[3][4].hasMoved, true);
  assert.equal(state.turn, "blue");
  assert.equal(result.combat, null);
  assert.equal(s.board[3][3].id, 1, "input state not mutated");
});

test("applyMove: attacker wins, defender captured and attacker revealed", () => {
  const s = makeState([
    { id: 1, row: 3, col: 3, owner: "red", rank: 9 },
    { id: 2, row: 3, col: 4, owner: "blue", rank: 6 },
  ]);
  const move = { pieceId: 1, from: [3, 3], to: [3, 4], isAttack: true };
  const { state, result } = Engine.applyMove(s, move);
  assert.equal(state.board[3][4].id, 1);
  assert.equal(state.board[3][4].revealed, true);
  assert.deepEqual(result.captured, [2]);
  assert.deepEqual(result.revealed, [1]);
  assert.equal(result.combat.outcome, "attacker");
});

test("applyMove: defender wins, attacker captured, defender stays and revealed", () => {
  const s = makeState([
    { id: 1, row: 3, col: 3, owner: "red", rank: 4 },
    { id: 2, row: 3, col: 4, owner: "blue", rank: 8 },
  ]);
  const { state, result } = Engine.applyMove(
    s, { pieceId: 1, from: [3, 3], to: [3, 4], isAttack: true });
  assert.equal(state.board[3][3], null);
  assert.equal(state.board[3][4].id, 2);
  assert.equal(state.board[3][4].revealed, true);
  assert.deepEqual(result.captured, [1]);
  assert.deepEqual(result.revealed, [2]);
});

test("applyMove: equal ranks remove both", () => {
  const s = makeState([
    { id: 1, row: 3, col: 3, owner: "red", rank: 7 },
    { id: 2, row: 3, col: 4, owner: "blue", rank: 7 },
  ]);
  const { state, result } = Engine.applyMove(
    s, { pieceId: 1, from: [3, 3], to: [3, 4], isAttack: true });
  assert.equal(state.board[3][3], null);
  assert.equal(state.board[3][4], null);
  assert.deepEqual(result.captured.sort(), [1, 2]);
});

test("applyMove: capturing the flag ends the game", () => {
  const s = makeState([
    { id: 1, row: 3, col: 3, owner: "red", rank: 2 },
    { id: 2, row: 3, col: 4, owner: "blue", rank: "F" },
  ]);
  const { state, result } = Engine.applyMove(
    s, { pieceId: 1, from: [3, 3], to: [3, 4], isAttack: true });
  assert.equal(result.winner, "red");
  assert.equal(result.winReason, "flag");
  assert.equal(state.winner, "red");
  assert.deepEqual(Engine.isGameOver(state), { over: true, winner: "red", reason: "flag" });
});

test("applyMove: opponent left with no moves loses", () => {
  // blue has only a flag and a bomb -> no legal moves after red's move
  const s = makeState([
    { id: 1, row: 8, col: 0, owner: "red", rank: 6 },
    { id: 2, row: 0, col: 0, owner: "blue", rank: "F" },
    { id: 3, row: 0, col: 1, owner: "blue", rank: "B" },
  ]);
  const { state, result } = Engine.applyMove(
    s, { pieceId: 1, from: [8, 0], to: [7, 0], isAttack: false });
  assert.equal(result.winner, "red");
  assert.equal(result.winReason, "no-moves");
});

test("applyMove throws if from-square is not the mover's piece", () => {
  const s = makeState([{ id: 1, row: 3, col: 3, owner: "blue", rank: 6 }], "red");
  assert.throws(() =>
    Engine.applyMove(s, { pieceId: 1, from: [3, 3], to: [3, 4], isAttack: false }));
});

test("applyMove throws if the destination is a lake or off the board", () => {
  const s = makeState([{ id: 1, row: 3, col: 2, owner: "red", rank: 6 }]);
  assert.throws(
    () => Engine.applyMove(s, { pieceId: 1, from: [3, 2], to: [4, 2], isAttack: false }),
    /lake/);
  assert.throws(
    () => Engine.applyMove(
      makeState([{ id: 1, row: 0, col: 0, owner: "red", rank: 6 }]),
      { pieceId: 1, from: [0, 0], to: [-1, 0], isAttack: false }),
    /off-board|lake/);
});
