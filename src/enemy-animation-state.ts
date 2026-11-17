export type EnemyAnimationState =
  "idle" | "walk" | "windup" | "attack" | "hurt" | "cast" | "death";
export const ENEMY_DEATH_DURATION = 0.78;
export function enemyDirection(x: number, z: number) {
  return Math.abs(x) > Math.abs(z) ? (x < 0 ? 2 : 3) : z < 0 ? 1 : 0;
}
export function enemyFrame(
  state: EnemyAnimationState,
  direction: number,
  time: number,
) {
  const row = Math.max(0, Math.min(3, direction));
  if (state === "death")
    return 30 + Math.min(5, Math.floor((time + 1e-8) / 0.13));
  if (state === "hurt") return row === 0 ? 24 : row * 6;
  if (state === "cast") return 28 + Math.min(1, Math.floor(time / 0.18));
  if (state === "windup") return row * 6 + 4;
  if (state === "attack") return row * 6 + 5;
  if (state === "walk") return row * 6 + 1 + (Math.floor(time / 0.13) % 3);
  return row * 6;
}
