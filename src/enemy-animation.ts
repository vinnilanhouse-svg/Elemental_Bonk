import * as T from "three";
import manifest from "./enemy-frames.json";
import { enemyFrame, type EnemyAnimationState } from "./enemy-animation-state";
export type EnemyFrame = { rect: number[]; pivot: number[]; duration: number };
export type EnemyAsset = {
  name: string;
  kind: number;
  height: number;
  width: number;
  sourceHeight: number;
  referenceHeight: number;
  frames: EnemyFrame[];
  texture: T.Texture;
};
export async function loadEnemyAssets(
  progress: (loaded: number, total: number) => void = () => {},
): Promise<EnemyAsset[]> {
  let loaded = 0;
  let failed = false;
  const textures: T.Texture[] = [];
  const loader = new T.TextureLoader();
  return Promise.all(
    manifest.map(async (asset) => {
      const texture = await loader.loadAsync(asset.url);
      if (failed) {
        texture.dispose();
        throw new Error("Carregamento de sprites interrompido");
      }
      textures.push(texture);
      texture.colorSpace = T.SRGBColorSpace;
      texture.magFilter = T.NearestFilter;
      texture.minFilter = T.NearestFilter;
      texture.generateMipmaps = false;
      progress(++loaded, manifest.length);
      return {
        name: asset.id,
        kind: asset.kind,
        height: asset.worldHeight,
        width: asset.size[0],
        sourceHeight: asset.size[1],
        referenceHeight: asset.referenceHeight,
        frames: asset.frames,
        texture,
      };
    }),
  ).catch((error) => {
    failed = true;
    for (const texture of textures) texture.dispose();
    throw error;
  });
}
export class EnemyAnimator {
  state: EnemyAnimationState = "idle";
  time = 0;
  direction = 0;
  frame = 0;
  texture: T.Texture;
  disposed = false;
  constructor(
    public sprite: T.Sprite,
    public asset: EnemyAsset,
  ) {
    // Clones have independent UV transforms but share the uploaded source image.
    this.texture = asset.texture.clone();
    this.texture.needsUpdate = true;
    (sprite.material as T.SpriteMaterial).map = this.texture;
    this.apply();
  }
  set(state: EnemyAnimationState) {
    if (state !== this.state) {
      this.state = state;
      this.time = 0;
    }
    this.apply();
  }
  update(dt: number) {
    this.time += dt;
    this.apply();
  }
  private apply() {
    this.frame = enemyFrame(this.state, this.direction, this.time);
    const f = this.asset.frames[this.frame],
      [x, y, w, h] = f.rect,
      [px, py] = f.pivot;
    this.texture.repeat.set(w / this.asset.width, h / this.asset.sourceHeight);
    this.texture.offset.set(
      x / this.asset.width,
      1 - (y + h) / this.asset.sourceHeight,
    );
    const pixelScale = this.asset.height / this.asset.referenceHeight;
    this.sprite.scale.set(w * pixelScale, h * pixelScale, 1);
    this.sprite.center.set(px / w, 1 - py / h);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.texture.dispose();
    (this.sprite.material as T.Material).dispose();
  }
}
