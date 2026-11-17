import * as T from "three";
export type State = "idle" | "walk" | "attack" | "hurt" | "howl" | "death";
export function wolfAtlas() {
  const t = new T.TextureLoader().load("/wolf-atlas.png");
  t.magFilter = T.NearestFilter;
  t.minFilter = T.NearestFilter;
  t.colorSpace = T.SRGBColorSpace;
  t.generateMipmaps = false;
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
  set(state: State, restart = false) {
    if (this.state !== state || restart) {
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
      // Keep the facing silhouette instead of flashing through four front poses.
      if (this.direction === 0) {
        row = 4;
        col = 0;
      } else col = 0;
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
