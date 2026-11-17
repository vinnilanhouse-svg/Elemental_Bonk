import { test } from "node:test";
import assert from "node:assert/strict";
import metadata from "../src/enemy-frames.json";
import { stableFrames } from "../src/enemy-animation";
import { stableDirection } from "../src/motion";
import { freshPlayer } from "../src/logic";
import { rollChoices, validRewards } from "../src/progression";
import { avoidsDamage, evasionChance } from "../src/skills";
import { enemyFrame } from "../src/enemy-animation-state";
test("walk frames keep a common body anchor instead of jumping with each supporting foot", () => {
  for (const a of metadata) {
    const frames = stableFrames(a.frames, a.size[0]);
    for (let row = 0; row < 4; row++) {
      const anchors = frames
        .slice(row * 6, row * 6 + 6)
        .map((f, col) => f.rect[0] + f.pivot[0] - (col * a.size[0]) / 6);
      assert.ok(Math.max(...anchors) - Math.min(...anchors) < 1e-8, a.id);
      for (let col = 0; col < 6; col++)
        assert.equal(
          frames[row * 6 + col].pivot[1],
          a.frames[row * 6 + col].pivot[1],
        );
    }
  }
});
test("directions near a diagonal do not flip every frame; actual turns still work", () => {
  assert.equal(stableDirection(0, 0.71, 0.7), 0);
  assert.equal(stableDirection(0, 0.7, 0.71), 0);
  assert.equal(stableDirection(3, 0.71, 0.7), 3);
  assert.equal(stableDirection(3, 0.7, 0.71), 3);
  assert.equal(stableDirection(0, 1, 0), 3);
  assert.equal(stableDirection(3, 0, -1), 1);
  assert.equal(stableDirection(2, 0, 0), 2);
});
test("evasion is a chance per incoming hit and never changes player coordinates", () => {
  const p = freshPlayer();
  assert.equal(
    avoidsDamage(p, () => 0),
    false,
  );
  p.skills[" "] = 1;
  p.skillPower[" "] = 0.2;
  const start = { x: p.x, z: p.z };
  assert.ok(Math.abs(evasionChance(p) - 0.12) < 1e-8);
  assert.equal(
    avoidsDamage(p, () => 0.01),
    true,
  );
  assert.equal(
    avoidsDamage(p, () => 0.99),
    false,
  );
  assert.deepEqual({ x: p.x, z: p.z }, start);
  p.skillPower[" "] = 999;
  assert.equal(evasionChance(p), 0.5);
});
test("repeat offers favor diversity and guarantee two fresh options when possible", () => {
  const p = freshPlayer(),
    history: string[][] = [];
  for (let i = 0; i < 50; i++) {
    const offers = rollChoices({}, p, () => 0.75, history);
    assert.equal(new Set(offers.map((o) => o.id)).size, 3);
    if (history.length) {
      const old = new Set(history.at(-1));
      assert.ok(offers.filter((o) => !old.has(o.id)).length >= 2);
    }
    assert.ok(offers.some((o) => o.kind === "item"));
    assert.ok(offers.some((o) => o.kind === "skill"));
    history.push(offers.map((o) => o.id));
    if (history.length > 2) history.shift();
  }
  assert.ok(validRewards({}, p).length > 5);
});
test("hurt reactions retain one readable silhouette instead of cycling rapidly", () => {
  for (let direction = 0; direction < 4; direction++) {
    const first = enemyFrame("hurt", direction, 0);
    for (const t of [0.01, 0.04, 0.08, 0.15])
      assert.equal(enemyFrame("hurt", direction, t), first);
  }
});
