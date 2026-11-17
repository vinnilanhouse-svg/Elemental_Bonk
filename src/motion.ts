export function stableDirection(current: number, x: number, z: number) {
  if (Math.hypot(x, z) < 0.001) return current;
  const horizontal = current >= 2;
  if (
    horizontal
      ? Math.abs(z) > Math.abs(x) * 1.2
      : Math.abs(x) <= Math.abs(z) * 1.2
  )
    return z < 0 ? 1 : 0;
  return x < 0 ? 2 : 3;
}
