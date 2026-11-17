import { canMove, distance, type Point, type Obstacle } from "./logic";
// A coarse navigation grid keeps pursuers connected through the bridge and around the station.
export function nextWaypoint(
  start: Point,
  target: Point,
  obstacles: Obstacle[],
): Point {
  const round = (p: Point) => ({ x: Math.round(p.x), z: Math.round(p.z) }),
    s = round(start),
    goal = round(target),
    key = (p: Point) => p.x + "," + p.z;
  const open = [s],
    seen = new Set([key(s)]),
    parent = new Map<string, Point>();
  let found: Point | undefined;
  for (let n = 0; open.length && n < 2500; n++) {
    open.sort((a, b) => distance(a, goal) - distance(b, goal));
    const c = open.shift()!;
    if (distance(c, goal) < 1.5) {
      found = c;
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const p = { x: c.x + dx, z: c.z + dz },
        k = key(p);
      if (seen.has(k) || !canMove(p, obstacles, 0.55)) continue;
      seen.add(k);
      parent.set(k, c);
      open.push(p);
    }
  }
  if (!found) return target;
  while (parent.has(key(found)) && distance(parent.get(key(found))!, s) > 0.1)
    found = parent.get(key(found))!;
  return found;
}
