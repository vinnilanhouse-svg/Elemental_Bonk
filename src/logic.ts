import { WORLD, inRiver, terrainHeight, terrainSlope } from "./terrain";
import { CHARACTERS, type Species } from "./species";
import { CFG, skillRecord } from "./config";
import type { Element } from "./new-species";
export type Point = { x: number; z: number };
export type Obstacle = Point & { r: number };
export const normalize = (x: number, z: number): Point => {
  const n = Math.hypot(x, z);
  return n > 0 ? { x: x / n, z: z / n } : { x: 0, z: 0 };
};
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export const heightAt = terrainHeight;
export function canMove(p: Point, obs: Obstacle[], radius = 0.45) {
  return (
    Math.abs(p.x) < WORLD.limitX - radius &&
    Math.abs(p.z) < WORLD.limitZ - radius &&
    !inRiver(p.x, p.z, radius * 0.6) &&
    terrainSlope(p.x, p.z) < 1.4 &&
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
    if (
      canMove({ x: p.x + dx / steps, z: p.z }, obs, radius) &&
      Math.abs(heightAt(p.x + dx / steps, p.z) - heightAt(p.x, p.z)) < 0.32
    )
      p.x += dx / steps;
    if (
      canMove({ x: p.x, z: p.z + dz / steps }, obs, radius) &&
      Math.abs(heightAt(p.x, p.z + dz / steps) - heightAt(p.x, p.z)) < 0.32
    )
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
export function freshPlayer(species: Species = "wolf", element: Element = "air") {
  const c: { hp: number; speed: number; damage: number; range: number } =
    CHARACTERS[species];
  return {
    species,
    element,
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
    rootImmunity: 0,
    mobilityTime: 0,
    empowerTime: 0,
    empowerDamage: 0,
    empowerArmor: 0,
    empowerAttack: 0,
    skills: { ...skillRecord(), " ": species !== "wolf" ? 1 : 0 },
    skillPower: skillRecord(),
  };
}

export type Player = ReturnType<typeof freshPlayer>;
