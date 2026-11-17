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
