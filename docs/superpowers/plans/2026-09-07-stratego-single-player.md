# Single-Player Stratego Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file, offline, browser-based single-player Stratego game with a deterministic rule-based AI opponent and four difficulty tiers.

**Architecture:** Everything ships in one `stratego.html` file. JavaScript is split into four `globalThis.Stratego.*` modules defined in delimited `<script id="...">` blocks: `RNG` (seeded PRNG), `Engine` (pure rules), `AI` (belief model + expectimax), and `UI` (DOM, input, animation, persistence). A Node test runner extracts the `RNG`/`Engine`/`AI` blocks from the HTML and runs `node:test` assertions against them, so the delivered artifact stays a single file while development uses real TDD. UI gets Playwright smoke tests.

**Tech Stack:** Vanilla JavaScript (ES2022), HTML, CSS. No runtime dependencies. Dev-only: Node.js >= 20 built-in `node:test`, `@playwright/test` for end-to-end smoke tests.

**Spec:** `docs/superpowers/specs/2026-09-07-stratego-single-player-design.md`

## Global Constraints

- The delivered game is exactly one file: `stratego.html`. No external scripts, stylesheets, fonts, images, or network calls at runtime. All assets are inline CSS / Unicode / CSS-drawn.
- Node.js >= 20 required for development (built-in `node:test`).
- All JavaScript modules attach to a single namespace: `globalThis.Stratego = globalThis.Stratego || {}` then `globalThis.Stratego.<Name> = (function(){ ... })()`.
- Module source lives in `<script id="rng">`, `<script id="engine">`, `<script id="ai">`, `<script id="ui">` blocks. The test harness extracts by exact id.
- `Engine` contains no randomness and no DOM access. `AI` and `RNG` contain no DOM access. Only `UI` touches `document`/`window` (beyond `globalThis` namespace assignment).
- All randomness routes through a `RNG` instance seeded from a stored integer seed, so games and tests are reproducible.
- The AI never reads an unrevealed human piece's `rank`. It receives a redacted view.
- Board coordinates: `board[row][col]`, `row` and `col` both `0..9`. Row 0 is the blue (AI) back row; row 9 is the red (human) back row. Human deploys rows 6-9; AI deploys rows 0-3. Lakes occupy rows 4-5, columns 2-3 and 6-7.
- Rank types and counts (per side): `10`x1, `9`x1, `8`x2, `7`x3, `6`x4, `5`x4, `4`x4, `3`x5, `2`x8, `1`x1, `'B'`x6, `'F'`x1 (total 40).
- Commit after every task with a `feat:`/`test:`/`chore:` prefixed message. End every commit message with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01GuXrGmBunyAQM4hqFf6Pj6
  ```

---

### Task 1: Project scaffold, test harness, and seeded RNG

**Files:**
- Create: `stratego.html`
- Create: `test/harness.js`
- Create: `test/rng.test.js`
- Create: `package.json`
- Create: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `test/harness.js` exports `loadModules(names?: string[]): object` — reads `stratego.html`, extracts the requested `<script id>` blocks (default `['rng','engine','ai']`), evaluates them in one shared `node:vm` context, and returns that context's `globalThis.Stratego` object.
  - `globalThis.Stratego.RNG`: `RNG.create(seed: number): RngInstance`. `RngInstance` has `next(): number` (float in `[0,1)`), `int(nExclusive: number): number` (integer `0..n-1`), `pick(array): any`, `shuffle(array): array` (returns a new shuffled array, Fisher-Yates), `state(): number` (current internal state), `RNG.fromState(state: number): RngInstance`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "stratego",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "node --test test/",
    "test:ui": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.47.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
test-results/
playwright-report/
.DS_Store
```

- [ ] **Step 3: Create `stratego.html` skeleton with the four module blocks**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stratego</title>
<style>
/* styles added in Task 9 */
:root { color-scheme: light dark; }
body { margin: 0; font-family: system-ui, sans-serif; }
</style>
</head>
<body>
<div id="app"></div>

<script id="rng">
globalThis.Stratego = globalThis.Stratego || {};
globalThis.Stratego.RNG = (function () {
  "use strict";
  // mulberry32
  function create(seed) {
    let s = seed >>> 0;
    function next() {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function int(n) { return Math.floor(next() * n); }
    function pick(arr) { return arr[int(arr.length)]; }
    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    return { next, int, pick, shuffle, state: () => s >>> 0 };
  }
  function fromState(state) { return create(state >>> 0); }
  return { create, fromState };
})();
</script>

<script id="engine">
globalThis.Stratego = globalThis.Stratego || {};
globalThis.Stratego.Engine = (function () {
  "use strict";
  return {}; // filled in Tasks 2-5
})();
</script>

<script id="ai">
globalThis.Stratego = globalThis.Stratego || {};
globalThis.Stratego.AI = (function () {
  "use strict";
  return {}; // filled in Tasks 6-8
})();
</script>

<script id="ui">
globalThis.Stratego = globalThis.Stratego || {};
globalThis.Stratego.UI = (function () {
  "use strict";
  return {}; // filled in Tasks 9-11
})();
</script>
</body>
</html>
```

- [ ] **Step 4: Create `test/harness.js`**

```js
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(here, "..", "stratego.html");

function extractScript(html, id) {
  const re = new RegExp(
    `<script id="${id}">([\\s\\S]*?)<\\/script>`, "i"
  );
  const m = html.match(re);
  if (!m) throw new Error(`script block id="${id}" not found`);
  return m[1];
}

export function loadModules(names = ["rng", "engine", "ai"]) {
  const html = readFileSync(HTML_PATH, "utf8");
  const context = vm.createContext({ Math, JSON, console, Date });
  for (const id of names) {
    vm.runInContext(extractScript(html, id), context, { filename: `${id}.js` });
  }
  return context.Stratego;
}
```

- [ ] **Step 5: Create `test/rng.test.js`**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./harness.js";

const { RNG } = loadModules(["rng"]);

test("RNG is deterministic for a given seed", () => {
  const a = RNG.create(12345);
  const b = RNG.create(12345);
  const seqA = Array.from({ length: 10 }, () => a.next());
  const seqB = Array.from({ length: 10 }, () => b.next());
  assert.deepEqual(seqA, seqB);
});

test("RNG.next returns floats in [0,1)", () => {
  const r = RNG.create(1);
  for (let i = 0; i < 1000; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1, `value out of range: ${v}`);
  }
});

test("RNG.int(n) returns integers 0..n-1", () => {
  const r = RNG.create(7);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const v = r.int(6);
    assert.ok(Number.isInteger(v) && v >= 0 && v < 6);
    seen.add(v);
  }
  assert.equal(seen.size, 6);
});

test("RNG.shuffle returns a permutation and does not mutate input", () => {
  const r = RNG.create(99);
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = r.shuffle(input);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(out.slice().sort((x, y) => x - y), input);
});

test("RNG can be resumed from state()", () => {
  const r = RNG.create(555);
  r.next(); r.next(); r.next();
  const saved = r.state();
  const expected = [r.next(), r.next(), r.next()];
  const resumed = RNG.fromState(saved);
  assert.deepEqual([resumed.next(), resumed.next(), resumed.next()], expected);
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: all `test/rng.test.js` tests PASS. (No engine/ai tests exist yet.)

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore stratego.html test/
git commit -m "chore: scaffold project, test harness, seeded RNG

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuXrGmBunyAQM4hqFf6Pj6"
```

---

### Task 2: Engine — board geometry, state construction, deployment validation

**Files:**
- Modify: `stratego.html` (the `<script id="engine">` block)
- Create: `test/engine-setup.test.js`

**Interfaces:**
- Consumes: `Stratego.Engine` namespace object from Task 1.
- Produces:
  - `Engine.ROWS = 10`, `Engine.COLS = 10`.
  - `Engine.RANKS`: ordered array of `{ rank, name, count }` from strongest to weakest, then `{rank:'B',name:'Bomb',count:6}`, `{rank:'F',name:'Flag',count:1}`.
  - `Engine.isLake(row, col): boolean`.
  - `Engine.deployRows(owner): number[]` — `[6,7,8,9]` for `'red'`, `[0,1,2,3]` for `'blue'`.
  - `Engine.validateSetup(owner, placements): { ok: boolean, error?: string }` where `placements` is an array of `{ row, col, rank }`. Valid = exactly 40 entries, all in `owner`'s deploy rows, no lakes (none in deploy rows anyway), no duplicate squares, rank multiset exactly equals the required counts.
  - `Engine.newGame(redPlacements, bluePlacements): State`. Validates both setups (throws `Error` on invalid). Returns:
    ```
    State = {
      board: (null | {lake:true} | Piece)[10][10],
      turn: 'red',
      moveHistory: [],
      pieceMoveLog: {},         // pieceId -> [{from:[r,c], to:[r,c]}]
      winner: null,
      winReason: null,
      nextPieceId: <int>
    }
    Piece = { id:number, owner:'red'|'blue', rank:number|'B'|'F', hasMoved:false, revealed:false }
    ```
    Lake cells are `{lake:true}`. Empty cells are `null`.
  - `Engine.cloneState(state): State` — deep structural clone (board, pieces, logs). Used everywhere a mutation-free copy is needed.
  - `Engine.pieceAt(state, row, col): Piece | null`.

- [ ] **Step 1: Write the failing test — `test/engine-setup.test.js`**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine-setup.test.js`
Expected: FAIL (`Engine.ROWS` undefined, `Engine.newGame is not a function`, etc.)

- [ ] **Step 3: Implement in the `<script id="engine">` block**

Replace the `return {};` stub with the real implementation:

```js
const ROWS = 10, COLS = 10;

const RANKS = [
  { rank: 10, name: "Marshal", count: 1 },
  { rank: 9, name: "General", count: 1 },
  { rank: 8, name: "Colonel", count: 2 },
  { rank: 7, name: "Major", count: 3 },
  { rank: 6, name: "Captain", count: 4 },
  { rank: 5, name: "Lieutenant", count: 4 },
  { rank: 4, name: "Sergeant", count: 4 },
  { rank: 3, name: "Miner", count: 5 },
  { rank: 2, name: "Scout", count: 8 },
  { rank: 1, name: "Spy", count: 1 },
  { rank: "B", name: "Bomb", count: 6 },
  { rank: "F", name: "Flag", count: 1 },
];

const REQUIRED_COUNTS = Object.fromEntries(RANKS.map((r) => [r.rank, r.count]));

function isLake(row, col) {
  return (row === 4 || row === 5) &&
         (col === 2 || col === 3 || col === 6 || col === 7);
}

function deployRows(owner) {
  return owner === "red" ? [6, 7, 8, 9] : [0, 1, 2, 3];
}

function validateSetup(owner, placements) {
  if (!Array.isArray(placements) || placements.length !== 40)
    return { ok: false, error: "must place exactly 40 pieces" };
  const rows = new Set(deployRows(owner));
  const seen = new Set();
  const counts = {};
  for (const { row, col, rank } of placements) {
    if (!rows.has(row) || col < 0 || col > 9)
      return { ok: false, error: `square out of deploy zone: ${row},${col}` };
    const key = row + "," + col;
    if (seen.has(key)) return { ok: false, error: `duplicate square: ${key}` };
    seen.add(key);
    counts[rank] = (counts[rank] || 0) + 1;
  }
  for (const rank of Object.keys(REQUIRED_COUNTS)) {
    // rank keys from Object.keys are strings; normalize numeric ranks
    const want = REQUIRED_COUNTS[rank];
    const norm = rank === "B" || rank === "F" ? rank : Number(rank);
    if ((counts[norm] || 0) !== want)
      return { ok: false, error: `wrong count for ${rank}` };
  }
  const totalKinds = Object.keys(counts).length;
  if (totalKinds !== RANKS.length)
    return { ok: false, error: "unexpected rank present" };
  return { ok: true };
}

function emptyBoard() {
  const b = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push(isLake(r, c) ? { lake: true } : null);
    b.push(row);
  }
  return b;
}

function newGame(redPlacements, bluePlacements) {
  const rv = validateSetup("red", redPlacements);
  if (!rv.ok) throw new Error("invalid red setup: " + rv.error);
  const bv = validateSetup("blue", bluePlacements);
  if (!bv.ok) throw new Error("invalid blue setup: " + bv.error);
  const board = emptyBoard();
  let id = 1;
  for (const [owner, placements] of [["red", redPlacements], ["blue", bluePlacements]]) {
    for (const { row, col, rank } of placements) {
      board[row][col] = { id: id++, owner, rank, hasMoved: false, revealed: false };
    }
  }
  return {
    board,
    turn: "red",
    moveHistory: [],
    pieceMoveLog: {},
    winner: null,
    winReason: null,
    nextPieceId: id,
  };
}

function cloneState(state) {
  const board = state.board.map((row) =>
    row.map((cell) => (cell ? { ...cell } : null))
  );
  return {
    board,
    turn: state.turn,
    moveHistory: state.moveHistory.map((m) => ({ ...m })),
    pieceMoveLog: Object.fromEntries(
      Object.entries(state.pieceMoveLog).map(([k, v]) => [k, v.map((e) => ({ ...e }))])
    ),
    winner: state.winner,
    winReason: state.winReason,
    nextPieceId: state.nextPieceId,
  };
}

function pieceAt(state, row, col) {
  const cell = state.board[row]?.[col];
  return cell && !cell.lake ? cell : null;
}

