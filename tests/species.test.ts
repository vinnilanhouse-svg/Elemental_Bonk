import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { freshPlayer } from "../src/logic";
import { SPECIES_SKILLS, type Species } from "../src/species";
import {
  mitigatedDamage,
  scaleResistance,
  immobilizationRate,
  movementSpeed,
  autoSkillReady,
  evasionChance,
} from "../src/skills";
import {
  REWARDS,
  validRewards,
  makeChoice,
  applyChoice,
  rollChoices,
} from "../src/progression";
import { poison, poisonTick, petrify } from "../src/species-effects";
import { AGENT_META } from "../src/agent-assets";
import { Animator } from "../src/animation";
import type { Enemy } from "../src/enemies";

test("each species starts with one basic attack, its innate passive, and only its own reward pool", () => {
  for (const species of ["wolf", "gorgon", "saci"] as Species[]) {
    const p = freshPlayer(species);
    assert.equal(p.skills[" "], species === "wolf" ? 0 : 1);
    assert.equal(
      Object.entries(p.skills)
        .filter(([key]) => key !== " ")
        .reduce((n, [, v]) => n + v, 0),
      0,
    );
    for (const r of validRewards({}, p)) {
      assert.ok(!r.species || r.species === species);
      if (r.skill) assert.ok(SPECIES_SKILLS[species][r.skill]);
    }
    for (const r of validRewards({}, p)) {
      const next = freshPlayer(species),
        choice = makeChoice(r, next, () => 0),
        before = JSON.stringify(next);
      applyChoice(next, choice);
      assert.notEqual(JSON.stringify(next), before, r.id);
    }
    const exhausted = Object.fromEntries(
      REWARDS.filter((r) => !r.fallback).map((r) => [r.id, r.max]),
    );
    assert.equal(rollChoices(exhausted, p).length, 3);
  }
});
test("Gorgon scales reduce only slash and pierce in addition to armor, with a cap", () => {
  const p = freshPlayer("gorgon");
  p.armor = 0.1;
  assert.equal(mitigatedDamage(p, 100, "slashing"), 72);
  assert.equal(mitigatedDamage(p, 100, "piercing"), 72);
  assert.equal(mitigatedDamage(p, 100, "arcane"), 90);
  assert.equal(mitigatedDamage(p, 100, "blunt"), 90);
  assert.equal(evasionChance(p), 0);
  p.skillPower[" "] = 100;
  assert.equal(scaleResistance(p), 0.55);
  assert.ok(!validRewards({}, p).some((r) => r.id === "gorgon-scales"));
});
test("Saci escapes roots faster; SUS ignores slow terrain but never solid collision", () => {
  const p = freshPlayer("saci");
  assert.equal(immobilizationRate(p), 2);
  p.skillPower[" "] = 0.4;
  assert.equal(immobilizationRate(p), 2.4);
  assert.ok(movementSpeed(p, true) < p.speed);
  p.mobilityTime = 4;
  assert.ok(movementSpeed(p, true) > p.speed);
  assert.equal(movementSpeed(p, true), movementSpeed(p, false));
  p.immobilized = 2;
  assert.equal(movementSpeed(p, false), 0);
  assert.equal(autoSkillReady("trap", p, 0, 1), false);
  p.skills.trap = 1;
  assert.equal(autoSkillReady("trap", p, 0, 1), true);
  assert.equal(autoSkillReady("trap", p, 2, 1), false);
});
test("poison damage is frame independent, refreshes without stacking; bosses have shorter petrification", () => {
  const e = {
    poisonDps: 0,
    poisonTime: 0,
    petrified: 0,
    kind: 0,
    windup: 1,
    action: 1,
    cooldown: 0,
  } as Enemy;
  poison(e, 8, 5);
  let damage = 0;
  for (let i = 0; i < 10; i++) damage += poisonTick(e, 0.7);
  assert.ok(Math.abs(damage - 40) < 1e-8);
  assert.equal(poisonTick(e, 5), 0);
  poison(e, 10, 2);
  poison(e, 8, 1);
  assert.equal(e.poisonDps, 10);
  assert.equal(e.poisonTime, 2);
  petrify(e, 8);
  assert.equal(e.petrified, 4);
  assert.equal(e.windup, 0);
  assert.equal(e.action, 0);
  e.petrified = 0;
  e.kind = 3;
  petrify(e, 8);
  assert.equal(e.petrified, 0.9);
});
test("hero atlases select bounded poses, preserve pixel scale, and isolate UVs per run", () => {
  for (const species of ["wolf", "gorgon", "saci"] as Species[]) {
    const m = AGENT_META[species];
    assert.equal(m.frames.length, 36);
    for (const f of m.frames) {
      const [x, y, w, h] = f.rect;
      assert.ok(
        x >= 0 &&
          y >= 0 &&
          w > 0 &&
          h > 0 &&
          x + w <= m.size[0] &&
          y + h <= m.size[1],
      );
    }
    const asset = { ...m, texture: new T.Texture() },
      sprite = new T.Sprite(new T.SpriteMaterial()),
      anim = new Animator(sprite, asset);
    assert.notEqual(anim.texture, asset.texture);
    for (let dir = 0; dir < 4; dir++) {
      anim.direction = dir;
      anim.set("walk");
      anim.update(0.3);
      assert.ok(sprite.scale.x > 0 && sprite.scale.y > 0);
    }
    anim.set("death");
    anim.update(1);
    const f = m.frames[35];
    assert.equal(anim.texture.offset.x, f.rect[0] / m.size[0]);
  }
});

test("capped control upgrades leave the pool instead of offering an ineffective rank", () => {
  for (const [species, id] of [
    ["gorgon", "gorgon-gaze"],
    ["gorgon", "gorgon-medusa"],
    ["gorgon", "gorgon-skin"],
    ["saci", "saci-trap"],
  ] as const) {
    const p = freshPlayer(species),
      r = REWARDS.find((r) => r.id === id)!;
    let count = 0;
    while (validRewards({}, p).some((v) => v.id === id)) {
      const c = makeChoice(r, p, () => 0.999);
      assert.ok(c.value > 0);
      applyChoice(p, c);
      assert.ok(++count < 20);
    }
    assert.ok(count > 0);
  }
});
