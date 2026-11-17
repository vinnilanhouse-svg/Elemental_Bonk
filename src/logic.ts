import { CFG, UPGRADES } from "./config";
export type Point = { x: number; z: number };
export type Obstacle = Point & { r: number };
export const normalize = (x: number, z: number): Point => {
  const n = Math.hypot(x, z);
  return n > 0 ? { x: x / n, z: z / n } : { x: 0, z: 0 };
};
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export function heightAt(x: number, z: number) {
  return x < -13 && z < -5 ? Math.min(2, (-x - 13) * 0.3, (-z - 5) * 0.35) : 0;
}
export function canMove(p: Point, obs: Obstacle[], radius = 0.45) {
  return (
    Math.abs(p.x) < 28 &&
    Math.abs(p.z) < 26 &&
    !(p.x > 9 && p.x < 12 && Math.abs(p.z) > 2.3) &&
    obs.every((o) => distance(p, o) > radius + o.r)
  );
}
export function move(
  p: Point,
  dx: number,
  dz: number,
  obs: Obstacle[],
  radius = 0.45,
) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.2));
  for (let i = 0; i < steps; i++) {
    if (canMove({ x: p.x + dx / steps, z: p.z }, obs, radius))
      p.x += dx / steps;
    if (canMove({ x: p.x, z: p.z + dz / steps }, obs, radius))
      p.z += dz / steps;
  }
  return p;
}
export const inCone = (
  origin: Point,
  heading: Point,
  target: Point,
  range: number,
  cos = 0.35,
) => {
  const d = distance(origin, target);
  return (
    d <= range &&
    (d < 0.01 ||
      ((target.x - origin.x) * heading.x + (target.z - origin.z) * heading.z) /
        d >=
        cos)
  );
};
export const xpFor = (level: number) => 12 + level * 7;
export function validUpgrades(levels: Record<string, number>) {
  return UPGRADES.filter((u) => (levels[u.id] || 0) < u.max);
}
export function freshPlayer() {
  return {
    x: 0,
    z: 4,
    hp: CFG.hp,
    maxHp: CFG.hp,
    essence: CFG.essence,
    maxEssence: CFG.essence,
    level: 1,
    xp: 0,
    kills: 0,
    damage: CFG.damage,
    speed: CFG.speed,
    attack: 1,
    collect: CFG.collect,
    cooldown: 1,
    power: 1,
  };
}