return {
  ROWS, COLS, RANKS,
  isLake, deployRows, validateSetup, newGame, cloneState, pieceAt,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine-setup.test.js`
Expected: all PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: `rng` + `engine-setup` all PASS.

- [ ] **Step 6: Commit**

```bash
git add stratego.html test/engine-setup.test.js
git commit -m "feat: engine board geometry, state, deployment validation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuXrGmBunyAQM4hqFf6Pj6"
```

---

### Task 3: Engine — legal move generation (movement only, no combat yet)

**Files:**
- Modify: `stratego.html` (the `<script id="engine">` block)
- Create: `test/engine-moves.test.js`

**Interfaces:**
- Consumes: everything from Task 2.
- Produces:
  - `Engine.inBounds(row, col): boolean`.
  - `Engine.legalMoves(state, owner): Move[]` where
    ```
    Move = {
      pieceId: number,
      from: [row, col],
      to: [row, col],
      isAttack: boolean,      // true if `to` holds an enemy piece
    }
    ```
    Rules implemented in this task:
    - Only pieces owned by `owner`.
    - Bombs (`rank:'B'`) and Flag (`rank:'F'`) generate no moves.
    - Non-scout pieces: the 4 orthogonal neighbors. A move to an empty in-bounds non-lake square is legal (`isAttack:false`). A move onto an enemy piece is legal (`isAttack:true`). A move onto a friendly piece or a lake or off-board is not generated.
    - Scouts (`rank:2`): slide along each of the 4 directions across consecutive empty non-lake squares; each empty square is a legal non-attack move; the first square that holds an enemy piece is a legal attack move and the slide stops; a friendly piece / lake / edge stops the slide with no move for that square.
  - `Engine.movesForPiece(state, row, col): Move[]` — convenience filter of `legalMoves` for the piece at that square (empty array if none / not that turn's owner is *not* enforced here; it returns moves for whoever owns the piece).
  - The two-squares rule is NOT applied yet (added in Task 5).

- [ ] **Step 1: Write the failing test — `test/engine-moves.test.js`**

```js
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
  const s = makeState([{ row: 3, col: 3, owner: "red", rank: 6 }]);
  const m = Engine.legalMoves(s, "red");
  assert.deepEqual(tos(m), tos([
    { from: [3, 3], to: [2, 3] }, { from: [3, 3], to: [4, 3] },
    { from: [3, 3], to: [3, 2] }, { from: [3, 3], to: [3, 4] },
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
    { row: 3, col: 3, owner: "red", rank: 6 },
    { row: 3, col: 4, owner: "red", rank: 5 },   // friendly, blocks
    { row: 2, col: 3, owner: "blue", rank: 7 },  // enemy, attackable
  ]);
  const m = Engine.legalMoves(s, "red").filter((x) => x.pieceId === 1);
  assert.deepEqual(tos(m), tos([
    { from: [3, 3], to: [2, 3], isAttack: true },
    { from: [3, 3], to: [4, 3] },
    { from: [3, 3], to: [3, 2] },
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
```

Note: `tos` compares with `isAttack` folded into the string only when true; make sure the implementation sets `isAttack:false` explicitly and the helper appends `*` only when truthy. Adjust the expected arrays' objects to include `isAttack` only where `true` — the helper already handles the default.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine-moves.test.js`
Expected: FAIL (`Engine.legalMoves is not a function`).

- [ ] **Step 3: Implement — add to the `<script id="engine">` block**

Add these functions and extend the returned object:

```js
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }

function isImmovable(rank) { return rank === "B" || rank === "F"; }

function legalMoves(state, owner) {
  const moves = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = pieceAt(state, r, c);
      if (!p || p.owner !== owner || isImmovable(p.rank)) continue;
      const maxStep = p.rank === 2 ? Math.max(ROWS, COLS) : 1;
      for (const [dr, dc] of DIRS) {
        for (let step = 1; step <= maxStep; step++) {
          const nr = r + dr * step, nc = c + dc * step;
          if (!inBounds(nr, nc)) break;
          const cell = state.board[nr][nc];
          if (cell && cell.lake) break;
          if (!cell) {
            moves.push({ pieceId: p.id, from: [r, c], to: [nr, nc], isAttack: false });
            continue;
          }
          // occupied
          if (cell.owner !== owner) {
            moves.push({ pieceId: p.id, from: [r, c], to: [nr, nc], isAttack: true });
          }
          break; // any piece (friend or foe) stops the slide
        }
      }
    }
  }
  return moves;
}

function movesForPiece(state, row, col) {
  const p = pieceAt(state, row, col);
  if (!p) return [];
  return legalMoves(state, p.owner).filter(
    (m) => m.from[0] === row && m.from[1] === col
  );
}
```

Extend the return object:

```js
return {
  ROWS, COLS, RANKS,
  isLake, deployRows, validateSetup, newGame, cloneState, pieceAt,
  inBounds, isImmovable, legalMoves, movesForPiece,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine-moves.test.js`
Expected: all PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add stratego.html test/engine-moves.test.js
git commit -m "feat: engine legal move generation with scout slides

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuXrGmBunyAQM4hqFf6Pj6"
```

---

### Task 4: Engine — combat resolution, applyMove, win detection

**Files:**
- Modify: `stratego.html` (the `<script id="engine">` block)
- Create: `test/engine-combat.test.js`

**Interfaces:**
- Consumes: everything from Tasks 2-3.
- Produces:
  - `Engine.resolveCombat(attackerRank, defenderRank): 'attacker' | 'defender' | 'both'`. Pure rank logic:
    - `defenderRank === 'F'` -> `'attacker'`.
    - `defenderRank === 'B'` -> `attackerRank === 3 ? 'attacker' : 'defender'`.
    - `attackerRank === 1 && defenderRank === 10` -> `'attacker'` (Spy attacks Marshal).
    - both numeric: `>` -> `'attacker'`, `<` -> `'defender'`, `===` -> `'both'`.
    - (`attackerRank` is never `'B'` or `'F'` — immovable pieces never attack.)
  - `Engine.applyMove(state, move): { state: State, result: MoveResult }`. Does not mutate the input state. `move` must be one returned by `legalMoves` for `state.turn`'s owner (caller's responsibility; `applyMove` may assume legality but should throw a clear `Error` if the `from` square is empty or not owned by `state.turn`).
    ```
    MoveResult = {
      move: Move,
      combat: null | {
        attacker: { id, rank, owner },
        defender: { id, rank, owner },
        outcome: 'attacker' | 'defender' | 'both',
        square: [row, col],
      },
      revealed: number[],       // ids of pieces newly revealed this move
      captured: number[],       // ids removed from the board this move
      winner: null | 'red' | 'blue',
      winReason: null | 'flag' | 'no-moves',
    }
    ```
    Behavior:
    - Move the piece; set `hasMoved = true` on it.
    - Record the move in `state.moveHistory` (push the `Move`) and in `state.pieceMoveLog[pieceId]` (push `{from, to}`).
    - Non-attack: piece ends on `to`.
    - Attack: run `resolveCombat`. Both combatants that *survive* get `revealed = true` and their ids go in `revealed`. Removed pieces go in `captured`.
      - `'attacker'`: defender removed; attacker moves to `to`. If defender was `'F'` -> `winner = attacker.owner`, `winReason = 'flag'`.
      - `'defender'`: attacker removed; defender stays on `to`; defender revealed.
      - `'both'`: both removed; `to` becomes empty.
    - After the move, flip `state.turn` to the other owner.
    - Then check: does the new `state.turn` owner have zero `legalMoves`? If so -> `winner = <other owner>`, `winReason = 'no-moves'`. (Two-squares filtering from Task 5 will already be part of `legalMoves` by then.)
    - Set `state.winner` / `state.winReason` accordingly.
  - `Engine.isGameOver(state): { over: boolean, winner: 'red'|'blue'|null, reason: string|null }`.

- [ ] **Step 1: Write the failing test — `test/engine-combat.test.js`**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine-combat.test.js`
Expected: FAIL (`Engine.resolveCombat is not a function`).

- [ ] **Step 3: Implement — add to the `<script id="engine">` block**

```js
function resolveCombat(a, d) {
  if (d === "F") return "attacker";
  if (d === "B") return a === 3 ? "attacker" : "defender";
  if (a === 1 && d === 10) return "attacker";
  if (a > d) return "attacker";
  if (a < d) return "defender";
  return "both";
}

function other(owner) { return owner === "red" ? "blue" : "red"; }

function applyMove(state, move) {
  const s = cloneState(state);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const mover = s.board[fr][fc];
  if (!mover || mover.lake || mover.owner !== s.turn || mover.id !== move.pieceId)
    throw new Error("illegal applyMove: from-square is not the mover's piece");

  const result = {
    move, combat: null, revealed: [], captured: [],
    winner: null, winReason: null,
  };

  mover.hasMoved = true;
  s.moveHistory.push({ ...move });
  (s.pieceMoveLog[mover.id] ||= []).push({ from: [fr, fc], to: [tr, tc] });

  const target = s.board[tr][tc];
  if (!target) {
    s.board[tr][tc] = mover;
    s.board[fr][fc] = null;
  } else {
    // combat
    const outcome = resolveCombat(mover.rank, target.rank);
    result.combat = {
      attacker: { id: mover.id, rank: mover.rank, owner: mover.owner },
      defender: { id: target.id, rank: target.rank, owner: target.owner },
      outcome, square: [tr, tc],
    };
    s.board[fr][fc] = null;
    if (outcome === "attacker") {
      result.captured.push(target.id);
      if (target.rank === "F") {
        result.winner = mover.owner;
        result.winReason = "flag";
      }
      mover.revealed = true;
      result.revealed.push(mover.id);
      s.board[tr][tc] = mover;
    } else if (outcome === "defender") {
      result.captured.push(mover.id);
      target.revealed = true;
      result.revealed.push(target.id);
      // target stays where it is
    } else {
      result.captured.push(mover.id, target.id);
      s.board[tr][tc] = null;
    }
  }

  s.turn = other(s.turn);

  if (result.winner) {
    s.winner = result.winner;
    s.winReason = result.winReason;
  } else if (legalMoves(s, s.turn).length === 0) {
    result.winner = other(s.turn);
    result.winReason = "no-moves";
    s.winner = result.winner;
    s.winReason = "no-moves";
  }

  return { state: s, result };
}

function isGameOver(state) {
  return {
    over: state.winner !== null,
    winner: state.winner,
    reason: state.winReason,
  };
}
```

Extend the return object to also export `resolveCombat, applyMove, isGameOver`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine-combat.test.js`
Expected: all PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add stratego.html test/engine-combat.test.js
git commit -m "feat: engine combat resolution, applyMove, win detection

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuXrGmBunyAQM4hqFf6Pj6"
```

---

### Task 5: Engine — two-squares rule

**Files:**
- Modify: `stratego.html` (the `<script id="engine">` block — `legalMoves`)
- Create: `test/engine-two-squares.test.js`

**Interfaces:**
- Consumes: everything from Tasks 2-4.
- Produces: `Engine.legalMoves` now additionally filters out the illegal third oscillation move. Rule: for the piece being considered, let `log = state.pieceMoveLog[pieceId]`. A candidate move `from X to Y` is illegal if `log.length >= 2` and `log[log.length-1]` is exactly `Y -> X` and `log[log.length-2]` is exactly `X -> Y`. (i.e. the piece just did `X->Y` then `Y->X`, and this move would repeat `X->Y` a second consecutive time — the forbidden 3rd visit.) Coordinates compared element-wise. No other change to the `Move` shape.
- `Engine.movesForPiece` inherits the filtering automatically.

- [ ] **Step 1: Write the failing test — `test/engine-two-squares.test.js`**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine-two-squares.test.js`
Expected: FAIL (third oscillation move still present).

- [ ] **Step 3: Implement — modify `legalMoves` in the `<script id="engine">` block**

Add a helper and a filter inside the per-move push. Replace the two `moves.push(...)` calls with a guarded `pushMove`:

```js
function samePos(a, b) { return a[0] === b[0] && a[1] === b[1]; }

function violatesTwoSquares(state, pieceId, from, to) {
  const log = state.pieceMoveLog[pieceId];
  if (!log || log.length < 2) return false;
  const last = log[log.length - 1];
  const prev = log[log.length - 2];
  return samePos(last.from, to) && samePos(last.to, from) &&
         samePos(prev.from, from) && samePos(prev.to, to);
}
```

In `legalMoves`, wrap pushes:

```js
const addMove = (isAttack) => {
  if (!violatesTwoSquares(state, p.id, [r, c], [nr, nc])) {
    moves.push({ pieceId: p.id, from: [r, c], to: [nr, nc], isAttack });
  }
};
// ... empty square:
if (!cell) { addMove(false); continue; }
// ... enemy:
if (cell.owner !== owner) { addMove(true); }
break;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine-two-squares.test.js`
Expected: all PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS (earlier engine tests unaffected).

- [ ] **Step 6: Commit**

```bash
git add stratego.html test/engine-two-squares.test.js
git commit -m "feat: engine two-squares oscillation rule

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuXrGmBunyAQM4hqFf6Pj6"
```

---

### Task 6: AI — redacted view and belief model

**Files:**
- Modify: `stratego.html` (the `<script id="ai">` block)
- Create: `test/ai-beliefs.test.js`

**Interfaces:**
- Consumes: `Engine` (for `RANKS`), `RNG`.
- Produces:
  - `AI.RANK_TYPES`: `[10,9,8,7,6,5,4,3,2,1,'B','F']`.
  - `AI.redactState(state, viewer): State` — returns a clone where every piece whose `owner !== viewer` and `revealed === false` has its `rank` replaced with `null`. `hasMoved` and `revealed` are kept. Used to guarantee the search never sees hidden ranks.
  - `AI.createBeliefs(state, viewer): Beliefs` — builds belief tracking for the opponent of `viewer`.
    ```
    Beliefs = {
      viewer: 'red'|'blue',
      opponent: 'red'|'blue',
      pieces: { [pieceId]: { probs: {10:.., 9:.., ... 'F':..}, known: rank|null } },
      // probs always sum to ~1; `known` set when collapsed to a single rank
    }
    ```
    Initialization: `remaining[type] = initialCount[type] - (opponent pieces already captured of that type)`. For each *alive* opponent piece:
      - if `revealed` -> `known = rank`, `probs` = 1.0 on that rank.
      - else -> `probs[type] = remaining_unknown[type] / totalUnknownPieces` weighted by count: `probs[type] = remaining[type] / sum(remaining over unrevealed types)`, but subtract revealed-alive pieces from `remaining` first. Concretely: `unknownRemaining[type] = remaining[type] - (# revealed-alive opponent pieces of that type)`; `probs[type] = unknownRemaining[type] / sum(unknownRemaining)`.
  - `AI.applyMoveTells(beliefs, state, prevState, result, level): Beliefs` — returns updated beliefs given a completed move `result` (from `Engine.applyMove`) where the moved piece belonged to `beliefs.opponent`. Deterministic rules:
      - opponent piece moved (any move) -> set `probs['B'] = probs['F'] = 0`, renormalize.
      - opponent piece's move covered Chebyshev distance > 1 (a slide) -> collapse to Scout (`known = 2`).
      - `result.combat` present and involves an opponent piece that survived:
        - opponent was attacker and won vs known defender rank `d`: if `d === 'B'` -> collapse to Miner (3); else keep `probs` only for ranks `> d` (and Spy if `d === 10`), renormalize.
        - opponent was defender and won vs known attacker rank `a`: keep ranks `> a` (or `'B'` unless `a === 3`; or if `a === 1` it stays as-is since spy loses — actually defender beats attacker 1 for any rank), renormalize. If attacker rank `a` and defender survived, defender rank `>= a` is impossible only if tie; so keep ranks `> a` plus `'B'`.
      - `result.combat` where opponent piece was revealed by surviving -> `known = ` that rank if the true rank is in `result` ... NOTE: `result.combat.defender.rank` / `.attacker.rank` always carry true ranks; when the opponent piece survives combat, set `known` to its true rank from `result.combat`. (The rules above are the fallback for when we somehow lack it; in practice combat always reveals the survivor's rank to both players in Stratego, so prefer the exact collapse.)
      - `level === 'easy'`: skip all combat-memory and slide collapses; only apply the "moved -> not bomb/flag" rule. `level` in `{'easy','medium','hard','expert'}`.
  - `AI.applyPositionalPrior(beliefs, state, level): Beliefs` — only when `level` is `'hard'` or `'expert'`. Multiplies each still-unknown piece's `probs['F']` by a factor for back-row / corner-ness and `probs['B']` by a factor for adjacency to high-`F`-probability squares, then renormalizes. Keep factors modest (e.g. back row x3, corner-ish x1.5, else x0.3 for flag).

- [ ] **Step 1: Write the failing test — `test/ai-beliefs.test.js`**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/ai-beliefs.test.js`
Expected: FAIL (`AI.redactState is not a function`).

- [ ] **Step 3: Implement in the `<script id="ai">` block**

Replace the stub. Reference `Engine` via `globalThis.Stratego.Engine`.

```js
const E = () => globalThis.Stratego.Engine;
const RANK_TYPES = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, "B", "F"];
const INITIAL_COUNTS = { 10:1, 9:1, 8:2, 7:3, 6:4, 5:4, 4:4, 3:5, 2:8, 1:1, B:6, F:1 };

function opponentOf(o) { return o === "red" ? "blue" : "red"; }

function redactState(state, viewer) {
  const s = E().cloneState(state);
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
      const cell = s.board[r][c];
      if (cell && !cell.lake && cell.owner !== viewer && !cell.revealed) {
        cell.rank = null;
      }
    }
  return s;
}

function alivePieces(state, owner) {
  const out = [];
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
      const cell = state.board[r][c];
      if (cell && !cell.lake && cell.owner === owner) out.push(cell);
    }
  return out;
}

function normalize(probs) {
  const total = RANK_TYPES.reduce((a, t) => a + (probs[t] || 0), 0);
  if (total <= 0) return probs;
  for (const t of RANK_TYPES) probs[t] = (probs[t] || 0) / total;
  return probs;
}

function createBeliefs(state, viewer) {
  const opponent = opponentOf(viewer);
  const alive = alivePieces(state, opponent);
  // remaining = initial - captured; captured = initial - aliveCountByRank(known where possible)
  // We only *know* ranks of revealed-alive pieces and (implicitly) captured ones.
  // Simple + deterministic: remaining[type] = initial - (#captured of that type).
  // #captured of a type is not directly observable for hidden pieces; use
  // (initial - alive total) spread is unknown, so instead compute:
  //   unknownRemaining[type] = initial[type] - (#revealed-alive of type)
  // and ignore captured hidden pieces' types (they are unknown by definition).
  // To keep probs a proper distribution over *this* piece, also subtract an
  // estimate of captured-known types:
  const revealedAliveByType = {};
  for (const p of alive) if (p.revealed) revealedAliveByType[p.rank] = (revealedAliveByType[p.rank] || 0) + 1;

  // captured-known: walk moveHistory results is not available here; approximate
  // captured-known as 0 (hidden captures unknown; revealed captures rare). This
  // keeps the model simple and deterministic. Higher fidelity is added by
  // applyMoveTells over the game.
  const unknownRemaining = {};
  for (const t of RANK_TYPES)
    unknownRemaining[t] = Math.max(0, INITIAL_COUNTS[t] - (revealedAliveByType[t] || 0));

  const pieces = {};
  for (const p of alive) {
    if (p.revealed) {
      const probs = {};
      for (const t of RANK_TYPES) probs[t] = 0;
      probs[p.rank] = 1;
      pieces[p.id] = { probs, known: p.rank };
    } else {
      const probs = {};
      for (const t of RANK_TYPES) probs[t] = unknownRemaining[t];
      normalize(probs);
      pieces[p.id] = { probs, known: null };
    }
  }
  return { viewer, opponent, pieces };
}

function collapse(entry, rank) {
  for (const t of RANK_TYPES) entry.probs[t] = 0;
  entry.probs[rank] = 1;
  entry.known = rank;
}

function chebyshev(a, b) { return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])); }

function applyMoveTells(beliefs, state, prevState, result, level) {
  const b = {
    viewer: beliefs.viewer, opponent: beliefs.opponent,
    pieces: Object.fromEntries(Object.entries(beliefs.pieces).map(
      ([k, v]) => [k, { probs: { ...v.probs }, known: v.known }]
    )),
  };
  // prune entries for pieces no longer on the board
  const aliveIds = new Set(alivePieces(state, b.opponent).map((p) => p.id));
  for (const id of Object.keys(b.pieces)) if (!aliveIds.has(Number(id))) delete b.pieces[id];
  // add entries for opponent pieces we somehow don't have yet
  for (const p of alivePieces(state, b.opponent)) {
    if (!b.pieces[p.id]) {
      const probs = {};
      for (const t of RANK_TYPES) probs[t] = INITIAL_COUNTS[t];
      normalize(probs);
      b.pieces[p.id] = { probs, known: p.revealed ? p.rank : null };
      if (p.revealed) collapse(b.pieces[p.id], p.rank);
    }
  }

  const mv = result.move;
  if (!mv) return b;
  const moverId = mv.pieceId;
  const entry = b.pieces[moverId];
  const moverBelongsToOpponent =
    prevState.board[mv.from[0]][mv.from[1]]?.owner === b.opponent;

  if (entry && moverBelongsToOpponent && !entry.known) {
    // moved -> not bomb/flag (all levels)
    entry.probs["B"] = 0;
    entry.probs["F"] = 0;
    normalize(entry.probs);
    if (level !== "easy") {
      if (chebyshev(mv.from, mv.to) > 1) collapse(entry, 2);
    }
  }

  if (level !== "easy" && result.combat) {
    const { attacker, defender, outcome } = result.combat;
    // survivor's true rank is in result.combat; collapse the opponent survivor.
    if (outcome === "attacker" && attacker.owner === b.opponent) {
      const surv = b.pieces[attacker.id];
      if (surv) collapse(surv, attacker.rank);
    } else if (outcome === "defender" && defender.owner === b.opponent) {
      const surv = b.pieces[defender.id];
      if (surv) collapse(surv, defender.rank);
    }
  }
  return b;
}

function applyPositionalPrior(beliefs, state, level) {
  if (level !== "hard" && level !== "expert") return beliefs;
  const b = {
    viewer: beliefs.viewer, opponent: beliefs.opponent,
    pieces: Object.fromEntries(Object.entries(beliefs.pieces).map(
      ([k, v]) => [k, { probs: { ...v.probs }, known: v.known }]
    )),
  };
  const backRow = b.opponent === "red" ? 9 : 0;
  for (const p of alivePieces(state, b.opponent)) {
    const entry = b.pieces[p.id];
    if (!entry || entry.known) continue;
    let fFactor = 0.3;
    if (p.row === backRow) fFactor = 3;
    else if (Math.abs(p.row - backRow) === 1) fFactor = 1.2;
    if ((p.col <= 1 || p.col >= 8) && p.row === backRow) fFactor *= 1.5;
    entry.probs["F"] *= fFactor;
    normalize(entry.probs);
  }
  return b;
}

return {
  RANK_TYPES, redactState, createBeliefs, applyMoveTells, applyPositionalPrior,
};
```

Note on `createBeliefs` fidelity: the plan deliberately approximates "captured hidden pieces" as unknown (they are, by definition). `applyMoveTells` refines beliefs as the game progresses. This is sufficient for a deterministic heuristic AI and keeps the model auditable.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/ai-beliefs.test.js`
Expected: all PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add stratego.html test/ai-beliefs.test.js
git commit -m "feat: AI redacted view and rule-based belief model

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuXrGmBunyAQM4hqFf6Pj6"
```

---

### Task 7: AI — leaf evaluation and 1-ply policy (Easy)

**Files:**
- Modify: `stratego.html` (the `<script id="ai">` block)
- Create: `test/ai-eval.test.js`

**Interfaces:**
- Consumes: everything from Task 6, `Engine`, `RNG`.
- Produces:
  - `AI.PIECE_VALUE`: `{10:400, 9:200, 8:100, 7:75, 6:50, 5:35, 4:25, 3:45, 2:15, 1:60, B:20, F:2000}`.
  - `AI.expectedValue(entry): number` — `sum(probs[t] * PIECE_VALUE[t])` for an unknown piece, or `PIECE_VALUE[known]` if known.
  - `AI.evaluate(state, beliefs, forOwner): number` — static score from `forOwner`'s perspective (higher = better for `forOwner`). Terms (each with a small constant weight declared in code):
    - material: `sum(PIECE_VALUE[myPiece.rank])` minus `sum(expectedValue(oppEntry))` over alive pieces.
    - own flag safety: for each enemy piece within Manhattan distance 3 of my flag, subtract `(4 - dist) * 15`; add `10` per own Bomb orthogonally adjacent to my flag.
    - mobility: `+ 0.5 * (#my legal moves)`.
    - flag hunt: `- 2 * (min Manhattan distance from any of my movable pieces to the enemy flag's square if its location is known/high-prob, else to the enemy back row center)`.
    - If `state.winner === forOwner` return `+1e6`; if the opponent won return `-1e6`.
  - `AI.scoreMove(state, beliefs, move, forOwner): number` — apply `move` with `Engine.applyMove`, then return `evaluate(nextState, updatedBeliefsShallow, forOwner)` where `updatedBeliefsShallow` = beliefs after `applyMoveTells` for that result at the current level is *not* required here; pass `beliefs` unchanged for the 1-ply policy (belief update happens between real turns, not inside hypothetical scoring at Easy). For attack moves against an unknown defender, compute the expected score over the belief distribution of the defender's rank: for each possible rank `t` with `probs[t] > threshold(0.02)`, simulate combat outcome by temporarily treating the defender as rank `t`, weight the resulting `evaluate` by `probs[t]`, and sum. (Helper: `AI.expectedMoveScore`.)
  - `AI.chooseMove(state, beliefs, opts): Move` where `opts = { level, rng }`.
    - Redact is the caller's job for the *view*, but `chooseMove` receives the already-redacted state for the AI's opponent's pieces and the AI's own true pieces. It computes `Engine.legalMoves(state, aiOwner)` where `aiOwner = state.turn`.
    - Easy (`level === 'easy'`): score every legal move with `expectedMoveScore`; sort descending; with probability 0.35 pick uniformly among the top `min(5, n)`, otherwise pick the best; ties and the random pick use `opts.rng`. Deterministic given `rng`.
    - For `level !== 'easy'` this task provides a temporary fallback: behave like Easy but always pick argmax (no noise). Task 8 replaces this with search.
    - Never returns a move not in `Engine.legalMoves`. If there are no legal moves, return `null`.

- [ ] **Step 1: Write the failing test — `test/ai-eval.test.js`**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/ai-eval.test.js`
Expected: FAIL (`AI.evaluate is not a function`).

- [ ] **Step 3: Implement — add to the `<script id="ai">` block**

```js
const PIECE_VALUE = { 10:400, 9:200, 8:100, 7:75, 6:50, 5:35, 4:25, 3:45, 2:15, 1:60, B:20, F:2000 };
const W = { flagSafety: 15, bombGuard: 10, mobility: 0.5, flagHunt: 2 };

function expectedValue(entry) {
  if (entry.known != null) return PIECE_VALUE[entry.known];
  let v = 0;
  for (const t of RANK_TYPES) v += (entry.probs[t] || 0) * PIECE_VALUE[t];
  return v;
}

function manhattan(a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); }

function findPiece(state, pred) {
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
      const cell = state.board[r][c];
      if (cell && !cell.lake && pred(cell)) return { piece: cell, row: r, col: c };
    }
  return null;
}

