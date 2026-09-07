# Stratego (Single Player)

A browser-based, single-player implementation of classical Stratego. You play
against a deterministic, rule-based computer opponent — no server, no build
step, no dependencies. The whole game ships as one self-contained
`stratego.html` file that runs offline.

## Status

Design complete, implementation not started.

- Design spec: [`docs/superpowers/specs/2026-09-07-stratego-single-player-design.md`](docs/superpowers/specs/2026-09-07-stratego-single-player-design.md)
- Source rules reference: [`Classical Risk Game Rules - Google Gemini.pdf`](Classical%20Risk%20Game%20Rules%20-%20Google%20Gemini.pdf) (classical Stratego ruleset)

## Planned features

- Full classical Stratego rules on the 10x10 board with center lakes, 40 pieces
  per side, ranks 1-10 plus Bombs and Flag.
- Manual drag-and-drop army deployment, with an Auto-fill button.
- Classic tabletop visual style (wood board, felt lakes, rank tokens).
- Deterministic rule-based AI opponent:
  - Rule-driven belief model of the player's hidden pieces (counts, combat
    memory, movement tells) — the AI never peeks at unrevealed ranks.
  - Shallow expectimax search over that belief model.
  - Four difficulty tiers (Easy 1-ply through Expert 4-ply) that differ only in
    search depth, belief fidelity, and decision noise — all fair.
- Captured-pieces trays, combat reveal animation, move-history log, undo.
- Save / resume via `localStorage`.

## Architecture

Single HTML file, JavaScript split into narrow modules:

| Module | Responsibility |
|--------|----------------|
| `Engine` | Pure rules: state, legal moves, combat, win detection, two-squares rule. No DOM, no randomness. |
| `RNG` | Seeded PRNG; seed stored with the save so games and tests reproduce exactly. |
| `AI` | Belief model + expectimax search. Deterministic given the seed. |
| `UI` / `Game` | Rendering, input, animation, persistence, turn flow. |

## Testing

`Engine`, `RNG`, and `AI` are pure. A Node test runner extracts those script
blocks from `stratego.html` and runs assertions against them, so delivery stays
a single file while development uses real TDD.

## Running

Once built: open `stratego.html` in any modern browser.
