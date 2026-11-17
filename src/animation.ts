import * as T from "three";
import type { AgentAsset } from "./agent-assets";
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
    public asset: AgentAsset,
  ) {
    this.texture = asset.texture.clone();
    this.texture.needsUpdate = true;
    (sprite.material as T.SpriteMaterial).map = this.texture;
    this.update(0);
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
    const f = this.asset.frames[row * 6 + col],
      [x, y, w, h] = f.rect;
    this.texture.repeat.set(w / this.asset.size[0], h / this.asset.size[1]);
    this.texture.offset.set(
      x / this.asset.size[0],
      1 - (y + h) / this.asset.size[1],
    );
    const scale = this.asset.height / this.asset.referenceHeight;
    this.sprite.scale.set(w * scale, h * scale, 1);
    this.sprite.center.set(f.pivot[0] / w, 1 - f.pivot[1] / h);
  }
}