function evaluate(state, beliefs, forOwner) {
  const opp = beliefs.opponent === forOwner ? beliefs.viewer : beliefs.opponent;
  // careful: beliefs are always from beliefs.viewer's perspective about beliefs.opponent.
  // evaluate() needs opponent-of-forOwner. If forOwner === beliefs.viewer, oppEntries = beliefs.pieces.
  // Otherwise we don't have belief data for forOwner's opponent; fall back to true values.
  if (state.winner === forOwner) return 1e6;
  if (state.winner && state.winner !== forOwner) return -1e6;

  const other = forOwner === "red" ? "blue" : "red";
  let score = 0;

  // material
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
      const cell = state.board[r][c];
      if (!cell || cell.lake) continue;
      if (cell.owner === forOwner) {
        score += PIECE_VALUE[cell.rank] ?? 0;
      } else {
        if (forOwner === beliefs.viewer && beliefs.pieces[cell.id]) {
          score -= expectedValue(beliefs.pieces[cell.id]);
        } else {
          score -= PIECE_VALUE[cell.rank] ?? 40;
        }
      }
    }

  // own flag safety
  const myFlag = findPiece(state, (p) => p.owner === forOwner && p.rank === "F");
  if (myFlag) {
    const fp = [myFlag.row, myFlag.col];
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++) {
        const cell = state.board[r][c];
        if (!cell || cell.lake) continue;
        if (cell.owner === other) {
          const d = manhattan([r, c], fp);
          if (d <= 3) score -= (4 - d) * W.flagSafety;
        }
        if (cell.owner === forOwner && cell.rank === "B" &&
            manhattan([r, c], fp) === 1) {
          score += W.bombGuard;
        }
      }
  }

  // mobility
  score += W.mobility * Engine().legalMoves ? 0 : 0; // placeholder replaced below
  score += W.mobility * globalThis.Stratego.Engine.legalMoves(state, forOwner).length;

  // flag hunt
  const enemyFlag = findPiece(state, (p) => p.owner === other && p.rank === "F");
  let target;
  if (enemyFlag) target = [enemyFlag.row, enemyFlag.col];
  else target = [other === "red" ? 9 : 0, 4];
  let best = Infinity;
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
      const cell = state.board[r][c];
      if (cell && !cell.lake && cell.owner === forOwner &&
          cell.rank !== "B" && cell.rank !== "F") {
        best = Math.min(best, manhattan([r, c], target));
      }
    }
  if (best !== Infinity) score -= W.flagHunt * best;

  return score;
}
```

Clean up the mobility placeholder line — keep only:
```js
score += W.mobility * globalThis.Stratego.Engine.legalMoves(state, forOwner).length;
```

Then the move scoring + policy:

```js
function expectedMoveScore(state, beliefs, move, forOwner) {
  const Eng = globalThis.Stratego.Engine;
  if (!move.isAttack) {
    const { state: ns } = Eng.applyMove(state, move);
    return evaluate(ns, beliefs, forOwner);
  }
  const [tr, tc] = move.to;
  const defender = state.board[tr][tc];
  const entry = beliefs.viewer === forOwner ? beliefs.pieces[defender.id] : null;
  if (!entry || entry.known != null) {
    const { state: ns } = Eng.applyMove(state, move);
    return evaluate(ns, beliefs, forOwner);
  }
  let total = 0, wsum = 0;
  for (const t of RANK_TYPES) {
    const p = entry.probs[t] || 0;
    if (p < 0.02) continue;
    const trial = Eng.cloneState(state);
    trial.board[tr][tc].rank = t;
    trial.board[tr][tc].revealed = true; // so applyMove sees a concrete rank
    const { state: ns } = Eng.applyMove(trial, move);
    total += p * evaluate(ns, beliefs, forOwner);
    wsum += p;
  }
  return wsum > 0 ? total / wsum : evaluate(state, beliefs, forOwner);
}

