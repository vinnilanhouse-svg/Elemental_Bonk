import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalize,
  move,
  heightAt,
  canMove,
  inCone,
  freshPlayer,
  validUpgrades,
} from "../src/logic";
import { skillAvailability } from "../src/skills";
test("diagonal movement has unit length", () =>
  assert.equal(Math.hypot(...Object.values(normalize(1, 1))), 1));
test("swept movement cannot tunnel through obstacles or river", () => {
  const p = { x: 0, z: 0 };
  move(p, 8, 0, [{ x: 3, z: 0, r: 1 }]);
  assert.ok(p.x < 1.6);
  assert.equal(canMove({ x: 10, z: 8 }, []), false);
  assert.equal(canMove({ x: 10, z: 0 }, []), true);
});
test("raised region is connected by a continuous slope", () => {
  assert.equal(heightAt(-13, -10), 0);
  assert.ok(heightAt(-14, -10) > 0);
  assert.equal(heightAt(-25, -20), 2);
});
test("attack respects range and forward cone", () => {
  assert.ok(inCone({ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }, 3));
  assert.ok(!inCone({ x: 0, z: 0 }, { x: 1, z: 0 }, { x: -1, z: 0 }, 3));
  assert.ok(!inCone({ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 4, z: 0 }, 3));
});
test("skills distinguish cooldown from insufficient essence", () => {
  assert.match(skillAvailability("q", 0, 2)!, /Recarga/);
  assert.match(skillAvailability("q", 0, 0)!, /Essência/);
  assert.equal(skillAvailability("q", 100, 0), null);
});
test("restart creates independent full state; capped upgrades excluded", () => {
  const a = freshPlayer();
  a.hp = 1;
  assert.equal(freshPlayer().hp, 120);
  assert.ok(!validUpgrades({ hp: 5 }).some((u) => u.id === "hp"));
});
