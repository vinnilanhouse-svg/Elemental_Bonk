import { inCone, heightAt, type Point } from "./logic";
import type { Enemy } from "./enemies";
export function targetsInArc(
  enemies: Enemy[],
  origin: Point,
  heading: Point,
  range: number,
) {
  return enemies.filter((e) => !e.dead && inCone(origin, heading, e, range));
}

export function lineOfSight(
  a: Point,
  b: Point,
  obstacles: readonly (Point & { r: number })[],
  padding = 0.08,
) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    len = dx * dx + dz * dz;
  const steps = Math.ceil(Math.sqrt(len) / 0.4),
    startY = heightAt(a.x, a.z) + 0.85,
    endY = heightAt(b.x, b.z) + 0.85;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (
      heightAt(a.x + dx * t, a.z + dz * t) >
      startY + (endY - startY) * t + 0.12
    )
      return false;
  }
  return obstacles.every((o) => {
    const t = Math.max(
      0,
      Math.min(1, len ? ((o.x - a.x) * dx + (o.z - a.z) * dz) / len : 0),
    );
    return Math.hypot(o.x - a.x - t * dx, o.z - a.z - t * dz) > o.r + padding;
  });
}
export function selectTarget(
  enemies: Enemy[],
  origin: Point,
  range: number,
  obstacles: readonly (Point & { r: number })[],
  previous?: Enemy,
) {
  const valid = (e: Enemy) =>
    !e.dead &&
    Math.hypot(e.x - origin.x, e.z - origin.z) <= range &&
    lineOfSight(origin, e, obstacles);
  if (previous && valid(previous)) return previous;
  let best: Enemy | undefined,
    closest = Infinity;
  for (const e of enemies)
    if (valid(e)) {
      const d = Math.hypot(e.x - origin.x, e.z - origin.z);
      if (d < closest) {
        best = e;
        closest = d;
      }
    }
  return best;
}
