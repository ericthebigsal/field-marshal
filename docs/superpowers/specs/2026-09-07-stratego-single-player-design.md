# Single-Player Stratego — Design Spec

Date: 2026-09-07
Status: Approved for implementation planning

## 1. Goal

A single-player, browser-based implementation of classical Stratego where a
human plays against a deterministic, rule-based computer opponent. Delivered as
one self-contained `stratego.html` file (inline CSS + vanilla JS, no build step,
no external dependencies, runs offline).

## 2. Rules (classical Stratego, per source PDF)

- 10x10 board with two 2x2 impassable lakes centered (columns 2-3 and 6-7,
  rows 4-5 using 0-indexed coordinates).
- Each side has 40 pieces, deployed on the 4 rows nearest that side.
- Piece ranks and counts:

  | Rank | Name | Count |
  |------|------|-------|
  | 10 | Marshal | 1 |
  | 9 | General | 1 |
  | 8 | Colonel | 2 |
  | 7 | Major | 3 |
  | 6 | Captain | 4 |
  | 5 | Lieutenant | 4 |
  | 4 | Sergeant | 4 |
  | 3 | Miner | 5 |
  | 2 | Scout | 8 |
  | 1 | Spy | 1 |
  | B | Bomb | 6 |
  | F | Flag | 1 |

- Turn = move one piece OR attack. Red (human) moves first.
- Movement: one square orthogonally into an empty square. Cannot enter lakes,
  cannot pass through or over pieces or lakes.
- Scout: may slide any number of unoccupied squares in a straight orthogonal
  line; may attack on the same turn as (and only at the end of) a slide.
- Bombs and Flag are immovable once placed.
- Combat: attacker and defender ranks are compared.
  - Higher rank wins; loser removed; winner occupies the square.
  - Equal rank: both removed.
  - Spy vs Marshal: if Spy attacks Marshal, Marshal dies. If Marshal (or anyone
    else) attacks Spy, Spy dies. Spy loses to everything else and when defending
    against the Marshal.
  - Miner attacks Bomb: Bomb removed, Miner survives and occupies square.
  - Any non-Miner attacks Bomb: attacker removed, Bomb stays.
  - Any piece attacks Flag: Flag captured, game won instantly.
- After combat, both involved pieces become permanently `revealed` to the
  opponent if they survive; a piece revealed once stays revealed.
- Win conditions:
  1. Capture the opponent's Flag.
  2. Opponent has no legal moves at the start of their turn (all remaining
     pieces immovable or blocked) -> that opponent loses.
- Two-squares rule: a piece may not move between the same two squares for a
  third consecutive time (i.e. no A->B, B->A, A->B repeated indefinitely). The
  third such move is illegal and filtered from legal-move generation.
  (More-squares / chasing rule is out of scope for v1; only the strict
  two-squares oscillation is enforced.)

## 3. Architecture

One file, `stratego.html`. JavaScript organized into four IIFE modules with
narrow public interfaces:

### 3.1 `Engine` (pure rules, no DOM, no ambient randomness)

Responsibilities:
- Represent and clone game state.
- Generate legal moves for a side.
- Apply a move, resolving combat, returning a structured result
  (moved piece, combat outcome, revealed pieces, winner if any).
- Detect win/loss (flag captured, no legal moves).
- Enforce the two-squares rule via per-piece recent-move history.

State shape:
```
{
  board: Cell[10][10],          // Cell = null | {lake:true} | Piece
  turn: 'red' | 'blue',
  moveHistory: Move[],          // full ordered log
  pieceMoveLog: { [pieceId]: [ {from,to}, ... ] }, // for two-squares rule
  winner: null | 'red' | 'blue',
  winReason: null | 'flag' | 'no-moves'
}
Piece = { id, owner, rank, hasMoved, revealed }
```

Public API (approximate):
- `Engine.newGame(redSetup, blueSetup) -> state`
- `Engine.legalMoves(state, owner) -> Move[]`
- `Engine.applyMove(state, move) -> { state, result }`  (returns new state; input not mutated)
- `Engine.isGameOver(state) -> {over, winner, reason}`
- `Engine.RANKS` metadata (name, count, order).

