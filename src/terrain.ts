// Shared geometry contract for terrain, collisions, water, navigation and minimap.
export const WORLD = {
  width: 120,
  depth: 112,
  limitX: 56,
  limitZ: 52,
  bridgeZ: 0,
  bridgeHalfWidth: 2.3,
  spawn: { x: 0, z: 4 },
} as const;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export function riverAt(z: number) {
  return {
    center: 10.5 + Math.sin(z * 0.12) + 0.45 * Math.sin(z * 0.35),
    halfWidth: 1.6 + 0.25 * Math.sin(z * 0.18 + 0.3),
  };
}
export function inRiver(x: number, z: number, radius = 0) {
  const r = riverAt(z);
  return (
    Math.abs(z) > WORLD.bridgeHalfWidth - radius &&
    Math.abs(x - r.center) < r.halfWidth + radius
  );
}
export function landHeight(x: number, z: number) {
  const old =
    x < -13 && z < -5 ? Math.min(2, (-x - 13) * 0.3, (-z - 5) * 0.35) : 0;
  const cliff = 3.2 * Math.min(clamp((-x - 27) / 0.8), clamp((-z - 21) / 0.8));
  const ramp = 1 - smooth(2.5, 5, Math.abs(z + 25));
  const northwest =
    cliff * (1 - ramp) + Math.min(cliff, 3.2 * smooth(26, 39, -x)) * ramp;
  const east = 1.7 * smooth(26, 39, x) * smooth(6, 23, -z);
  const ruins = 1.8 * smooth(22, 35, -x) * smooth(21, 34, z);
  const swamp = -0.3 * smooth(26, 40, x) * smooth(13, 28, z);
  return old + northwest + east + ruins + swamp;
}
export function terrainHeight(x: number, z: number) {
  const r = riverAt(z),
    edge = Math.abs(x - r.center) - r.halfWidth;
  if (Math.abs(z) <= WORLD.bridgeHalfWidth && edge < 0.6) return 0;
  if (edge < 0.9)
    return landHeight(x, z) - (1 - smooth(-0.15, 0.9, edge)) * 1.15;
  return landHeight(x, z);
}
export function terrainSlope(x: number, z: number) {
  const d = 0.3;
  return (
    Math.max(
      Math.abs(terrainHeight(x + d, z) - terrainHeight(x - d, z)),
      Math.abs(terrainHeight(x, z + d) - terrainHeight(x, z - d)),
    ) /
    (2 * d)
  );
}
