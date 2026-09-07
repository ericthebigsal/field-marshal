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
