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

test("evaluate: a Marshal hanging next to an unknown enemy scores worse than a safe one", () => {
  // Only difference between the two positions is the distance of the unknown
  // red piece from blue's Marshal (adjacent vs. three away). The unknown red
  // piece's position does not touch blue material, mobility, flag-safety or
  // flag-hunt — so any score gap is the destination-danger term.
  const danger = makeState([
    { id: 1, row: 5, col: 5, owner: "blue", rank: 10 },
    { id: 2, row: 4, col: 5, owner: "red", rank: 6 },       // unknown, adjacent
    { id: 3, row: 0, col: 0, owner: "blue", rank: "F" },
    { id: 4, row: 9, col: 9, owner: "red", rank: "F" },
  ]);
  const safe = makeState([
    { id: 1, row: 5, col: 5, owner: "blue", rank: 10 },
    { id: 2, row: 2, col: 5, owner: "red", rank: 6 },       // unknown, 3 away
    { id: 3, row: 0, col: 0, owner: "blue", rank: "F" },
    { id: 4, row: 9, col: 9, owner: "red", rank: "F" },
  ]);
  const bDanger = AI.createBeliefs(danger, "blue");
  const bSafe = AI.createBeliefs(safe, "blue");
  assert.ok(
    AI.evaluate(safe, bSafe, "blue") > AI.evaluate(danger, bDanger, "blue"),
    "safe Marshal position should score higher");
});

test("evaluate: danger term is skipped when forOwner is not the belief viewer", () => {
  const s = makeState([
    { id: 1, row: 5, col: 5, owner: "blue", rank: 10 },
    { id: 2, row: 4, col: 5, owner: "red", rank: 6 },
    { id: 3, row: 0, col: 0, owner: "blue", rank: "F" },
    { id: 4, row: 9, col: 9, owner: "red", rank: "F" },
  ]);
  const b = AI.createBeliefs(s, "blue"); // viewer blue
  // Should not throw and should produce a finite number for the non-viewer side.
  assert.equal(Number.isFinite(AI.evaluate(s, b, "red")), true);
});

test("chooseMove (medium) does not park a mid-value piece next to an unmoved unknown enemy", () => {
  // Blue Sergeant (4) at (5,4). Stepping to (4,4) parks it adjacent to an
  // unmoved unknown red piece at (3,4) — an unknown unmoved piece beats a
  // Sergeant as attacker most of the time. Flag-hunt geometry (red flag at
  // (0,9)) nominally favours (4,4), so only the danger term makes the AI
  // prefer a lateral move.
  const s = makeState([
    { id: 1, row: 5, col: 4, owner: "blue", rank: 4 },
    { id: 2, row: 3, col: 4, owner: "red", rank: 7 },
    { id: 3, row: 0, col: 0, owner: "blue", rank: "F" },
    { id: 4, row: 9, col: 0, owner: "blue", rank: "B" },
    { id: 5, row: 0, col: 9, owner: "red", rank: "F" },
    { id: 6, row: 1, col: 9, owner: "red", rank: "B" },
  ], "blue");
  const b = AI.createBeliefs(s, "blue");
  const m = AI.chooseMove(s, b, { level: "medium", rng: RNG.create(1) });
  assert.ok(m, "a move was chosen");
  assert.notDeepEqual([m.to[0], m.to[1]], [4, 4],
    "Sergeant should not step next to the unknown enemy");
});

test("search expectation-node attacker chance expansion: deterministic & legal", () => {
  const s = makeState([
    { id: 1, row: 3, col: 3, owner: "blue", rank: 8 },
    { id: 2, row: 3, col: 4, owner: "red", rank: 6 },       // unknown; can attack blue
    { id: 3, row: 2, col: 0, owner: "blue", rank: 5 },
    { id: 4, row: 0, col: 0, owner: "blue", rank: "F" },
    { id: 5, row: 9, col: 9, owner: "red", rank: "F" },
  ], "blue");
  const b = AI.createBeliefs(s, "blue");
  const legal = Engine.legalMoves(s, "blue");
  const m1 = AI.chooseMove(s, b, { level: "hard", rng: RNG.create(7) });
  const m2 = AI.chooseMove(s, b, { level: "hard", rng: RNG.create(7) });
  assert.deepEqual(m1, m2);
  assert.ok(legal.some((x) =>
    x.pieceId === m1.pieceId && x.to[0] === m1.to[0] && x.to[1] === m1.to[1]));
});
