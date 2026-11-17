import { CFG, SKILLS, type Skill } from "./config";
import { skillFor, type Species, type DamageType } from "./species";
export function skillAvailability(
  key: Skill,
  essence: number,
  remaining: number,
  species: Species = "wolf",
) {
  return remaining > 0
    ? "Recarga em andamento"
    : essence < (skillFor({ species }, key)?.cost ?? Infinity)
      ? "Essência insuficiente"
      : null;
}

import type { freshPlayer } from "./logic";
export function autoSkillReady(
  key: Skill,
  player: ReturnType<typeof freshPlayer>,
  remaining: number,
  targetDistance: number,
) {
  return (
    key !== " " &&
    key !== "defense" &&
    player.skills[key] > 0 &&
    skillAvailability(key, player.essence, remaining, player.species) ===
      null &&
    targetDistance <=
      (skillFor(player, key)?.range ?? -1) *
        (key === "q" && player.species === "wolf" ? 1 + player.skillPower.q : 1)
  );
}

export function evasionChance(player: ReturnType<typeof freshPlayer>) {
  return player.species === "wolf" && player.skills[" "] > 0
    ? Math.min(
        CFG.evasionCap,
        CFG.evasionBase + player.skillPower[" "] * CFG.evasionPerPower,
      )
    : 0;
}
export function avoidsDamage(
  player: ReturnType<typeof freshPlayer>,
  rng: () => number = Math.random,
) {
  const chance = evasionChance(player);
  return chance > 0 && rng() < chance;
}

export function scaleResistance(player: ReturnType<typeof freshPlayer>) {
  return player.species === "gorgon"
    ? Math.min(0.55, 0.2 + player.skillPower[" "] * 0.2)
    : 0;
}
export function mitigatedDamage(
  player: ReturnType<typeof freshPlayer>,
  amount: number,
  type: DamageType,
) {
  return (
    Math.max(0, amount) *
    (1 - player.armor) *
    (1 -
      (["slashing", "piercing"].includes(type) ? scaleResistance(player) : 0))
  );
}

export function immobilizationRate(player: ReturnType<typeof freshPlayer>) {
  return player.species === "saci" ? 2 + player.skillPower[" "] : 1;
}
export function movementSpeed(
  player: ReturnType<typeof freshPlayer>,
  difficult: boolean,
) {
  return player.immobilized > 0
    ? 0
    : player.speed *
        (player.mobilityTime > 0
          ? 1 + 0.35 * (1 + player.skillPower.mobility)
          : difficult
            ? 0.82
            : 1);
}