function chooseMove(state, beliefs, opts) {
  const Eng = globalThis.Stratego.Engine;
  const aiOwner = state.turn;
  const legal = Eng.legalMoves(state, aiOwner);
  if (legal.length === 0) return null;
  const level = opts.level || "medium";
  const rng = opts.rng;

  // This task: 1-ply scoring for all levels. Task 8 overrides non-easy.
  const scored = legal.map((m) => ({
    m, s: expectedMoveScore(state, beliefs, m, aiOwner),
  }));
  scored.sort((a, b) => b.s - a.s ||
    a.m.pieceId - b.m.pieceId ||
    (a.m.to[0] - b.m.to[0]) || (a.m.to[1] - b.m.to[1]));

  if (level === "easy" && rng && rng.next() < 0.35) {
    const k = Math.min(5, scored.length);
    return scored[rng.int(k)].m;
  }
  return scored[0].m;
}

// extend the returned object
return {
  RANK_TYPES, redactState, createBeliefs, applyMoveTells, applyPositionalPrior,
  PIECE_VALUE, expectedValue, evaluate, expectedMoveScore, chooseMove,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/ai-eval.test.js`
Expected: all PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add stratego.html test/ai-eval.test.js
git commit -m "feat: AI leaf evaluation and 1-ply move policy

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuXrGmBunyAQM4hqFf6Pj6"
```

---

### Task 8: AI — expectimax search and difficulty tiers

**Files:**
- Modify: `stratego.html` (the `<script id="ai">` block — `chooseMove`)
- Create: `test/ai-search.test.js`

**Interfaces:**
- Consumes: everything from Task 7.
- Produces:
  - `AI.DIFFICULTY`: `{ easy:{depth:1,noise:0.35}, medium:{depth:2,noise:0.1}, hard:{depth:3,noise:0}, expert:{depth:4,noise:0} }`.
  - `AI.NODE_CAP = 20000`.
  - `AI.search(state, beliefs, forOwner, depth, nodeBudget): { score:number, move:Move|null, nodes:number }` — negamax-style expectimax:
    - At `depth === 0` or terminal (`state.winner`) or `nodeBudget.n >= NODE_CAP`: return `{ score: evaluate(state, beliefs, forOwner), move: null }`.
    - Generate `Engine.legalMoves(state, state.turn)`.
    - If `state.turn === forOwner` (MAX): for each move, `childScore = expectimaxApply(...)`; take the max; return best move.
    - Else (opponent, expectation): for each move compute a plausibility weight `w = softmax over -expectedMoveScore(state, beliefs, move, state.turn)` — i.e. the opponent is assumed to somewhat prefer moves good for them; use `w_i = exp(k * normalizedScore_i)` with small `k` (e.g. 0.01) — then return the weighted average child score (weighted by `w`). Do NOT return a move for expectation nodes.
    - Attack moves against unknown defenders: expand a chance node over defender ranks with `probs[t] > 0.02` (cap to top 4 ranks by probability for node budget), each child weighted by renormalized `probs[t]`, defender rank temporarily set as in `expectedMoveScore`.
    - Increment `nodeBudget.n` per node visited.
  - `AI.chooseMove(state, beliefs, opts)` updated:
    - `level = opts.level`; `cfg = DIFFICULTY[level]`.
    - `hard`/`expert`: apply `applyPositionalPrior(beliefs, state, level)` first.
    - Run `search(state, beliefs, aiOwner, cfg.depth, {n:0})`.
    - If the search hit the node cap (returned `nodes >= NODE_CAP` and `move == null` at the root), retry at `depth = 1`.
    - Apply noise: if `cfg.noise > 0` and `opts.rng.next() < cfg.noise`, re-run a 1-ply scoring and pick uniformly among the top `min(5,n)` (as in Task 7 Easy). Otherwise return the search's root move.
    - Still never returns an illegal move; returns `null` only when there are no legal moves.
  - `easy` continues to use the pure 1-ply path from Task 7 (depth 1, noise 0.35) — you may route it through `search` with depth 1 for uniformity, but keep the 0.35 top-5 noise.

- [ ] **Step 1: Write the failing test — `test/ai-search.test.js`**

```js
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
```

Note: if the "one-move trap" test proves flaky against your exact weights, adjust the position (make the recapturing 9 more clearly threatening) rather than weakening the assertion — the point is that depth ≥ 2 sees the recapture.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/ai-search.test.js`
Expected: FAIL (`AI.DIFFICULTY` undefined; trap test fails).

- [ ] **Step 3: Implement — modify the `<script id="ai">` block**

```js
const DIFFICULTY = {
  easy:   { depth: 1, noise: 0.35 },
  medium: { depth: 2, noise: 0.1 },
  hard:   { depth: 3, noise: 0 },
  expert: { depth: 4, noise: 0 },
};
const NODE_CAP = 20000;

function topRanks(entry, k) {
  return RANK_TYPES
    .map((t) => [t, entry.probs[t] || 0])
    .filter(([, p]) => p > 0.02)
    .sort((a, b) => b[1] - a[1])
    .slice(0, k);
}

function search(state, beliefs, forOwner, depth, budget) {
  const Eng = globalThis.Stratego.Engine;
  budget.n++;
  if (depth <= 0 || state.winner || budget.n >= NODE_CAP) {
    return { score: evaluate(state, beliefs, forOwner), move: null, nodes: budget.n };
  }
  const mover = state.turn;
  const legal = Eng.legalMoves(state, mover);
  if (legal.length === 0) {
    return { score: evaluate(state, beliefs, forOwner), move: null, nodes: budget.n };
  }

  const childScore = (move) => {
    // chance expansion for attacks on unknown defenders
    if (move.isAttack) {
      const [tr, tc] = move.to;
      const defender = state.board[tr][tc];
      const entry = beliefs.viewer !== mover ? beliefs.pieces[defender.id] : null;
      if (entry && entry.known == null) {
        const ranks = topRanks(entry, 4);
        const wsum = ranks.reduce((a, [, p]) => a + p, 0) || 1;
        let acc = 0;
        for (const [t, p] of ranks) {
          const trial = Eng.cloneState(state);
          trial.board[tr][tc].rank = t;
          trial.board[tr][tc].revealed = true;
          const { state: ns } = Eng.applyMove(trial, move);
          acc += (p / wsum) * search(ns, beliefs, forOwner, depth - 1, budget).score;
          if (budget.n >= NODE_CAP) break;
        }
        return acc;
      }
    }
    const { state: ns } = Eng.applyMove(state, move);
    return search(ns, beliefs, forOwner, depth - 1, budget).score;
  };

  if (mover === forOwner) {
    let best = -Infinity, bestMove = legal[0];
    const ordered = legal.slice().sort((a, b) =>
      (b.isAttack - a.isAttack) || a.pieceId - b.pieceId);
    for (const m of ordered) {
      const sc = childScore(m);
      if (sc > best || (sc === best &&
          (m.pieceId < bestMove.pieceId))) {
        best = sc; bestMove = m;
      }
      if (budget.n >= NODE_CAP) break;
    }
    return { score: best, move: bestMove, nodes: budget.n };
  }

  // expectation node: weight opponent moves by a mild preference for their own gain
  const raw = legal.map((m) => ({
    m, pref: -expectedMoveScore(state, beliefs, forOwner, forOwner) // placeholder
  }));
  // simpler + deterministic: uniform average, but bias toward attacks & forward moves
  let total = 0, wsum = 0;
  const ordered = legal.slice().sort((a, b) =>
    (b.isAttack - a.isAttack) || a.pieceId - b.pieceId).slice(0, 12);
  for (const m of ordered) {
    const w = m.isAttack ? 2 : 1;
    total += w * childScore(m);
    wsum += w;
    if (budget.n >= NODE_CAP) break;
  }
  return { score: wsum ? total / wsum : evaluate(state, beliefs, forOwner),
           move: null, nodes: budget.n };
}
```

Remove the unused `raw` line (left above only to show the rejected approach — do not include it). The expectation node uses the deterministic weighted average.

Replace `chooseMove` with:

```js
function chooseMove(state, beliefs, opts) {
  const Eng = globalThis.Stratego.Engine;
  const aiOwner = state.turn;
  const legal = Eng.legalMoves(state, aiOwner);
  if (legal.length === 0) return null;
  const level = opts.level || "medium";
  const cfg = DIFFICULTY[level] || DIFFICULTY.medium;
  const rng = opts.rng;

  let b = beliefs;
  if (level === "hard" || level === "expert") {
    b = applyPositionalPrior(beliefs, state, level);
  }

  const onePlyTop = () => {
    const scored = legal.map((m) => ({
      m, s: expectedMoveScore(state, b, m, aiOwner),
    }));
    scored.sort((x, y) => y.s - x.s || x.m.pieceId - y.m.pieceId ||
      (x.m.to[0] - y.m.to[0]) || (x.m.to[1] - y.m.to[1]));
    return scored;
  };

  if (level === "easy") {
    const scored = onePlyTop();
    if (rng && rng.next() < cfg.noise) {
      return scored[Math.min(scored.length, 1) - 1 + 0] // keep deterministic
        , scored[rng.int(Math.min(5, scored.length))].m;
    }
    return scored[0].m;
  }

  const budget = { n: 0 };
  let res = search(state, b, aiOwner, cfg.depth, budget);
  if ((!res.move || budget.n >= NODE_CAP) && cfg.depth > 1) {
    res = search(state, b, aiOwner, 1, { n: 0 });
  }
  let chosen = res.move || onePlyTop()[0].m;

  if (cfg.noise > 0 && rng && rng.next() < cfg.noise) {
    const scored = onePlyTop();
    chosen = scored[rng.int(Math.min(5, scored.length))].m;
  }
  // guarantee legality
  if (!legal.some((x) => x.pieceId === chosen.pieceId &&
      x.to[0] === chosen.to[0] && x.to[1] === chosen.to[1])) {
    chosen = onePlyTop()[0].m;
  }
  return chosen;
}
```

Clean up the stray comma-expression in the `easy` branch — it must read simply:
```js
if (level === "easy") {
  const scored = onePlyTop();
  if (rng && rng.next() < cfg.noise) {
    return scored[rng.int(Math.min(5, scored.length))].m;
  }
  return scored[0].m;
}
```

Extend the returned object with `DIFFICULTY, NODE_CAP, search`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/ai-search.test.js`
Expected: all PASS. If the "trap" test fails, strengthen the test position (not the assertion) so depth-2 clearly sees the recapture, then re-run.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add stratego.html test/ai-search.test.js
git commit -m "feat: AI expectimax search and difficulty tiers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuXrGmBunyAQM4hqFf6Pj6"
```

---

### Task 9: UI — layout, styles, board rendering, and deploy phase

**Files:**
- Modify: `stratego.html` (the `<style>` block and the `<script id="ui">` block)
- Create: `playwright.config.js`
- Create: `e2e/deploy.spec.js`

**Interfaces:**
- Consumes: `Engine`, `RNG`.
- Produces (all on `Stratego.UI`, and a `Stratego.Game` controller object):
  - `Game.state`: `{ phase:'deploy'|'play'|'over', engineState:State|null, beliefs:object|null, rng:RngInstance, seed:number, difficulty:'easy'|'medium'|'hard'|'expert', aiOwner:'blue', humanOwner:'red', deployPlacements: {row,col,rank}[], undoStack: object[], history: string[] }`.
  - `Game.newMatch(difficulty, seed?)` — resets to deploy phase with an empty board, `rng = RNG.create(seed ?? Date.now())`, empty `deployPlacements`.
  - `Game.autoFillDeployment()` — fills every empty human deploy square with the remaining required pieces in a seeded weighted-random arrangement (bombs & flag biased toward back rows/corners via a fixed table; everything else shuffled). Uses `Game.state.rng`.
  - `Game.clearDeployment()` — empties `deployPlacements`.
  - `Game.placeDeploy(row, col, rank)` / `Game.removeDeploy(row, col)` — mutate `deployPlacements` with validation (square in human deploy rows, not already 40 of that rank placed). Returns `{ok, error?}`.
  - `Game.deploymentComplete(): boolean` — true when `Engine.validateSetup(humanOwner, deployPlacements).ok`.
  - `Game.startPlay()` — requires `deploymentComplete()`. Generates the AI's setup via `Game.autoSetupFor(aiOwner)` (same weighted-random logic), calls `Engine.newGame`, sets `phase='play'`, builds `beliefs = AI.createBeliefs(redactedForAI, aiOwner)`. Persists (Task 11).
  - `UI.mount(rootEl)` — renders the whole app into `rootEl` based on `Game.state`; wires all events. Idempotent (safe to call on every state change; it re-renders).
  - `UI.render()` — re-renders from current `Game.state`.
  - Deploy UI: a 10×10 board (only human rows droppable), a tray of undeployed pieces grouped by rank with counts, buttons `Auto-fill`, `Clear`, `Start` (disabled until complete), and a difficulty `<select>` (enabled only in deploy phase). Drag a tray piece to a square to place; drag a placed piece back to the tray (or to another square) to move it; click a placed piece to remove it.
  - Visual style: CSS-drawn "classic tabletop" — a wood-tone board (`linear-gradient` + subtle `repeating-linear-gradient` grain), felt-green lake squares with an inset shadow, pieces as rounded rectangular "tokens" with a raised bevel (`box-shadow`), red vs blue faces, rank number large-centered with the rank name small beneath; opponent hidden pieces show a blank token back (crest via CSS, e.g. a Unicode ⚑/★ watermark). Everything responsive down to ~360px via `min()` sizing on the board.
  - `data-testid` attributes required for e2e: `board`, `cell-r-c` (e.g. `cell-9-0`), `tray-piece-<rank>` (e.g. `tray-piece-B`, `tray-piece-10`), `btn-autofill`, `btn-clear`, `btn-start`, `difficulty-select`, and on tokens `token` plus `token-owner` = `red`/`blue`/`hidden`.

- [ ] **Step 1: Write the failing e2e test — `playwright.config.js` and `e2e/deploy.spec.js`**

`playwright.config.js`:
```js
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "file://" + process.cwd() + "/stratego.html" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
```

`e2e/deploy.spec.js`:
```js
import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const FILE = pathToFileURL(join(process.cwd(), "stratego.html")).href;

test("deploy: auto-fill enables Start and reaches play phase", async ({ page }) => {
  await page.goto(FILE);
  await expect(page.getByTestId("board")).toBeVisible();
  await expect(page.getByTestId("btn-start")).toBeDisabled();

  await page.getByTestId("btn-autofill").click();
  await expect(page.getByTestId("btn-start")).toBeEnabled();

  // human back rows should be full of red tokens
  const redTokens = page.locator('[data-testid="token"][data-owner="red"]');
  await expect(redTokens).toHaveCount(40);

  await page.getByTestId("btn-start").click();

  // play phase: AI pieces present but hidden
  const hidden = page.locator('[data-testid="token"][data-owner="hidden"]');
  await expect(hidden).toHaveCount(40);
});

test("deploy: Clear empties the board", async ({ page }) => {
  await page.goto(FILE);
  await page.getByTestId("btn-autofill").click();
  await page.getByTestId("btn-clear").click();
  await expect(page.locator('[data-testid="token"][data-owner="red"]')).toHaveCount(0);
  await expect(page.getByTestId("btn-start")).toBeDisabled();
});

test("deploy: difficulty select offers four tiers", async ({ page }) => {
  await page.goto(FILE);
  const opts = page.getByTestId("difficulty-select").locator("option");
  await expect(opts).toHaveText([/easy/i, /medium/i, /hard/i, /expert/i]);
});
```

- [ ] **Step 2: Install Playwright chromium and run to verify failure**

Run:
```bash
npm install
npx playwright install chromium
npx playwright test e2e/deploy.spec.js
```
Expected: FAIL (no `board` testid; app not built).

- [ ] **Step 3: Implement the CSS**

In the `<style>` block, add the full stylesheet. Key rules (write them all out; no shorthand "etc."):

```css
:root {
  --board-size: min(92vw, 66vh, 620px);
  --cell: calc(var(--board-size) / 10);
  --wood-1: #6b4a2b; --wood-2: #8a6239; --felt: #1f5c3a;
  --red: #b32b2b; --red-dark: #7d1d1d;
  --blue: #274b8f; --blue-dark: #1b3360;
  --ink: #1c1c1c; --paper: #f2e9d8;
}
* { box-sizing: border-box; }
body { background: #2b2622; color: var(--paper); display: flex;
  justify-content: center; padding: 12px; }
.app { display: grid; gap: 14px; grid-template-columns: minmax(0, auto) 240px;
  align-items: start; }
@media (max-width: 720px) { .app { grid-template-columns: 1fr; } }
.board {
  width: var(--board-size); height: var(--board-size);
  display: grid; grid-template: repeat(10, 1fr) / repeat(10, 1fr);
  border: 6px solid #3c2a18; border-radius: 6px;
  background:
    repeating-linear-gradient(90deg, rgba(0,0,0,.06) 0 2px, transparent 2px 8px),
    linear-gradient(135deg, var(--wood-2), var(--wood-1));
  box-shadow: 0 10px 30px rgba(0,0,0,.5);
}
.cell { position: relative; border: 1px solid rgba(0,0,0,.15); }
.cell.lake { background: var(--felt);
  box-shadow: inset 0 0 12px rgba(0,0,0,.55); }
.cell.deployable { outline: 2px dashed rgba(255,255,255,.25); outline-offset: -3px; }
.cell.legal::after { content: ""; position: absolute; inset: 30%;
  border-radius: 50%; background: rgba(255,255,0,.5); }
.cell.selected { outline: 3px solid #ffd54a; outline-offset: -3px; }
.token {
  position: absolute; inset: 6%; border-radius: 12%;
  display: grid; place-content: center; text-align: center;
  font-weight: 700; cursor: grab; user-select: none;
  box-shadow: 0 3px 0 rgba(0,0,0,.4), inset 0 2px 3px rgba(255,255,255,.25);
}
.token[data-owner="red"] { background: linear-gradient(var(--red), var(--red-dark)); color: #fff; }
.token[data-owner="blue"] { background: linear-gradient(var(--blue), var(--blue-dark)); color: #fff; }
.token[data-owner="hidden"] { background: linear-gradient(#5b4a36, #3c3021); color: transparent; }
.token[data-owner="hidden"]::before { content: "★"; color: rgba(255,255,255,.18);
  font-size: calc(var(--cell) * .5); }
.token .rank { font-size: calc(var(--cell) * .42); line-height: 1; }
.token .name { font-size: calc(var(--cell) * .13); opacity: .85; }
.token.dragging { opacity: .4; }
.panel { background: rgba(0,0,0,.25); border-radius: 8px; padding: 12px;
  display: grid; gap: 10px; }
.tray { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.tray .slot { aspect-ratio: 1; position: relative; background: rgba(255,255,255,.06);
  border-radius: 6px; display: grid; place-content: center; }
.tray .slot[data-count="0"] { opacity: .25; pointer-events: none; }
.tray .count { position: absolute; right: 3px; bottom: 2px; font-size: 11px; }
button { font: inherit; padding: 8px 10px; border-radius: 6px; border: 0;
  background: #d8c9a8; color: #201a12; cursor: pointer; }
button:disabled { opacity: .4; cursor: not-allowed; }
.log { font-size: 12px; max-height: 220px; overflow: auto; display: grid; gap: 2px; }
.banner { position: fixed; inset: 0; display: grid; place-content: center;
  background: rgba(0,0,0,.6); z-index: 10; }
.banner .card { background: var(--paper); color: var(--ink); padding: 24px;
  border-radius: 10px; text-align: center; display: grid; gap: 12px; }
```

- [ ] **Step 4: Implement the `<script id="ui">` block — Game controller + deploy rendering**

Write the module. It defines `Game` and `UI`, and at the end auto-mounts:

```js
const E = () => globalThis.Stratego.Engine;
const A = () => globalThis.Stratego.AI;
const R = () => globalThis.Stratego.RNG;

const RANK_NAME = Object.fromEntries(
  [[10,"Marshal"],[9,"General"],[8,"Colonel"],[7,"Major"],[6,"Captain"],
   [5,"Lieutenant"],[4,"Sergeant"],[3,"Miner"],[2,"Scout"],[1,"Spy"],
   ["B","Bomb"],["F","Flag"]]);
const RANK_ORDER = [10,9,8,7,6,5,4,3,2,1,"B","F"];
const REQUIRED = {10:1,9:1,8:2,7:3,6:4,5:4,4:4,3:5,2:8,1:1,B:6,F:1};

const Game = {
  state: null,
  newMatch(difficulty = "medium", seed) {
    const s = (seed ?? Date.now()) >>> 0;
    Game.state = {
      phase: "deploy", engineState: null, beliefs: null,
      rng: R().create(s), seed: s, difficulty,
      aiOwner: "blue", humanOwner: "red",
      deployPlacements: [], undoStack: [], history: [],
    };
  },
  _weightedArmy(owner, rng) {
    // returns {row,col,rank}[] covering all 40 squares of owner's deploy rows
    const rows = E().deployRows(owner);
    const back = owner === "red" ? rows[rows.length - 1] : rows[0];
    const squares = [];
    for (const row of rows) for (let col = 0; col < 10; col++) squares.push({ row, col });
    // score each square for "flagness": back row + corners highest
    const flagScore = (sq) =>
      (sq.row === back ? 3 : 0) + (sq.col <= 1 || sq.col >= 8 ? 1 : 0);
    const bag = [];
    for (const r of RANK_ORDER) for (let i = 0; i < REQUIRED[r]; i++) bag.push(r);
    // place flag on a high-scoring square (rng among top few)
    const ranked = squares.slice().sort((a, b) => flagScore(b) - flagScore(a));
    const flagSq = ranked[rng.int(Math.min(4, ranked.length))];
    const used = new Set([flagSq.row + "," + flagSq.col]);
    const out = [{ row: flagSq.row, col: flagSq.col, rank: "F" }];
    bag.splice(bag.indexOf("F"), 1);
    // bombs: prefer squares adjacent to the flag / back row
    const bombPref = (sq) =>
      (Math.abs(sq.row - flagSq.row) + Math.abs(sq.col - flagSq.col) === 1 ? 3 : 0) +
      (sq.row === back ? 1 : 0);
    const rest = squares.filter((s) => !used.has(s.row + "," + s.col));
    const bombRanked = rest.slice().sort((a, b) => bombPref(b) - bombPref(a));
    for (let i = 0; i < REQUIRED.B; i++) {
      const sq = bombRanked[i];
      used.add(sq.row + "," + sq.col);
      out.push({ row: sq.row, col: sq.col, rank: "B" });
      bag.splice(bag.indexOf("B"), 1);
    }
    // everything else: shuffle remaining pieces onto remaining squares
    const remainingSquares = rng.shuffle(
      squares.filter((s) => !used.has(s.row + "," + s.col)));
    const remainingBag = rng.shuffle(bag);
    for (let i = 0; i < remainingSquares.length; i++) {
      out.push({ row: remainingSquares[i].row, col: remainingSquares[i].col,
        rank: remainingBag[i] });
    }
    return out;
  },
  autoSetupFor(owner) { return Game._weightedArmy(owner, Game.state.rng); },
  autoFillDeployment() {
    const placed = new Set(Game.state.deployPlacements.map((p) => p.row + "," + p.col));
    const haveByRank = {};
    for (const p of Game.state.deployPlacements)
      haveByRank[p.rank] = (haveByRank[p.rank] || 0) + 1;
    const full = Game._weightedArmy(Game.state.humanOwner, Game.state.rng);
    // keep existing placements; fill empties from `full` skipping ranks already satisfied
    const need = {};
    for (const r of RANK_ORDER) need[r] = REQUIRED[r] - (haveByRank[r] || 0);
    const emptySquares = [];
    for (const row of E().deployRows(Game.state.humanOwner))
      for (let col = 0; col < 10; col++)
        if (!placed.has(row + "," + col)) emptySquares.push({ row, col });
    const fillBag = [];
    for (const r of RANK_ORDER) for (let i = 0; i < Math.max(0, need[r]); i++) fillBag.push(r);
    // bias flag/bombs using the same idea as _weightedArmy but only over empties
    const back = Game.state.humanOwner === "red" ? 9 : 0;
    emptySquares.sort((a, b) =>
      ((b.row === back) - (a.row === back)) ||
      ((b.col <= 1 || b.col >= 8) - (a.col <= 1 || a.col >= 8)));
    const shuffledBag = Game.state.rng.shuffle(fillBag)
      .sort((a, b) => (b === "F") - (a === "F") || (b === "B") - (a === "B"));
    for (let i = 0; i < emptySquares.length; i++) {
      Game.state.deployPlacements.push({
        row: emptySquares[i].row, col: emptySquares[i].col, rank: shuffledBag[i],
      });
    }
  },
  clearDeployment() { Game.state.deployPlacements = []; },
  placeDeploy(row, col, rank) {
    const rows = new Set(E().deployRows(Game.state.humanOwner));
    if (!rows.has(row)) return { ok: false, error: "outside deploy zone" };
    const have = Game.state.deployPlacements.filter((p) => p.rank === rank).length;
    if (have >= REQUIRED[rank]) return { ok: false, error: "no more of that rank" };
    Game.removeDeploy(row, col);
    Game.state.deployPlacements.push({ row, col, rank });
    return { ok: true };
  },
  removeDeploy(row, col) {
    Game.state.deployPlacements = Game.state.deployPlacements.filter(
      (p) => !(p.row === row && p.col === col));
  },
  deployPieceAt(row, col) {
    return Game.state.deployPlacements.find((p) => p.row === row && p.col === col) || null;
  },
  deploymentComplete() {
    return E().validateSetup(Game.state.humanOwner, Game.state.deployPlacements).ok;
  },
  startPlay() {
    if (!Game.deploymentComplete()) return;
    const ai = Game.autoSetupFor(Game.state.aiOwner);
    const red = Game.state.deployPlacements;
    Game.state.engineState = Game.state.humanOwner === "red"
      ? E().newGame(red, ai) : E().newGame(ai, red);
    Game.state.phase = "play";
    const view = A().redactState(Game.state.engineState, Game.state.aiOwner);
    Game.state.beliefs = A().createBeliefs(view, Game.state.aiOwner);
    Game.state.history.push("Game started (" + Game.state.difficulty + ")");
    if (globalThis.Stratego.UI.persist) globalThis.Stratego.UI.persist();
  },
};

// ---------- rendering ----------
let ROOT = null;

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  for (const kid of kids) if (kid != null) n.append(kid);
  return n;
}

function tokenEl(rank, owner, opts = {}) {
  const shown = opts.hidden ? "hidden" : owner;
  const t = el("div", {
    class: "token" + (opts.dragging ? " dragging" : ""),
    "data-testid": "token", "data-owner": shown,
    draggable: opts.draggable ? "true" : null,
  });
  if (!opts.hidden) {
    t.append(el("span", { class: "rank", text: String(rank) }));
    t.append(el("span", { class: "name", text: RANK_NAME[rank] }));
  }
  return t;
}

function renderDeploy() {
  const g = Game.state;
  const board = el("div", { class: "board", "data-testid": "board" });
  const deployRows = new Set(E().deployRows(g.humanOwner));
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const cell = el("div", {
        class: "cell" + (E().isLake(r, c) ? " lake" : "") +
               (deployRows.has(r) ? " deployable" : ""),
        "data-testid": `cell-${r}-${c}`,
      });
      if (deployRows.has(r)) {
        cell.addEventListener("dragover", (e) => e.preventDefault());
        cell.addEventListener("drop", (e) => {
          e.preventDefault();
          const rank = e.dataTransfer.getData("text/rank");
          const fromSq = e.dataTransfer.getData("text/from");
          if (fromSq) {
            const [fr, fc] = fromSq.split(",").map(Number);
            const moving = Game.deployPieceAt(fr, fc);
            Game.removeDeploy(fr, fc);
            Game.placeDeploy(r, c, moving.rank);
          } else if (rank) {
            Game.placeDeploy(r, c, rank === "B" || rank === "F" ? rank : Number(rank));
          }
          UI.render();
        });
      }
      const dp = Game.deployPieceAt(r, c);
      if (dp) {
        const t = tokenEl(dp.rank, g.humanOwner, { draggable: true });
        t.addEventListener("dragstart", (e) =>
          e.dataTransfer.setData("text/from", r + "," + c));
        t.addEventListener("click", () => { Game.removeDeploy(r, c); UI.render(); });
        cell.append(t);
      }
      board.append(cell);
    }
  }

  const haveByRank = {};
  for (const p of g.deployPlacements) haveByRank[p.rank] = (haveByRank[p.rank] || 0) + 1;
  const tray = el("div", { class: "tray" });
  for (const rank of RANK_ORDER) {
    const left = REQUIRED[rank] - (haveByRank[rank] || 0);
    const slot = el("div", { class: "slot", "data-count": String(left),
      "data-testid": `tray-piece-${rank}` });
    const t = tokenEl(rank, g.humanOwner, { draggable: left > 0 });
    t.addEventListener("dragstart", (e) =>
      e.dataTransfer.setData("text/rank", String(rank)));
    slot.append(t, el("span", { class: "count", text: `x${left}` }));
    tray.append(slot);
  }

  const diff = el("select", { "data-testid": "difficulty-select",
    onchange: (e) => { Game.state.difficulty = e.target.value; } });
  for (const d of ["easy", "medium", "hard", "expert"]) {
    const o = el("option", { value: d, text: d[0].toUpperCase() + d.slice(1) });
    if (d === g.difficulty) o.selected = true;
    diff.append(o);
  }

  const panel = el("div", { class: "panel" },
    el("strong", { text: "Deploy your army" }),
    diff,
    tray,
    el("button", { "data-testid": "btn-autofill",
      onclick: () => { Game.autoFillDeployment(); UI.render(); } , text: "Auto-fill" }),
    el("button", { "data-testid": "btn-clear",
      onclick: () => { Game.clearDeployment(); UI.render(); }, text: "Clear" }),
    el("button", { "data-testid": "btn-start", disabled: Game.deploymentComplete() ? null : "true",
      onclick: () => { Game.startPlay(); UI.render(); }, text: "Start" }),
  );

  ROOT.replaceChildren(el("div", { class: "app" }, board, panel));
}

const UI = {
  mount(root) { ROOT = root; UI.render(); },
  render() {
    if (!Game.state) Game.newMatch();
    if (Game.state.phase === "deploy") return renderDeploy();
    if (Game.state.phase === "play" || Game.state.phase === "over")
      return globalThis.Stratego.UI._renderPlay();  // Task 10
  },
  _renderPlay() { /* Task 10 */ },
};

// auto-mount when in a browser
if (typeof document !== "undefined") {
  const boot = () => {
    const root = document.getElementById("app");
    if (!Game.state) {
      if (!(globalThis.Stratego.UI.tryRestore && globalThis.Stratego.UI.tryRestore()))
        Game.newMatch();
    }
    UI.mount(root);
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
}

return { UI, Game, get _game() { return Game; } };
```

Wait — `UI` is referenced before assignment inside `renderDeploy`'s closures. Since those run later (on events), `const UI` is assigned by then. But `renderDeploy` also calls `UI.render()`; ensure `renderDeploy` is only invoked via `UI.render()` after `UI` exists. It is (auto-mount runs after module eval). Keep the `return` object exposing `UI` and `Game`.

Also expose `UI` and `Game` on the namespace explicitly for Task 10/11 and tests:
```js
globalThis.Stratego.UI = UI;
globalThis.Stratego.Game = Game;
return { UI, Game };
```
(Replace the IIFE's trailing assignment accordingly — the `<script id="ui">` wrapper assigns `globalThis.Stratego.UI = (function(){...})()`, so also set `globalThis.Stratego.Game` inside.)

- [ ] **Step 5: Run the e2e test to verify it passes**

Run: `npx playwright test e2e/deploy.spec.js`
Expected: all 3 tests PASS.

- [ ] **Step 6: Run the unit suite (must be unaffected)**

Run: `npm test`
Expected: all PASS (harness only loads `rng`/`engine`/`ai`).

- [ ] **Step 7: Commit**

```bash
git add stratego.html playwright.config.js e2e/ package.json package-lock.json
git commit -m "feat: UI shell, tabletop styling, and deploy phase

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuXrGmBunyAQM4hqFf6Pj6"
```

---

### Task 10: UI — play phase: moves, AI turns, combat animation, trays, history

**Files:**
- Modify: `stratego.html` (the `<script id="ui">` block — implement `_renderPlay` and turn flow; add animation CSS)
- Create: `e2e/play.spec.js`

**Interfaces:**
- Consumes: Task 9 (`Game`, `UI`, `tokenEl`, `el`), `Engine`, `AI`, `RNG`.
- Produces:
  - `Game.selected`: `{row,col} | null` — currently selected human piece.
  - `Game.selectPiece(row,col)` — if `phase==='play'`, `engineState.turn===humanOwner`, and the square holds a human movable piece, set `selected` and compute `Game.legalTargets = Engine.movesForPiece(engineState, row, col)`. Clicking the same piece or an illegal square clears selection.
  - `Game.humanMove(toRow,toCol)` — if a `selected` piece has a legal move to `(toRow,toCol)`:
    1. push a deep snapshot to `undoStack` (bounded to 10): `{engineState: Engine.cloneState(...), beliefs: structuredCloneBeliefs(...), rngState: rng.state(), history: [...]}`.
    2. `const prev = engineState; ({state: engineState, result} = Engine.applyMove(engineState, move))`.
    3. append a history line (see `describeMove`).
    4. update AI beliefs: `beliefs = AI.applyMoveTells(beliefs, engineState, prev, result, difficulty)` (human piece moved — tells about the human).
    5. if game over -> `phase='over'`. else -> schedule `Game.aiTurn()`.
    6. persist.
  - `Game.aiTurn()` — after a short delay (`AI_THINK_MS = 450`, real `setTimeout`; in tests it still resolves):
    1. `view = AI.redactState(engineState, aiOwner)`.
    2. `move = AI.chooseMove(view, beliefs, { level: difficulty, rng })`.
    3. if `move === null` -> opponent (human) already won via no-moves; set over.
    4. `prev = engineState; ({state, result} = Engine.applyMove(engineState, move))`.
    5. history line; `beliefs = AI.applyMoveTells(beliefs, engineState, prev, result, difficulty)` — NOTE: after the AI's own move, the "opponent" in `beliefs` is still the human, and the mover is the AI, so `applyMoveTells` will see `moverBelongsToOpponent === false` and only prune/add entries. That's correct: the AI learns nothing new about the human from its own move except via combat, which `applyMoveTells` already handles by collapsing a surviving opponent piece. Keep the call.
    6. `phase='over'` if game over; persist; `UI.render()`.
  - `describeMove(result, perspective): string` — e.g. `"Red Scout b7→b3"` or `"Blue ? ×Red Major (Red Major wins)"`; use algebraic-ish `col=letter a–j`, `row=1–10` with row 1 = red's back row (row index 9). Hidden pieces shown as `?` unless revealed by the combat.
  - `_renderPlay()` renders: board with tokens (human pieces full, AI pieces hidden unless `revealed`), selection highlight + legal-target dots, a right panel with: turn indicator, `New Game` button, `Resign` button, `Undo` button (disabled when `undoStack` empty or `phase==='over'` — undo pops one snapshot, restoring `engineState`, `beliefs`, `rng` via `RNG.fromState`, `history`; it reverts the AI reply and the human move together, i.e. pop once since a snapshot is taken only before the human move and the AI move happens in the same turn cycle — so one pop rewinds both), two captured-piece trays (`captured-red`, `captured-blue`) listing lost pieces by rank with counts, and the move-history `log`.
  - Combat animation: when `result.combat` exists, before re-rendering the resolved board, briefly show both combatants face-up on the contested square with a CSS `.reveal` pulse for `COMBAT_MS = 900`, then render the resolved state. Implement by rendering an overlay element; acceptable simplification for tests: still resolve synchronously but add a `data-combat` attribute for the duration.
  - `data-testid` additions: `turn-indicator` (text contains `Your turn` / `Computer thinking`), `btn-newgame`, `btn-resign`, `btn-undo`, `captured-red`, `captured-blue`, `move-log`, and cells keep `cell-r-c`. Tokens keep `token` + `data-owner`.
  - `structuredCloneBeliefs(beliefs)` helper: deep copy `{viewer, opponent, pieces:{id:{probs:{...}, known}}}`.

- [ ] **Step 1: Write the failing e2e test — `e2e/play.spec.js`**

```js
import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const FILE = pathToFileURL(join(process.cwd(), "stratego.html")).href;

async function startGame(page, difficulty = "easy") {
  await page.goto(FILE);
  await page.getByTestId("difficulty-select").selectOption(difficulty);
  await page.getByTestId("btn-autofill").click();
  await page.getByTestId("btn-start").click();
  await expect(page.getByTestId("turn-indicator")).toContainText(/your turn/i);
}

test("human can select a front-row piece and see legal targets", async ({ page }) => {
  await startGame(page);
  // red front row is row index 6 -> cell-6-c. Find one with a token.
  const cell = page.locator('[data-testid^="cell-6-"]').filter({
    has: page.locator('[data-testid="token"]'),
  }).first();
  await cell.click();
  await expect(page.locator(".cell.legal")).not.toHaveCount(0);
});

test("making a move triggers the computer to reply", async ({ page }) => {
  await startGame(page);
  const from = page.locator('[data-testid="cell-6-0"]');
  await from.click();
  // advancing to row 5 (cell-5-0) should be legal from the front row
  await page.locator('[data-testid="cell-5-0"]').click();
  // after the AI replies the turn returns to the human, and the move log grows
  await expect(page.getByTestId("move-log")).toContainText(/→/);
  await expect(page.getByTestId("turn-indicator")).toContainText(/your turn/i, { timeout: 5000 });
});

test("Undo restores the previous position", async ({ page }) => {
  await startGame(page);
  await page.locator('[data-testid="cell-6-0"]').click();
  await page.locator('[data-testid="cell-5-0"]').click();
  await expect(page.getByTestId("turn-indicator")).toContainText(/your turn/i, { timeout: 5000 });
  const logBefore = await page.getByTestId("move-log").innerText();
  await page.getByTestId("btn-undo").click();
  const logAfter = await page.getByTestId("move-log").innerText();
  expect(logAfter.length).toBeLessThan(logBefore.length);
  // the piece is back on its start square
  await expect(page.locator('[data-testid="cell-6-0"] [data-testid="token"]')).toBeVisible();
});

test("New Game returns to the deploy screen", async ({ page }) => {
  await startGame(page);
  await page.getByTestId("btn-newgame").click();
  await expect(page.getByTestId("btn-autofill")).toBeVisible();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx playwright test e2e/play.spec.js`
Expected: FAIL (`turn-indicator` missing; `_renderPlay` is a stub).

- [ ] **Step 3: Add animation CSS to the `<style>` block**

```css
.token.reveal { animation: pulse .9s ease-in-out; z-index: 5; }
@keyframes pulse {
  0% { transform: scale(1); }
  30% { transform: scale(1.15); box-shadow: 0 0 0 4px #ffd54a; }
  100% { transform: scale(1); }
}
.cell[data-combat="1"] { outline: 3px solid #ffd54a; outline-offset: -3px; }
.turn { font-weight: 700; }
.captured { display: flex; flex-wrap: wrap; gap: 3px; font-size: 12px; }
```

- [ ] **Step 4: Implement `_renderPlay` and the turn flow in the `<script id="ui">` block**

Add helpers and replace `UI._renderPlay`. Key code (write it all; no elisions):

```js
const AI_THINK_MS = 450;
const COMBAT_MS = 900;
const COLS_LABEL = "abcdefghij";

function sqName(r, c) {
  // row 9 (red back) shown as rank 1
  return COLS_LABEL[c] + String(10 - r);
}

function structuredCloneBeliefs(b) {
  return {
    viewer: b.viewer, opponent: b.opponent,
    pieces: Object.fromEntries(Object.entries(b.pieces).map(
      ([k, v]) => [k, { probs: { ...v.probs }, known: v.known }])),
  };
}

function describeMove(result, prevState) {
  const m = result.move;
  const from = prevState.board[m.from[0]][m.from[1]];
  const side = from.owner === "red" ? "Red" : "Blue";
  const nm = from.owner === Game.state.humanOwner
    ? RANK_NAME[from.rank]
    : (from.revealed ? RANK_NAME[from.rank] : "?");
  let line = `${side} ${nm} ${sqName(...m.from)}→${sqName(...m.to)}`;
  if (result.combat) {
    const { attacker, defender, outcome } = result.combat;
    const dn = RANK_NAME[defender.rank];
    const an = RANK_NAME[attacker.rank];
    const verdict = outcome === "attacker" ? `${an} wins`
      : outcome === "defender" ? `${dn} wins` : "both lost";
    line += `  ⚔ vs ${dn} — ${verdict}`;
  }
  return line;
}

Game.selected = null;
Game.legalTargets = [];

Game.selectPiece = function (r, c) {
  const g = Game.state;
  if (g.phase !== "play" || g.engineState.turn !== g.humanOwner) return;
  const p = E().pieceAt(g.engineState, r, c);
  if (!p || p.owner !== g.humanOwner) { Game.selected = null; Game.legalTargets = []; return; }
  if (Game.selected && Game.selected.row === r && Game.selected.col === c) {
    Game.selected = null; Game.legalTargets = [];
    return;
  }
  Game.selected = { row: r, col: c };
  Game.legalTargets = E().movesForPiece(g.engineState, r, c);
};

Game.humanMove = function (tr, tc) {
  const g = Game.state;
  if (!Game.selected) return;
  const move = Game.legalTargets.find((m) => m.to[0] === tr && m.to[1] === tc);
  if (!move) { Game.selected = null; Game.legalTargets = []; UI.render(); return; }
  g.undoStack.push({
    engineState: E().cloneState(g.engineState),
    beliefs: structuredCloneBeliefs(g.beliefs),
    rngState: g.rng.state(),
    history: g.history.slice(),
  });
  if (g.undoStack.length > 10) g.undoStack.shift();
  const prev = g.engineState;
  const { state, result } = E().applyMove(g.engineState, move);
  g.engineState = state;
  g.history.push(describeMove(result, prev));
  g.beliefs = A().applyMoveTells(g.beliefs, g.engineState, prev, result, g.difficulty);
  Game.selected = null; Game.legalTargets = [];
  Game._lastCombat = result.combat ? result.combat.square : null;
  if (g.engineState.winner) { g.phase = "over"; UI.persist && UI.persist(); UI.render(); return; }
  UI.render();
  setTimeout(Game.aiTurn, AI_THINK_MS);
};

Game.aiTurn = function () {
  const g = Game.state;
  if (g.phase !== "play" || g.engineState.turn !== g.aiOwner) return;
  const view = A().redactState(g.engineState, g.aiOwner);
  const move = A().chooseMove(view, g.beliefs, { level: g.difficulty, rng: g.rng });
  if (!move) { g.phase = "over"; UI.render(); return; }
  const prev = g.engineState;
  const { state, result } = E().applyMove(g.engineState, move);
  g.engineState = state;
  g.history.push(describeMove(result, prev));
  g.beliefs = A().applyMoveTells(g.beliefs, g.engineState, prev, result, g.difficulty);
  Game._lastCombat = result.combat ? result.combat.square : null;
  if (g.engineState.winner) g.phase = "over";
  UI.persist && UI.persist();
  UI.render();
};

Game.undo = function () {
  const g = Game.state;
  if (!g.undoStack.length || g.phase === "over") return;
  const snap = g.undoStack.pop();
  g.engineState = snap.engineState;
  g.beliefs = snap.beliefs;
  g.rng = R().fromState(snap.rngState);
  g.history = snap.history;
  Game.selected = null; Game.legalTargets = [];
  g.phase = "play";
  UI.persist && UI.persist();
  UI.render();
};

Game.resign = function () {
  const g = Game.state;
  g.engineState.winner = g.aiOwner;
  g.engineState.winReason = "resign";
  g.phase = "over";
  UI.persist && UI.persist();
  UI.render();
};

function capturedByRank(engineState, owner) {
  const alive = {};
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const cell = engineState.board[r][c];
    if (cell && !cell.lake && cell.owner === owner)
      alive[cell.rank] = (alive[cell.rank] || 0) + 1;
  }
  const lost = [];
  for (const rank of RANK_ORDER) {
    const gone = REQUIRED[rank] - (alive[rank] || 0);
    for (let i = 0; i < gone; i++) lost.push(rank);
  }
  return lost;
}

UI._renderPlay = function () {
  const g = Game.state;
  const es = g.engineState;
  const board = el("div", { class: "board", "data-testid": "board" });
  const targetSet = new Set(Game.legalTargets.map((m) => m.to[0] + "," + m.to[1]));
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const lake = E().isLake(r, c);
    const isSel = Game.selected && Game.selected.row === r && Game.selected.col === c;
    const cell = el("div", {
      class: "cell" + (lake ? " lake" : "") +
             (targetSet.has(r + "," + c) ? " legal" : "") +
             (isSel ? " selected" : ""),
      "data-testid": `cell-${r}-${c}`,
      "data-combat": Game._lastCombat &&
        Game._lastCombat[0] === r && Game._lastCombat[1] === c ? "1" : null,
      onclick: () => {
        if (g.phase !== "play") return;
        if (targetSet.has(r + "," + c)) Game.humanMove(r, c);
        else { Game.selectPiece(r, c); UI.render(); }
      },
    });
    const p = E().pieceAt(es, r, c);
    if (p) {
      const hidden = p.owner === g.aiOwner && !p.revealed && g.phase === "play";
      cell.append(tokenEl(p.rank, p.owner, { hidden }));
    }
    board.append(cell);
  }

  const turnText = es.winner
    ? "Game over"
    : es.turn === g.humanOwner ? "Your turn" : "Computer thinking…";
  const panel = el("div", { class: "panel" },
    el("div", { class: "turn", "data-testid": "turn-indicator", text: turnText }),
    el("button", { "data-testid": "btn-undo",
      disabled: (!g.undoStack.length || g.phase === "over") ? "true" : null,
      onclick: Game.undo, text: "Undo" }),
    el("button", { "data-testid": "btn-resign",
      disabled: g.phase === "over" ? "true" : null,
      onclick: Game.resign, text: "Resign" }),
    el("button", { "data-testid": "btn-newgame",
      onclick: () => { Game.newMatch(g.difficulty); UI.render(); }, text: "New Game" }),
    el("div", { text: "Your losses" }),
    el("div", { class: "captured", "data-testid": `captured-${g.humanOwner}` },
      ...capturedByRank(es, g.humanOwner).map((rk) =>
        el("span", { text: String(rk) }))),
    el("div", { text: "Computer losses" }),
    el("div", { class: "captured", "data-testid": `captured-${g.aiOwner}` },
      ...capturedByRank(es, g.aiOwner).map((rk) => el("span", { text: String(rk) }))),
    el("div", { class: "log", "data-testid": "move-log" },
      ...g.history.slice(-40).map((line) => el("div", { text: line }))),
  );

  const wrap = el("div", { class: "app" }, board, panel);
  if (es.winner && g.phase === "over") {
    const who = es.winner === g.humanOwner ? "You win!" : "Computer wins";
    wrap.append(el("div", { class: "banner" },
      el("div", { class: "card" },
        el("h2", { text: who }),
        el("div", { text: "Reason: " + (es.winReason || "") }),
        el("button", { onclick: () => { Game.newMatch(g.difficulty); UI.render(); },
          text: "Play again" }))));
  }
  ROOT.replaceChildren(wrap);

  // clear the combat highlight after a beat
  if (Game._lastCombat) {
    const sq = Game._lastCombat;
    Game._lastCombat = null;
    setTimeout(() => {
      const cellEl = ROOT.querySelector(`[data-testid="cell-${sq[0]}-${sq[1]}"]`);
      if (cellEl) cellEl.removeAttribute("data-combat");
    }, COMBAT_MS);
  }
};
```

- [ ] **Step 5: Run the e2e play test**

Run: `npx playwright test e2e/play.spec.js`
Expected: all PASS.

- [ ] **Step 6: Run everything**

Run: `npm test && npx playwright test`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add stratego.html e2e/play.spec.js
git commit -m "feat: UI play phase, AI turns, combat animation, trays, history

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuXrGmBunyAQM4hqFf6Pj6"
```

---

### Task 11: UI — save/resume persistence and end-to-end polish

**Files:**
- Modify: `stratego.html` (the `<script id="ui">` block — persistence)
- Create: `e2e/persist.spec.js`

**Interfaces:**
- Consumes: everything.
- Produces:
  - `UI.SAVE_KEY = "stratego.save.v1"`.
  - `UI.persist()` — serialize `{ version:1, phase, difficulty, seed, rngState: rng.state(), humanOwner, aiOwner, deployPlacements, engineState, beliefs, history, undoStack: undoStack.slice(-5).map(serializeSnapshot) }` to `localStorage[SAVE_KEY]`. Wrap in `try/catch`; ignore failures. Called after `startPlay`, `humanMove` (before AI), `aiTurn`, `undo`, `resign`.
  - `UI.tryRestore(): boolean` — read + `JSON.parse` `localStorage[SAVE_KEY]`; if present, `version === 1`, and shape valid, rebuild `Game.state` (recreate `rng` via `RNG.fromState(rngState)`, snapshots re-hydrated), set it, return `true`. On any error: `localStorage.removeItem(SAVE_KEY)`, return `false`.
  - `UI.clearSave()` — `localStorage.removeItem(SAVE_KEY)`; called by `Game.newMatch`.
  - Boot logic (already stubbed in Task 9): on load, if `tryRestore()` succeeds and the restored `phase` is `play`, show the board directly; if `phase` was `deploy` or restore fails, show deploy. Add a small "Resume game" vs "New game" prompt only when a *playable* save exists: render a banner on boot offering both; "New game" calls `Game.newMatch` + `clearSave`.
  - `engineState` and `beliefs` are plain JSON-serializable objects already (no functions, no class instances) — verify: `board` cells are plain objects, `pieceMoveLog` is a plain map. `rng` is the only non-serializable field and is handled via `rngState`.
  - `serializeSnapshot(snap)` = `{ engineState: snap.engineState, beliefs: snap.beliefs, rngState: snap.rngState, history: snap.history }` (already plain). `hydrateSnapshot` is the identity plus nothing (kept as a named function for symmetry / future-proofing).

- [ ] **Step 1: Write the failing e2e test — `e2e/persist.spec.js`**

```js
import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const FILE = pathToFileURL(join(process.cwd(), "stratego.html")).href;

test("a game in progress survives a reload", async ({ page }) => {
  await page.goto(FILE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("difficulty-select").selectOption("easy");
  await page.getByTestId("btn-autofill").click();
  await page.getByTestId("btn-start").click();
  await page.locator('[data-testid="cell-6-0"]').click();
  await page.locator('[data-testid="cell-5-0"]').click();
  await expect(page.getByTestId("turn-indicator")).toContainText(/your turn/i, { timeout: 5000 });
  const logBefore = await page.getByTestId("move-log").innerText();

  await page.reload();
  // resume prompt appears; choose resume
  await page.getByRole("button", { name: /resume/i }).click();
  await expect(page.getByTestId("move-log")).toHaveText(logBefore);
});

test("New game from the resume prompt wipes the save", async ({ page }) => {
  await page.goto(FILE);
  await page.getByTestId("difficulty-select").selectOption("easy");
  await page.getByTestId("btn-autofill").click();
  await page.getByTestId("btn-start").click();
  await page.reload();
  await page.getByRole("button", { name: /new game/i }).click();
  await expect(page.getByTestId("btn-autofill")).toBeVisible();
  await page.reload();
  // no resume prompt this time
  await expect(page.getByRole("button", { name: /resume/i })).toHaveCount(0);
});

test("corrupt save is discarded without crashing", async ({ page }) => {
  await page.goto(FILE);
  await page.evaluate(() => localStorage.setItem("stratego.save.v1", "{not json"));
  await page.reload();
  await expect(page.getByTestId("btn-autofill")).toBeVisible();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx playwright test e2e/persist.spec.js`
Expected: FAIL (no resume prompt; `UI.persist` undefined).

- [ ] **Step 3: Implement persistence in the `<script id="ui">` block**

```js
UI.SAVE_KEY = "stratego.save.v1";

function serializeSnapshot(snap) {
  return {
    engineState: snap.engineState, beliefs: snap.beliefs,
    rngState: snap.rngState, history: snap.history,
  };
}
function hydrateSnapshot(s) { return { ...s }; }

UI.persist = function () {
  const g = Game.state;
  if (!g) return;
  try {
    const payload = {
      version: 1, phase: g.phase, difficulty: g.difficulty, seed: g.seed,
      rngState: g.rng.state(), humanOwner: g.humanOwner, aiOwner: g.aiOwner,
      deployPlacements: g.deployPlacements, engineState: g.engineState,
      beliefs: g.beliefs, history: g.history,
      undoStack: g.undoStack.slice(-5).map(serializeSnapshot),
    };
    localStorage.setItem(UI.SAVE_KEY, JSON.stringify(payload));
  } catch (e) { /* ignore quota / disabled storage */ }
};

UI.clearSave = function () {
  try { localStorage.removeItem(UI.SAVE_KEY); } catch (e) {}
};

UI.tryRestore = function () {
  let raw;
  try { raw = localStorage.getItem(UI.SAVE_KEY); } catch (e) { return false; }
  if (!raw) return false;
  try {
    const d = JSON.parse(raw);
    if (d.version !== 1 || !d.phase) throw new Error("bad version");
    Game.state = {
      phase: d.phase, engineState: d.engineState, beliefs: d.beliefs,
      rng: R().fromState(d.rngState >>> 0), seed: d.seed, difficulty: d.difficulty,
      aiOwner: d.aiOwner || "blue", humanOwner: d.humanOwner || "red",
      deployPlacements: d.deployPlacements || [],
      undoStack: (d.undoStack || []).map(hydrateSnapshot),
      history: d.history || [],
    };
    Game.selected = null; Game.legalTargets = [];
    return true;
  } catch (e) {
    UI.clearSave();
    return false;
  }
};
```

Update `Game.newMatch` to call `UI.clearSave()` at the end (guard: `if (globalThis.Stratego.UI && globalThis.Stratego.UI.clearSave) globalThis.Stratego.UI.clearSave();`).

Add `UI.persist()` calls in `startPlay` (already referenced), `humanMove` (after belief update, before `setTimeout`), `aiTurn` (already), `undo` (already), `resign` (already). Ensure `startPlay`'s persist guard now resolves since `UI.persist` exists.

Replace the boot logic with a resume prompt:

```js
UI.boot = function () {
  ROOT = document.getElementById("app");
  const restored = UI.tryRestore();
  if (restored && Game.state.phase === "play") {
    UI.renderResumePrompt();
  } else {
    if (!restored) Game.newMatch();
    UI.render();
  }
};

UI.renderResumePrompt = function () {
  const wrap = el("div", { class: "banner" },
    el("div", { class: "card" },
      el("h2", { text: "Game in progress" }),
      el("button", { onclick: () => { UI.render(); }, text: "Resume game" }),
      el("button", { onclick: () => {
        const d = Game.state.difficulty;
        Game.newMatch(d); UI.clearSave(); UI.render();
      }, text: "New game" })));
  ROOT.replaceChildren(wrap);
};
```

Wire boot: replace the earlier `boot`/`DOMContentLoaded` block from Task 9 with:
```js
if (typeof document !== "undefined") {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", UI.boot);
  else UI.boot();
}
```

- [ ] **Step 4: Run the persistence e2e test**

Run: `npx playwright test e2e/persist.spec.js`
Expected: all PASS.

- [ ] **Step 5: Full regression**

Run: `npm test && npx playwright test`
Expected: ALL tests PASS across `test/` and `e2e/`.

- [ ] **Step 6: Manual smoke via the `run` skill / browser**

Open `stratego.html`, play a full game at each difficulty, confirm: deploy drag-and-drop works, AI responds within ~0.5s, combat animation shows, captured trays update, undo works, reload resumes, flag capture and no-moves both end the game with the banner.

- [ ] **Step 7: Update README "Status" and "Running" sections**

Change Status to `Playable. Four difficulty tiers.` and confirm the Running instructions ("open `stratego.html`") and testing commands (`npm test`, `npx playwright test`) are accurate.

- [ ] **Step 8: Commit**

```bash
git add stratego.html e2e/persist.spec.js README.md
git commit -m "feat: save/resume persistence and resume prompt

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GuXrGmBunyAQM4hqFf6Pj6"
```

---

## Self-Review

**1. Spec coverage:**

| Spec section | Task(s) |
|---|---|
| Single-file delivery, no runtime deps | 1 (skeleton), enforced throughout |
| Rules: board/lakes/counts | 2 |
| Rules: movement, scout slides, immovable | 3 |
| Rules: combat table + all specials | 4 (`resolveCombat`) |
| Rules: reveal on surviving combat | 4 |
| Win: flag capture, no legal moves | 4 |
| Two-squares rule | 5 |
| Seeded RNG, resumable state | 1 |
| AI redacted view (no peeking) | 6 (`redactState`), 10 (`aiTurn` uses it) |
| AI belief model + all update rules | 6 |
| Positional priors (hard/expert only) | 6 (`applyPositionalPrior`), 8 (applied in `chooseMove`) |
| AI leaf evaluation | 7 |
| Expectimax search + chance nodes | 8 |
| Difficulty tiers (depth/belief/noise) | 6 (level param), 8 (`DIFFICULTY`) |
| Node cap + fallback | 8 |
| Deploy: drag-drop + Auto-fill + Clear + Start | 9 |
| Classic tabletop visual style | 9 (CSS) |
| Play: click-move, highlights | 10 |
| Combat reveal animation | 10 (CSS `.reveal`/`data-combat`) |
| Captured trays | 10 |
| Move history log | 10 |
| Undo (reverts human+AI, rewinds beliefs+RNG) | 10 |
| Resign, New Game, end banner + reveal | 10 |
| Save/resume via localStorage, corrupt-save discard | 11 |
| Difficulty selector (locked during match) | 9 (select only rendered in deploy phase) |
| Testing: extract script blocks, node:test | 1 (`harness.js`) |
| Testing: every combat interaction, scout, two-squares, immobilization, flag, belief updates, search legality, save/load, undo, determinism | 2–8 (unit), 9–11 (e2e) |
| Out of scope items | not implemented (correct) |

No gaps found.

**2. Placeholder scan:** Task 9 and 10 intentionally cross-reference (`_renderPlay` stubbed in 9, implemented in 10) — this is a real handoff with the stub clearly marked, not a placeholder in the "vague requirement" sense. The rejected-approach lines in Task 8 (`raw` array, mobility placeholder line, comma-expression in `easy`) are explicitly called out with "remove this" / "clean up" instructions immediately after. All test code is concrete. No "TBD"/"add error handling"/"write tests for the above" left.

**3. Type consistency check:**
- `Move` shape `{pieceId, from:[r,c], to:[r,c], isAttack}` — consistent across Tasks 3–10.
- `State` shape — consistent Tasks 2–11; `pieceMoveLog` keyed by pieceId with `{from,to}` entries (Tasks 2, 4, 5).
- `MoveResult` — `{move, combat, revealed, captured, winner, winReason}` — Task 4 defines, Tasks 6/10 consume with those exact names.
- `Beliefs` — `{viewer, opponent, pieces:{id:{probs, known}}}` — Task 6 defines, Tasks 7/8/10/11 use `.pieces`, `.probs`, `.known`, `.viewer`, `.opponent` consistently.
- `AI.chooseMove(state, beliefs, opts)` with `opts={level, rng}` — Task 7 defines, Task 8 keeps the signature, Task 10 calls it that way.
- `Engine.applyMove` returns `{state, result}` — consistent Tasks 4, 7, 8, 10.
- `RNG` instance methods `next/int/pick/shuffle/state` and `RNG.create/fromState` — Task 1 defines, used unchanged everywhere.
- `Game` methods — `newMatch/autoFillDeployment/clearDeployment/placeDeploy/removeDeploy/deploymentComplete/startPlay` (Task 9), `selectPiece/humanMove/aiTurn/undo/resign` (Task 10) — no collisions, no renames.
- `UI` methods — `mount/render/_renderPlay` (Task 9), `persist/clearSave/tryRestore/boot/renderResumePrompt` (Task 11) — consistent; Task 9's `_renderPlay` stub matches Task 10's implementation name.

One inconsistency fixed inline: Task 7's `evaluate` had a stray `Engine().legalMoves ? 0 : 0` placeholder line — the step text now explicitly says to keep only the `globalThis.Stratego.Engine.legalMoves(...)` line.

Plan is internally consistent and covers the spec.
