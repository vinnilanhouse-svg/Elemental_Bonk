import { SKILLS, type Skill } from "./config";
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
    player.skills[key] > 0 &&
    skillAvailability(key, player.essence, remaining) === null &&
    targetDistance <=
      SKILLS[key].range * (key === "q" ? 1 + player.skillPower.q : 1)
  );
}
