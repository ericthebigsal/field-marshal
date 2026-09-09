import test from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./harness.js";

const S = loadModules(["rng", "engine", "ai", "ui"]);
const { explainCombat } = S.UI;

function combat(aRank, dRank, outcome, aOwner = "red", dOwner = "blue") {
  return {
    attacker: { id: 1, rank: aRank, owner: aOwner },
    defender: { id: 2, rank: dRank, owner: dOwner },
    outcome,
  };
}

test("explainCombat: headline names both pieces and sides", () => {
  const out = explainCombat(combat(3, "B", "attacker"));
  assert.match(out.headline, /Red Miner/);
  assert.match(out.headline, /Blue Bomb/);
});

test("explainCombat: Spy strikes the Marshal", () => {
  const out = explainCombat(combat(1, 10, "attacker"));
  assert.match(out.reason, /Spy/);
  assert.match(out.reason, /first/i);
  assert.match(out.result, /Marshal is captured/i);
  assert.match(out.result, /Spy/);
});

test("explainCombat: Miner defuses a Bomb", () => {
  const out = explainCombat(combat(3, "B", "attacker"));
  assert.match(out.reason, /only a Miner/i);
  assert.match(out.result, /Bomb is defused/i);
});

test("explainCombat: Bomb destroys a non-Miner attacker", () => {
  const out = explainCombat(combat(4, "B", "defender"));
  assert.match(out.reason, /Bomb destroys any attacker except a Miner/i);
  assert.match(out.result, /Sergeant is destroyed/i);
  assert.match(out.result, /Bomb is revealed/i);
});

test("explainCombat: capturing the Flag wins", () => {
  const out = explainCombat(combat(6, "F", "attacker"));
  assert.match(out.reason, /wins the game/i);
  assert.match(out.result, /captures the Blue Flag/i);
});

test("explainCombat: higher rank wins as attacker", () => {
  const out = explainCombat(combat(9, 6, "attacker"));
  assert.match(out.reason, /higher rank/i);
  assert.match(out.result, /Captain is captured/i);
  assert.match(out.result, /General/);
});

test("explainCombat: higher rank wins as defender", () => {
  const out = explainCombat(combat(6, 7, "defender"));
  assert.match(out.reason, /higher rank/i);
  assert.match(out.result, /Captain is captured/i);
});

test("explainCombat: equal ranks trade", () => {
  const out = explainCombat(combat(7, 7, "both"));
  assert.match(out.reason, /[Ee]qual/);
  assert.match(out.result, /[Bb]oth/);
});

test("pieceRule: every rank has non-empty capability text", () => {
  for (const rank of [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, "B", "F"]) {
    const txt = S.UI.pieceRule(rank);
    assert.equal(typeof txt, "string");
    assert.ok(txt.length > 10, `rule for ${rank} too short`);
  }
});

test("pieceRule: key pieces describe their special abilities", () => {
  assert.match(S.UI.pieceRule(3), /[Bb]omb/);
  assert.match(S.UI.pieceRule(2), /straight line|any number/i);
  assert.match(S.UI.pieceRule(1), /Marshal/);
  assert.match(S.UI.pieceRule("B"), /not move/i);
  assert.match(S.UI.pieceRule("F"), /win/i);
});
