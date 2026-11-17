import type { Enemy } from "./enemies";
export function poison(enemy: Enemy, dps: number, duration: number) {
  enemy.poisonDps = enemy.poisonTime > 0 ? Math.max(enemy.poisonDps, dps) : dps;
  enemy.poisonTime = Math.max(enemy.poisonTime, duration);
}
export function poisonTick(enemy: Enemy, dt: number) {
  const active = Math.min(dt, enemy.poisonTime);
  enemy.poisonTime = Math.max(0, enemy.poisonTime - dt);
  return active * enemy.poisonDps;
}
export function petrify(enemy: Enemy, duration: number) {
  enemy.petrified = Math.max(
    enemy.petrified,
    Math.min(duration, enemy.kind === 3 ? 0.9 : 4),
  );
  enemy.windup = 0;
  enemy.action = 0;
  enemy.cooldown = Math.max(enemy.cooldown, 0.5);
}
