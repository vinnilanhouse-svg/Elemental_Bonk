import * as T from "three";
import type { Point } from "./logic";
export type Enemy = Point & {
  id: number;
  kind: number;
  hp: number;
  maxHp: number;
  speed: number;
  cooldown: number;
  slow: number;
  windup: number;
  hit: number;
  mesh: T.Sprite;
  dead: boolean;
  nav?: Point;
  navClock: number;
};
export type Projectile = Point & {
  vx: number;
  vz: number;
  life: number;
  damage: number;
  mesh: T.Mesh;
};
export type Gem = Point & { value: number; attracted?: boolean; mesh: T.Mesh };
export type Effect = { mesh: T.Mesh; life: number; max: number; grow: number };
