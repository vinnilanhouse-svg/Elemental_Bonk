import { test } from "node:test";
import assert from "node:assert/strict";
import { Notifications } from "../src/notifications";
import { lineOfSight, selectTarget } from "../src/combat";
import { heightAt, canMove, freshPlayer } from "../src/logic";
import { WORLD, riverAt, terrainSlope } from "../src/terrain";
import { approachingZone, zoneAt } from "../src/zones";
import { REWARDS, makeChoice } from "../src/progression";
import { skillDetails } from "../src/skill-details";
import { load, store } from "../src/save";
import type { Enemy } from "../src/enemies";
test("notification priority preempts minor messages, deduplicates and bounds backlog", () => {
  const n = new Notifications();
  n.push("start", "Início", "", "operation");
  n.push("item", "Item", "", "pickup");
  assert.equal(n.active?.id, "item");
  n.push("region", "Região", "", "region");
  n.push("danger", "Emboscada", "", "danger");
  assert.equal(n.active?.id, "danger");
  n.push("danger", "duplicado", "", "danger");
  assert.equal(n.queue.length, 0);
  for (let i = 0; i < 20; i++) n.push("i" + i, "Coleta", "", "pickup");
  assert.ok(n.queue.length <= 5);
  n.push("boss", "Chefe", "", "boss");
  assert.equal(n.active?.id, "boss");
  n.tick(4);
  assert.ok(n.active?.id !== "boss");
  n.clear();
  assert.equal(n.active, undefined);
  assert.equal(n.queue.length, 0);
});
test("target acquisition ignores dead and blocked creatures, retains a valid target, respects range", () => {
  const a = { x: 3, z: 0, dead: false } as Enemy,
    b = { x: 0, z: 2, dead: false } as Enemy,
    wall = [{ x: 1.5, z: 0, r: 0.6 }];
  assert.equal(lineOfSight({ x: 0, z: 0 }, a, wall), false);
  assert.equal(selectTarget([a, b], { x: 0, z: 0 }, 7, wall), b);
  assert.equal(selectTarget([a, b], { x: 0, z: 0 }, 7, [], a), a);
  a.dead = true;
  assert.equal(selectTarget([a], { x: 0, z: 0 }, 7, []), undefined);
  assert.equal(selectTarget([b], { x: 0, z: 0 }, 1, []), undefined);
});
test("terrain contains real elevated tops, steep cliff faces, walkable ramp and irregular water banks", () => {
  assert.ok(heightAt(-41, -35) > 4);
  assert.ok(heightAt(42, -34) > 1);
  assert.ok(heightAt(-41, 40) > 1);
  assert.ok(terrainSlope(-27.4, -35) > 2);
  assert.equal(canMove({ x: -27.4, z: -35 }, []), false);
  for (let x = -26; x >= -41; x -= 0.5)
    assert.ok(canMove({ x, z: -25 }, []), "ramp " + x);
  assert.notEqual(riverAt(0).center, riverAt(15).center);
  assert.notEqual(riverAt(0).halfWidth, riverAt(15).halfWidth);
  assert.equal(canMove({ x: riverAt(12).center, z: 12 }, []), false);
  assert.equal(canMove({ x: riverAt(0).center, z: 0 }, []), true);
  assert.equal(canMove({ x: WORLD.limitX, z: 0 }, []), false);
});
test("the starting area protects opening spawns and warns before a higher risk frontier", () => {
  for (const p of [
    { x: 19, z: 4 },
    { x: -19, z: 4 },
    { x: 0, z: 23 },
    { x: 0, z: -15 },
  ])
    assert.equal(zoneAt(p.x, p.z).id, 1);
  assert.equal(zoneAt(0, 37).id, 1);
  assert.equal(zoneAt(0, 39).id, 4);
  assert.equal(approachingZone(0, 32, { x: 0, z: 1 })?.id, 4);
  assert.equal(approachingZone(0, 4, { x: 0, z: 1 }), null);
});
test("upgrade descriptions explain their effect and compare concrete values instead of vague power", () => {
  const p = freshPlayer();
  p.skills.e = 1;
  const c = makeChoice(
    REWARDS.find((r) => r.id === "faro")!,
    p,
    () => 0,
  );
  assert.match(c.text, /Faro realça ameaças/);
  assert.match(c.text, /Atual:/);
  assert.match(c.text, /Após:/);
  assert.ok(!c.text.includes("à potência"));
  for (const species of ["wolf", "gorgon", "saci"] as const) {
    const p = freshPlayer(species);
    for (const r of REWARDS.filter((r) => r.species === species)) {
      const c = makeChoice(r, p, () => 0);
      assert.ok(c.text.length > 30);
      if (r.skill) assert.ok(skillDetails(p, r.skill).effect);
    }
  }
});
test("preferences and records survive reload, while invalid saves remain safe", () => {
  const before = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let text = "";
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => text,
      setItem: (_: string, v: string) => (text = v),
    },
  });
  try {
    text = "invalid";
    assert.equal(load().wins, 0);
    text = JSON.stringify({
      version: 1,
      volume: 7,
      quality: "bad",
      bestTime: Infinity,
      bestKills: -9,
      wins: 2.7,
    });
    const s = load();
    assert.equal(s.volume, 1);
    assert.equal(s.quality, "alta");
    assert.equal(s.bestTime, 0);
    assert.equal(s.bestKills, 0);
    assert.equal(s.wins, 2);
    s.reducedEffects = true;
    s.shake = false;
    store(s);
    assert.equal(load().reducedEffects, true);
    assert.equal(load().shake, false);
  } finally {
    if (before) Object.defineProperty(globalThis, "localStorage", before);
    else delete (globalThis as any).localStorage;
  }
});

test("navigation connects the base to every region including the steep plateau ramp", async () => {
  const { nextWaypoint } = await import("../src/navigation");
  const { ZONES } = await import("../src/zones");
  const { move, distance, normalize } = await import("../src/logic");
  for (const zone of ZONES.slice(1)) {
    const p = { x: 0, z: 4 },
      obstacles: [] = [];
    let waypoint = nextWaypoint(p, zone.anchor, obstacles);
    for (let i = 0; i < 1200 && distance(p, zone.anchor) > 2; i++) {
      if (distance(p, waypoint) < 0.35)
        waypoint = nextWaypoint(p, zone.anchor, obstacles);
      const d = normalize(waypoint.x - p.x, waypoint.z - p.z);
      move(p, d.x * 0.25, d.z * 0.25, obstacles);
    }
    assert.ok(
      distance(p, zone.anchor) <= 2,
      "region " + zone.id + " at " + JSON.stringify(p),
    );
  }
});
