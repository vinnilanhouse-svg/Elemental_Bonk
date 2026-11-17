import { lineOfSight } from "./combat";
import { canMove, distance, type Point, type Obstacle } from "./logic";
const STEP = 2;
class Heap {
  a: { p: Point; score: number }[] = [];
  push(p: Point, score: number) {
    const n = { p, score };
    this.a.push(n);
    let i = this.a.length - 1;
    while (i) {
      const j = (i - 1) >> 1;
      if (this.a[j].score <= score) break;
      this.a[i] = this.a[j];
      i = j;
    }
    this.a[i] = n;
  }
  pop() {
    const head = this.a[0],
      last = this.a.pop()!;
    if (this.a.length) {
      let i = 0;
      while (i * 2 + 1 < this.a.length) {
        let j = i * 2 + 1;
        if (j + 1 < this.a.length && this.a[j + 1].score < this.a[j].score) j++;
        if (this.a[j].score >= last.score) break;
        this.a[i] = this.a[j];
        i = j;
      }
      this.a[i] = last;
    }
    return head.p;
  }
}
const grids = new WeakMap<Obstacle[], Map<string, boolean>>();
export function nextWaypoint(
  start: Point,
  target: Point,
  obstacles: Obstacle[],
): Point {
  const round = (p: Point) => ({
      x: Math.round(p.x / STEP) * STEP,
      z: Math.round(p.z / STEP) * STEP,
    }),
    key = (p: Point) => p.x + "," + p.z,
    s = round(start),
    goal = round(target),
    open = new Heap(),
    cost = new Map([[key(s), 0]]),
    parent = new Map<string, Point>();
  let grid = grids.get(obstacles);
  if (!grid) {
    grid = new Map();
    grids.set(obstacles, grid);
  }
  const walk = (p: Point) => {
    const k = key(p);
    if (!grid!.has(k)) grid!.set(k, canMove(p, obstacles, 0.5));
    return grid!.get(k)!;
  };
  open.push(s, 0);
  let found: Point | undefined;
  for (let i = 0; open.a.length && i < 5000; i++) {
    const c = open.pop();
    if (distance(c, target) < 2.1 && lineOfSight(c, target, obstacles, 0.45)) {
      found = c;
      break;
    }
    for (const [dx, dz] of [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ]) {
      const p = { x: c.x + dx, z: c.z + dz },
        k = key(p),
        next = cost.get(key(c))! + STEP;
      if (
        (cost.get(k) ?? Infinity) <= next ||
        !walk(p) ||
        !walk({ x: c.x + dx / 2, z: c.z + dz / 2 })
      )
        continue;
      cost.set(k, next);
      parent.set(k, c);
      open.push(p, next + distance(p, goal));
    }
  }
  if (!found) return start;
  while (parent.has(key(found)) && distance(parent.get(key(found))!, s) > 0.1)
    found = parent.get(key(found))!;
  return distance(start, target) < 3 &&
    lineOfSight(start, target, obstacles, 0.45)
    ? target
    : found;
}
