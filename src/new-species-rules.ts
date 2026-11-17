import type { Player } from "./logic";
import { skillFor } from "./species";
import type { Skill } from "./config";

export const NEW_BALANCE = {
  bloodReserve: 0.3,
  drainHeal: 0.35,
  repairThreshold: 0.35,
  repairFraction: 0.25,
  reconstructThreshold: 0.25,
  reconstructFloor: 0.3,
  maxServants: 3,
  servantLife: 8,
  servantDamage: 8,
  apexLevel: 6,
  apexSkills: 2,
} as const;
export const PLAGUES = ["O Sangue", "As Rãs", "Os Gafanhotos", "A Chuva de Pedras", "A Peste", "A Morte"] as const;
export function canPayBlood(p: Player, key: Skill) {
  const cost = skillFor(p, key)?.healthCost || 0;
  return cost === 0 || p.hp - cost >= Math.max(1, p.maxHp * NEW_BALANCE.bloodReserve);
}
export function apexUnlocked(p: Player) {
  return p.level >= NEW_BALANCE.apexLevel && Object.entries(p.skills).filter(([k, v]) => k !== " " && k !== "r" && v > 0).length >= NEW_BALANCE.apexSkills;
}
export function drainRecovery(actualDamage: number, missingHealth: number) {
  return Math.max(0, Math.min(missingHealth, actualDamage * NEW_BALANCE.drainHeal));
}
