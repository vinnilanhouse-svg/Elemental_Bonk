import { CFG, SKILLS, type Skill } from "./config";
export function skillAvailability(
  key: Skill,
  essence: number,
  remaining: number,
) {
  return remaining > 0
    ? "Recarga em andamento"
    : essence < SKILLS[key].cost
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
    player.skills[key] > 0 &&
    skillAvailability(key, player.essence, remaining) === null &&
    targetDistance <=
      SKILLS[key].range * (key === "q" ? 1 + player.skillPower.q : 1)
  );
}

export function evasionChance(player: ReturnType<typeof freshPlayer>) {
  return player.skills[" "] > 0
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
