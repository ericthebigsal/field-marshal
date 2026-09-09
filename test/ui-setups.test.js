import test from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./harness.js";

const S = loadModules(["rng", "engine", "ai", "ui"]);
const { Engine } = S;
const { formationFor, SETUP_NAMES } = S.UI;

test("SETUP_NAMES lists the four named formations", () => {
  assert.deepEqual(
    [...SETUP_NAMES].sort(),
    ["aggressive", "conservative", "defensive", "tricky"],
  );
});

test("every named formation is a legal red army", () => {
  for (const name of SETUP_NAMES) {
    const res = Engine.validateSetup("red", formationFor(name, "red"));
    assert.ok(res.ok, `${name} (red): ${res.error}`);
  }
});

test("every named formation mirrors to a legal blue army", () => {
  for (const name of SETUP_NAMES) {
    const res = Engine.validateSetup("blue", formationFor(name, "blue"));
    assert.ok(res.ok, `${name} (blue): ${res.error}`);
  }
});

test("a formation puts each owner's flag on its own back rank", () => {
  const red = formationFor("defensive", "red");
  const blue = formationFor("defensive", "blue");
  assert.equal(red.find((p) => p.rank === "F").row, 9);
  assert.equal(blue.find((p) => p.rank === "F").row, 0);
  assert.equal(
    red.find((p) => p.rank === "F").col,
    blue.find((p) => p.rank === "F").col,
  );
});

test("formations are meaningfully different from each other", () => {
  const key = (name) =>
    formationFor(name, "red")
      .slice()
      .sort((a, b) => a.row - b.row || a.col - b.col)
      .map((p) => p.rank)
      .join("");
  const keys = SETUP_NAMES.map(key);
  assert.equal(new Set(keys).size, SETUP_NAMES.length);
});
