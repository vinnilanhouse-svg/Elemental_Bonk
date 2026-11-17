import { CHARACTERS, type Species } from "./species";
import { CFG, type Skill } from "./config";
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
export function freshPlayer(species: Species = "wolf") {
  const c: { hp: number; speed: number; damage: number; range: number } =
    CHARACTERS[species];
  return {
    species,
    x: 0,
    z: 4,
    hp: c.hp,
    maxHp: c.hp,
    essence: CFG.essence,
    maxEssence: CFG.essence,
    level: 1,
    xp: 0,
    kills: 0,
    damage: c.damage,
    speed: c.speed,
    attack: 1,
    collect: CFG.collect,
    cooldown: 1,
    range: c.range,
    armor: 0,
    recovery: 0,
    essenceRegen: CFG.regen,
    xpBonus: 0,
    immobilized: 0,
    mobilityTime: 0,
    skills: {
      q: 0,
      e: 0,
      r: 0,
      " ": species !== "wolf" ? 1 : 0,
      trap: 0,
      mobility: 0,
      defense: 0,
    } as Record<Skill, number>,
    skillPower: {
      q: 0,
      e: 0,
      r: 0,
      " ": 0,
      trap: 0,
      mobility: 0,
      defense: 0,
    } as Record<Skill, number>,
  };
}

export type Player = ReturnType<typeof freshPlayer>;