Determinism: `Engine` contains no randomness. Any shuffling for auto-setup is
done by the caller with a seeded RNG.

### 3.2 `RNG` (seeded)

A small deterministic PRNG (e.g. mulberry32). Seed stored in match state so
saved games and tests reproduce exactly. Used for: auto-fill deployment, AI
tie-breaking, AI decision noise.

### 3.3 `AI` (deterministic opponent)

Input: current `Engine` state (from the AI's legal perspective — it can read
its own pieces fully and the human's pieces only as `{owner, revealed?rank}`),
its persistent belief store, difficulty level, and an `RNG`.
Output: a chosen `Move`.

#### Belief store

For each currently-alive enemy (human) piece id, a probability vector over the
12 rank types, plus derived bounds. Updated only by deterministic rules:

- Initialize each unknown piece to the normalized distribution of
  remaining unaccounted human piece types.
- Piece has moved at least once -> P(Bomb) = P(Flag) = 0, renormalize.
- Piece has slid more than one square in a turn -> rank = Scout (collapse).
- Piece won a combat vs a known rank R -> rank > R (or special-case Spy/Miner
  logic); trim distribution.
- Piece lost a combat vs known rank R -> rank < R (plus specials); irrelevant
  after removal but used for the turn's evaluation.
- Piece tied vs known rank R -> rank = R (collapse).
- Revealed pieces -> rank known exactly.
- (Hard/Expert only) positional prior: Flag more likely on back row and near
  corners; Bombs more likely orthogonally adjacent to the suspected Flag;
  applied as a multiplicative prior before normalization.

The belief store is rebuilt/rewound on Undo.

#### Search

Expectimax:
- MAX nodes: AI's own moves.
- MIN/expectation nodes: human replies, evaluated against the belief
  distribution; each candidate human move weighted by a cheap heuristic
  plausibility, combat resolved as expected value over the belief vector.
- CHANCE nodes: combat outcomes (win/lose/tie probabilities from belief).
- Leaf evaluation (also the entire Easy-level policy): weighted sum of
  - material balance (rank-weighted piece values; Flag and Bomb valued
    specially)
  - flag safety (penalty for enemy pieces near own flag, bonus for own
    bombs/defenders around it)
  - mobility (count of legal moves)
  - immediate threats created / escaped
  - destination-square danger (probability the piece is lost next turn given
    beliefs)
  - information value (small bonus for forcing a reveal when ahead)
  - flag-hunt progress (proximity of AI attackers to suspected enemy flag)
- Move ordering + alpha-beta-style pruning at Expert to keep node counts sane.
- Hard node-count cap; on exceeding it, fall back to shallower depth, ultimately
  to the 1-ply leaf policy.

#### Difficulty table

| Level | Depth | Belief model | Decision noise |
|-------|-------|--------------|----------------|
| Easy | 1 ply | remaining counts only; no combat memory | high (frequently plays a random near-top move) |
| Medium | 2 ply | counts + combat memory + moved/scout tells | moderate |
| Hard | 3 ply | + all behavior tells | low |
| Expert | 4 ply + ordering/pruning | + positional priors | none (pure argmax, RNG only breaks exact ties) |

The AI never inspects unrevealed human ranks. All difficulty comes from search
depth, belief fidelity, and noise.

### 3.4 `UI` + `Game` controller

`Game` holds the match: `Engine` state, `AI` belief store, `RNG`, difficulty,
phase (`deploy` | `play` | `over`), and an undo stack of snapshots.

`UI` responsibilities:
- Render board (wood texture, felt lakes), pieces as tokens (rank silhouette
  glyph + number; red vs blue), captured trays, history log, controls.
- Deploy phase: piece tray + drag-and-drop onto the human's 4 rows;
  `Auto-fill` (seeded weighted-random valid arrangement for empty slots),
  `Clear`, `Start` (enabled at 40/40).
- Play phase: click own piece -> highlight legal destinations -> click to move.
  Then trigger AI turn (show brief "thinking" indicator; run search, ideally
  yielding to keep UI responsive), animate the reply.
- Combat animation: both tokens flip face-up in place ~900ms, loser fades out,
  winner slides into the square.
- Controls: `Undo` (reverts the human move and the AI's reply, rewinds belief
  store and RNG via snapshot), `New Game`, difficulty selector (locked during a
  match), `Resign`.
- End: result banner, full board reveal, `Rematch`.

## 4. Data flow

```
deploy: UI drag/Auto-fill -> humanSetup; AI generates its own setup via RNG
        -> Engine.newGame -> Game.state
turn (human): UI click move -> Game validates via Engine.legalMoves
        -> Engine.applyMove -> new state + result
        -> UI animates -> AI.updateBeliefs(result) -> if not over: AI turn
turn (AI): AI.chooseMove(state, beliefs, level, rng) -> move
        -> Engine.applyMove -> UI animates -> AI.updateBeliefs(result)
after each completed turn pair: Game.save() -> localStorage
undo: pop snapshot -> restore state, beliefs, rng -> UI re-render
game over: Engine.isGameOver -> UI end screen
```

## 5. Persistence

- Key: `stratego.save.v1`.
- Value: JSON of `{ version, phase, engineState, beliefStore, rngState,
  difficulty, undoStack (bounded, e.g. last 10) }`.
- Written after every completed turn and on deploy completion.
- On load: if present and `version` matches, offer `Resume` vs `New Game`;
  if absent, malformed, or version mismatch, silently discard and start fresh.

## 6. Error handling / edge cases

- Illegal drag drop during deploy: snap piece back to tray/origin.
- Illegal move attempt during play: ignore, shake the piece.
- Scout slide blocked partway: only unoccupied squares up to the first
  obstacle are legal; attacking the blocker (if enemy) is legal at that square.
- Two-squares rule: third oscillating move filtered from `legalMoves`; if that
  leaves a side with no moves, normal no-moves loss applies.
- AI search timeout / node cap exceeded: degrade depth, ultimately 1-ply.
- Corrupt localStorage: discard.
- Both flags somehow unreachable / mutual stalemate: resolved by the no-legal-
  moves rule at the start of a turn; whoever cannot move loses. If neither
  side can ever move (pathological), declare a draw.
- RNG: seeded from `Date.now()` at new game, stored; all randomness routed
  through it.

## 7. Testing

Core logic (`Engine`, `AI`, `RNG`) is pure. To keep single-file delivery while
allowing real TDD:

- `Engine`, `RNG`, and `AI` source live in clearly delimited
  `<script id="engine">`, `<script id="rng">`, `<script id="ai">` blocks.
- A Node test runner (`test/run.js`) reads `stratego.html`, extracts those
  script blocks, evaluates them in a sandbox, and runs assertions. No bundler;
  the HTML file itself remains the single source of truth.

Test coverage:
- Board/lake geometry; deployment validation (40 pieces, correct rows, correct
  counts).
- Every combat interaction in section 2 (including Spy/Marshal both directions,
  Miner/Bomb, non-Miner/Bomb, ties, Flag capture).
- Scout movement: multi-square slide, blocking, attack-at-end-of-slide.
- Immovable Bomb/Flag never generate moves.
- Two-squares rule: legal twice, illegal third time.
- No-legal-moves loss detection.
- Belief updates: initial distribution sums to 1; moved -> no bomb/flag;
  slid -> scout; combat outcomes trim correctly; revealed -> exact.
- `AI.chooseMove` always returns a move present in `Engine.legalMoves`.
- Save -> load round-trip reproduces identical state; Undo restores exact
  prior state, beliefs, and RNG.
- Determinism: same seed + same inputs -> identical AI move sequence.

## 8. Out of scope for v1

- Multiplayer / networking.
- The full "more-squares" chasing rule (only strict two-squares oscillation).
- Piece art assets (CSS/Unicode rendering only).
- Accounts, stats, online leaderboards.
- Alternative board sizes / variant rulesets.
