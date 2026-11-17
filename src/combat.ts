import { inCone, type Point } from "./logic";
import type { Enemy } from "./enemies";
export function targetsInArc(
  enemies: Enemy[],
  origin: Point,
  heading: Point,
  range: number,
) {
  return enemies.filter((e) => !e.dead && inCone(origin, heading, e, range));
}
