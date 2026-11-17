import { test } from "node:test";
import assert from "node:assert/strict";
import { freshPlayer } from "../src/logic";
import { SKILLS, LOOT } from "../src/config";
import { autoSkillReady } from "../src/skills";
import {
  REWARDS,
  rollChoices,
  makeChoice,
  applyChoice,
  validRewards,
  pickupRadius,
} from "../src/progression";

test("new player has only claws; every other skill requires a level choice", () => {
  const p = freshPlayer();
  for (const key of Object.keys(SKILLS) as (keyof typeof SKILLS)[])
    assert.equal(autoSkillReady(key, p, 0, 1), false);
  const unlock = makeChoice(
    REWARDS.find((r) => r.id === "sopro")!,
    p,
    () => 0,
  );
  assert.equal(unlock.unlock, true);
  applyChoice(p, unlock);
  assert.equal(p.skills.q, 1);
  assert.equal(autoSkillReady("q", p, 0, 3), true);
  assert.equal(autoSkillReady("q", p, 1, 3), false);
  assert.equal(autoSkillReady("q", { ...p, essence: 0 }, 0, 3), false);
  assert.equal(autoSkillReady("q", p, 0, 20), false);
  const upgrade = makeChoice(
    REWARDS.find((r) => r.id === "sopro")!,
    p,
    () => 0,
  );
  assert.equal(upgrade.unlock, false);
  applyChoice(p, upgrade);
  assert.equal(p.skills.q, 2);
  assert.ok(p.skillPower.q > unlock.value);
});
test("offers always contain three distinct valid rewards, including after exhausting caps", () => {
  const p = freshPlayer(),
    levels: Record<string, number> = { hp: 5, damage: 6, sopro: 5 };
  for (let i = 0; i < 100; i++) {
    const choices = rollChoices(levels, p);
    assert.equal(choices.length, 3);
    assert.equal(new Set(choices.map((c) => c.id)).size, 3);
    assert.ok(choices.every((c) => !["hp", "damage", "sopro"].includes(c.id)));
  }
  for (const r of REWARDS) if (Number.isFinite(r.max)) levels[r.id] = r.max;
  const fallback = rollChoices(levels, p);
  assert.equal(fallback.length, 3);
  assert.ok(fallback.every((c) => c.fallback));
});
test("rarity and quality change actual strength, not just card colors", () => {
  const item = REWARDS.find((r) => r.id === "damage")!,
    p = freshPlayer();
  const common = makeChoice(item, p, () => 0),
    legendary = makeChoice(item, p, () => 0.9999);
  assert.equal(common.rarity.id, "common");
  assert.equal(legendary.rarity.id, "legendary");
  assert.equal(legendary.quality.id, "masterwork");
  assert.ok(legendary.value > common.value * 3);
  const before = p.damage;
  applyChoice(p, legendary);
  assert.equal(p.damage, Math.round((before + legendary.value) * 100) / 100);
  for (let rarity = 0; rarity < LOOT.rarities.length; rarity++) {
    const n =
      (LOOT.rarities.slice(0, rarity).reduce((s, r) => s + r.weight, 0) + 0.1) /
      100;
    assert.equal(
      makeChoice(item, freshPlayer(), () => n).rarity.id,
      LOOT.rarities[rarity].id,
    );
  }
});
test("every offered reward has an effect and skill ranks do not leak to a new run", () => {
  const p = freshPlayer();
  for (const r of validRewards({}, p)) {
    const q = freshPlayer(),
      before = JSON.stringify(q);
    applyChoice(
      q,
      makeChoice(r, q, () => 0),
    );
    assert.notEqual(JSON.stringify(q), before, r.id);
  }
  p.skills.q = 3;
  assert.equal(freshPlayer().skills.q, 0);
});
test("collection items and Faro enlarge the magnet radius; protection stays capped", () => {
  const p = freshPlayer(),
    base = pickupRadius(p, false);
  applyChoice(
    p,
    makeChoice(
      REWARDS.find((r) => r.id === "collect")!,
      p,
      () => 0,
    ),
  );
  assert.ok(pickupRadius(p, false) > base);
  assert.ok(pickupRadius(p, true) > pickupRadius(p, false));
  p.armor = 0.59;
  applyChoice(
    p,
    makeChoice(
      REWARDS.find((r) => r.id === "armor")!,
      p,
      () => 0.999,
    ),
  );
  assert.equal(p.armor, 0.6);
  assert.ok(!validRewards({}, p).some((r) => r.id === "armor"));
});
