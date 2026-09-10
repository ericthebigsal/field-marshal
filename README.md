# Field Marshal

A browser-based, single-player strategy game played by the classical
Stratego ruleset. You face a deterministic, rule-based computer opponent —
no server, no build step, no dependencies. The whole game ships as one
self-contained `field-marshal.html` file that runs offline.

**Play:** https://ericthebigsal.github.io/field-marshal/

> **Disclaimer.** *Field Marshal* is an unofficial, non-commercial fan
> project. It is not affiliated with, sponsored by, or endorsed by the
> owners of the Stratego® trademark. It implements the well-known classical
> ruleset; all code and artwork in this repository are original.

## Status

Playable. Four difficulty tiers (Easy, Medium, Hard, Expert), full deploy and
play phases, and save/resume of an in-progress game via `localStorage` (with a
resume-or-new-game prompt on reload). Test suites: 87 `node:test` unit tests for
the pure modules and 19 Playwright end-to-end tests for the UI.

- Design spec: [`docs/superpowers/specs/2026-09-07-stratego-single-player-design.md`](docs/superpowers/specs/2026-09-07-stratego-single-player-design.md)

## Features

- Full classical ruleset on the 10x10 board with center lakes, 40 pieces
  per side, ranks 1-10 plus Bombs and Flag.
- Manual drag-and-drop army deployment, with random Auto-fill and four
  hand-authored starting formations (Aggressive, Defensive, Tricky,
  Conservative). The computer deploys with a randomly chosen formation too.
- Classic tabletop visual style (wood board, felt lakes, pictographic rank
  tokens — a drawn insignia per rank, bomb and flag included).
- Hover any piece for a tooltip describing that rank's capabilities.
- A **?** button (deploy and play) opens a "How to play" panel: the objective,
  movement, combat, special ranks, and a full table of every rank with its
  icon, count, and role.
- Two live rosters in the play panel — one per side — showing every rank's
  icon and how many are still in play (a rank drops only when a piece of it
  dies in combat, which always reveals the rank). Hover a tile for its rules.
- Piece text is tinted by whether its identity is still secret from the
  opponent (green) or has been revealed in combat (amber).
- Every encounter opens a modal showing both pieces, the outcome, and a
  plain-language explanation of why it went that way; play pauses until you
  dismiss it.
- Deterministic rule-based AI opponent:
  - Rule-driven belief model of the player's hidden pieces (counts, combat
    memory, movement tells) — the AI never peeks at unrevealed ranks.
  - Shallow expectimax search over that belief model.
  - Four difficulty tiers (Easy 1-ply through Expert 4-ply) that differ only in
    search depth, belief fidelity, and decision noise — all fair.
- Encounter modal, combat reveal animation, move-history log, undo.
- Save / resume via `localStorage`.

## Architecture

Single HTML file, JavaScript split into narrow modules:

| Module | Responsibility |
|--------|----------------|
| `Engine` | Pure rules: state, legal moves, combat, win detection, two-squares rule. No DOM, no randomness. |
| `RNG` | Seeded PRNG; seed stored with the save so games and tests reproduce exactly. |
| `AI` | Belief model + expectimax search. Deterministic given the seed. |
| `UI` / `Game` | Rendering, input, animation, persistence, turn flow. |

The internal JS namespace is still `globalThis.Stratego.*` — a historical
implementation detail, not user-facing.

## Testing

`Engine`, `RNG`, and `AI` are pure. A Node test runner extracts those script
blocks from `field-marshal.html` and runs assertions against them, so delivery
stays a single file while development uses real TDD.

```
npm test              # 87 node:test unit tests (Engine, RNG, AI, UI helpers)
npx playwright test   # 19 end-to-end UI tests (deploy, play, save/resume, encounters, rules)
```

The end-to-end tests drive the real `field-marshal.html` over `file://` and
require Google Chrome to be installed (the Playwright config uses
`channel: "chrome"`).

## Running

Open `field-marshal.html` in any modern browser. No server or build step.
