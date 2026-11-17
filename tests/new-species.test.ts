import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { freshPlayer } from "../src/logic";
import { SPECIES_ORDER, SPECIES_SKILLS, skillFor } from "../src/species";
import { NEW_SKILLS } from "../src/new-species";
import { apexUnlocked, canPayBlood, drainRecovery } from "../src/new-species-rules";
import { applyChoice, makeChoice, REWARDS, validRewards } from "../src/progression";
import { mitigatedDamage } from "../src/skills";
import { skillDetails } from "../src/skill-details";
import { AGENT_META } from "../src/agent-assets";
import { applyFieldItem, freshFieldBuffs } from "../src/field-loot";

test("all eight agents have one initial basic, no learned powers and a private effective reward pool", () => {
  assert.equal(SPECIES_ORDER.length, 8);
  for (const species of SPECIES_ORDER) {
    const p = freshPlayer(species);
    assert.equal(Object.entries(p.skills).filter(([k]) => k !== " ").reduce((sum, [, n]) => sum + n, 0), 0);
    for (const reward of validRewards({}, p)) {
      assert.ok(!reward.species || reward.species === species);
      if (reward.skill) assert.ok(SPECIES_SKILLS[species][reward.skill]);
      const next = freshPlayer(species), before = JSON.stringify(next);
      applyChoice(next, makeChoice(reward, next, () => 0));
      assert.notEqual(JSON.stringify(next), before);
    }
  }
});
test("new apex choices require level six and two distinct learned powers", () => {
  for (const species of Object.keys(NEW_SKILLS) as (keyof typeof NEW_SKILLS)[]) {
    const p = freshPlayer(species);
    const offered = () => validRewards({}, p).some(r => r.skill === "r");
    assert.equal(offered(), false);
    p.level = 6; p.skills.q = 5;
    assert.equal(apexUnlocked(p), false);
    assert.equal(offered(), false);
    p.skills.e = 1;
    assert.equal(apexUnlocked(p), true);
    assert.equal(offered(), true);
  }
});
test("blood powers preserve at least 30% life even after maximum-health upgrades; drain cannot heal overkill", () => {
  const p = freshPlayer("vampire");
  p.hp = 33; assert.equal(canPayBlood(p, "e"), false);
  p.hp = 34; assert.equal(canPayBlood(p, "e"), true);
  p.maxHp = 200; p.hp = 63; assert.equal(canPayBlood(p, "e"), false);
  p.hp = 64; assert.equal(canPayBlood(p, "e"), true);
  assert.equal(drainRecovery(2, 50), .7);
  assert.equal(drainRecovery(100, 5), 5);
});
test("Mummy poison immunity is earned, does not also prevent physical damage", () => {
  const p = freshPlayer("mummy");
  assert.equal(mitigatedDamage(p, 20, "poison"), 20);
  p.skills.e = 1;
  assert.equal(mitigatedDamage(p, 20, "poison"), 0);
  assert.equal(mitigatedDamage(p, 20, "slashing"), 20);
});
test("Construct supplies restore Energia and keep the resource name consistent", () => {
  const p = freshPlayer("construct"), buffs = freshFieldBuffs();
  p.essence = 0;
  const supply = applyFieldItem(p, buffs, "essence")!;
  assert.equal(p.essence, 40);
  assert.match(supply.title, /Energia/);
  assert.doesNotMatch(supply.text, /Essência/);
  assert.match(applyFieldItem(p, buffs, "relic", () => .7)!.text, /Energia/);
});
test("all new powers have effect descriptions, changing rank numbers, icons and correct resource terminology", () => {
  for (const species of Object.keys(NEW_SKILLS) as (keyof typeof NEW_SKILLS)[]) {
    for (const r of REWARDS.filter(r => r.species === species)) {
      const p = freshPlayer(species), before = skillDetails(p, r.skill!);
      applyChoice(p, makeChoice(r, p, () => 0));
      const after = skillDetails(p, r.skill!);
      assert.ok(after.effect && after.numbers && after.interval, r.id);
      assert.notEqual(after.numbers, before.numbers, r.id);
      if (species === "construct") assert.match(after.interval, /Energia/);
      if (skillFor(p, r.skill!)?.healthCost) assert.match(after.interval, /Vida.*30%/);
    }
  }
});
test("five installed PNG atlases match their metadata and all 180 bounded pose crops", () => {
  for (const species of Object.keys(NEW_SKILLS) as (keyof typeof NEW_SKILLS)[]) {
    const m = AGENT_META[species], png = readFileSync(`public${m.url}`);
    assert.equal(png.readUInt32BE(16), m.size[0]); assert.equal(png.readUInt32BE(20), m.size[1]);
    assert.equal(m.frames.length, 36);
    for (const {rect: [x,y,w,h],pivot: [px,py]} of m.frames) {
      assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x+w <= m.size[0] && y+h <= m.size[1]);
      assert.ok(px >= 0 && px <= w && py >= 0 && py <= h);
    }
  }
});
