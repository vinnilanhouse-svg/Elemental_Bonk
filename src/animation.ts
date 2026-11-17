import * as T from "three";
export type State = "idle" | "walk" | "attack" | "hurt" | "howl" | "death";
// Replacement atlas contract: pixel rectangles, foot pivot and seconds per frame.
export const frames = Array.from({ length: 6 }, (_, row) =>
  Array.from({ length: 6 }, (_, col) => ({
    rect: [col * 48, row * 56, 48, 56],
    pivot: [24, 52],
    duration: row === 5 ? 0.12 : 0.14,
  })),
);
export function wolfAtlas() {
  const t = new T.TextureLoader().load("/wolf-atlas.png");
  t.magFilter = T.NearestFilter;
  t.minFilter = T.NearestFilter;
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
export class Animator {
  texture: T.Texture;
  state: State = "idle";
  time = 0;
  direction = 0;
  constructor(
    public sprite: T.Sprite,
    atlas: T.Texture,
  ) {
    this.texture = atlas;
    this.texture.repeat.set(1 / 6, 1 / 6);
    (sprite.material as T.SpriteMaterial).map = this.texture;
  }
  set(state: State) {
    if (this.state !== state) {
      this.state = state;
      this.time = 0;
    }
  }
  update(dt: number) {
    this.time += dt;
    let row = this.direction,
      col = 0;
    if (this.state === "walk") col = 1 + (Math.floor(this.time / 0.14) % 3);
    if (this.state === "attack") col = this.time < 0.14 ? 4 : 5;
    if (this.state === "hurt") {
      row = 4;
      col = Math.floor(this.time / 0.1) % 4;
    }
    if (this.state === "howl") {
      row = 4;
      col = 4 + (Math.floor(this.time / 0.2) % 2);
    }
    if (this.state === "death") {
      row = 5;
      col = Math.min(5, Math.floor(this.time / 0.12));
    }
    this.texture.offset.set(col / 6, 1 - (row + 1) / 6);
  }
}
