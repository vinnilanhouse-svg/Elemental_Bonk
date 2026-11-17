import { test } from "node:test";
import assert from "node:assert/strict";
import { freshPlayer, canMove, distance } from "../src/logic";
import { ZONES, zoneAt } from "../src/zones";
import {
  FIELD_ITEMS,
  FIELD_RULES,
  applyFieldItem,
  freshFieldBuffs,
  tickFieldBuffs,
  fieldDamageMultiplier,
  fieldSpeedMultiplier,
  fieldProtectionMultiplier,
  fieldMagnetMultiplier,
  rollFieldItem,
  rollFieldSupply,
  reachableLootSpots,
  pickLootSpot,
  ambushSpots,
} from "../src/field-loot";
const rng =
  (seed = 123) =>
  () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };

test("field items restore capped resources and remain unconsumed when resources are full", () => {
  for (const species of ["wolf", "gorgon", "saci"] as const) {
    const p = freshPlayer(species),
      b = freshFieldBuffs();
    assert.equal(applyFieldItem(p, b, "heal"), null);
    assert.equal(applyFieldItem(p, b, "essence"), null);
    p.hp = p.maxHp - 5;
    p.essence = 90;
    assert.ok(applyFieldItem(p, b, "heal"));
    assert.equal(p.hp, p.maxHp);
    assert.ok(applyFieldItem(p, b, "essence"));
    assert.equal(p.essence, p.maxEssence);
    p.hp = 1;
    applyFieldItem(p, b, "heal");
    assert.equal(p.hp, 1 + Math.ceil(p.maxHp * 0.3));
  }
});
test("temporary buffs refresh without stacking or overwriting level-up attributes, then expire precisely", () => {
  const p = freshPlayer(),
    b = freshFieldBuffs(),
    before = structuredClone(p);
  p.damage += 10;
  p.speed += 1;
  for (const k of ["power", "haste", "ward", "magnet"] as const) {
    assert.ok(applyFieldItem(p, b, k));
    assert.equal(b[k], 15);
  }
  assert.equal(fieldDamageMultiplier(b), 1.3);
  assert.equal(fieldSpeedMultiplier(b), 1.25);
  assert.equal(fieldProtectionMultiplier(b), 0.7);
  assert.equal(fieldMagnetMultiplier(b), 1.75);
  tickFieldBuffs(b, 7);
  applyFieldItem(p, b, "power");
  assert.equal(b.power, 15);
  assert.equal(b.haste, 8);
  tickFieldBuffs(b, 8);
  assert.equal(fieldSpeedMultiplier(b), 1);
  assert.equal(b.power, 7);
  tickFieldBuffs(b, 100);
  assert.deepEqual(b, freshFieldBuffs());
  assert.equal(p.damage, before.damage + 10);
  assert.equal(p.speed, before.speed + 1);
  assert.equal(p.maxHp, before.maxHp);
});
test("relics roll all four events; blessing is effective even when resources are full", () => {
  const p = freshPlayer(),
    b = freshFieldBuffs();
  assert.equal(applyFieldItem(p, b, "relic", () => 0)?.event, "ambush");
  assert.equal(applyFieldItem(p, b, "relic", () => 0.4)?.event, "cache");
  assert.equal(applyFieldItem(p, b, "relic", () => 0.7)?.event, "blessing");
  assert.equal(b.ward, 15);
  assert.equal(applyFieldItem(p, b, "relic", () => 0.99)?.event, "calm");
  const random = rng(),
    seen = new Set();
  for (let i = 0; i < 500; i++) {
    seen.add(rollFieldItem(random));
    assert.notEqual(rollFieldSupply(random), "relic");
  }
  assert.equal(seen.size, Object.keys(FIELD_ITEMS).length);
});
test("loot positions reach all five regions through the bridge, stay apart and avoid blocked pockets", () => {
  const obstacles = [
      { x: 3, z: 4, r: 1 },
      { x: -5, z: -4, r: 2 },
    ],
    spots = reachableLootSpots(obstacles),
    placed: { x: number; z: number }[] = [],
    p = freshPlayer(),
    random = rng();
  for (const zone of ZONES)
    for (let i = 0; i < 3; i++) {
      const next = pickLootSpot(zone.id, spots, placed, p, random);
      assert.ok(next);
      assert.ok(canMove(next, obstacles, 0.85));
      assert.equal(zoneAt(next.x, next.z).id, zone.id);
      assert.ok(distance(next, p) >= 4.5);
      assert.ok(
        placed.every((q) => distance(next, q) >= FIELD_RULES.minSpacing),
      );
      placed.push(next);
    }
  // Solid circle blocks the central pocket, which must not become a candidate.
  const ring = Array.from({ length: 24 }, (_, i) => ({
    x: -18 + Math.cos((i * Math.PI) / 12) * 3,
    z: 15 + Math.sin((i * Math.PI) / 12) * 3,
    r: 0.65,
  }));
  const reachable = reachableLootSpots(ring);
  assert.ok(!reachable.some((q) => distance(q, { x: -18, z: 15 }) < 2));
  assert.equal(pickLootSpot(1, [], [], p), undefined);
});
test("ambush spawns outside immediate contact, inside bounds, apart, with limited count and retries", () => {
  const p = freshPlayer(),
    obstacles = [{ x: 5, z: 4, r: 3 }],
    spots = ambushSpots(p, obstacles, 8, rng());
  assert.equal(spots.length, 8);
  for (const [i, q] of spots.entries()) {
    assert.ok(canMove(q, obstacles, 0.9));
    assert.ok(distance(q, p) >= 7 && distance(q, p) <= 11);
    assert.ok(spots.slice(0, i).every((s) => distance(q, s) > 1.4));
  }
  assert.deepEqual(ambushSpots(p, [], 0), []);
  assert.equal(ambushSpots(p, [{ x: 0, z: 4, r: 100 }], 8).length, 0);
});
