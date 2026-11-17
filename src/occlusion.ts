import * as T from "three";
import { opaqueAtUV, type SceneryAsset } from "./scenery-sprites";
export type FadingProp = { sprite: T.Sprite; hold: number; occluded: boolean };
export const OCCLUDED_OPACITY = 0.28;
export function fadeOpacity(current: number, hidden: boolean, dt: number) {
  return T.MathUtils.damp(current, hidden ? OCCLUDED_OPACITY : 1, 12, dt);
}
export class SceneryOcclusion {
  props: FadingProp[] = [];
  private hero?: T.Sprite;
  get hidden() {
    return this.props.some((p) => p.occluded);
  }
  private ray = new T.Raycaster();
  private right = new T.Vector3();
  private up = new T.Vector3();
  private point = new T.Vector3();
  private direction = new T.Vector3();
  constructor(private assets: SceneryAsset[]) {}
  register(sprite: T.Sprite) {
    this.props.push({ sprite, hold: 0, occluded: false });
  }
  update(camera: T.Camera, hero: T.Sprite, dt: number) {
    this.hero = hero;
    camera.updateMatrixWorld();
    hero.updateWorldMatrix(true, false);
    this.ray.camera = camera;
    this.right.setFromMatrixColumn(camera.matrixWorld, 0);
    this.up.setFromMatrixColumn(camera.matrixWorld, 1);
    const foot = hero.getWorldPosition(new T.Vector3()),
      cameraPosition = camera.getWorldPosition(new T.Vector3());
    const samples = [
      [0, 0.4],
      [0, 0.95],
      [0, 1.5],
      [-0.28, 0.95],
      [0.28, 0.95],
    ];
    for (const prop of this.props) {
      const sprite = prop.sprite;
      sprite.updateWorldMatrix(true, false);
      let hidden = false;
      if (
        Math.hypot(sprite.position.x - foot.x, sprite.position.z - foot.z) <
        sprite.scale.y + sprite.scale.x / 2 + 2
      ) {
        for (const [x, y] of samples) {
          this.point
            .copy(foot)
            .addScaledVector(this.right, x)
            .addScaledVector(this.up, y);
          this.direction.subVectors(this.point, cameraPosition);
          this.ray.far = this.direction.length() + 0.08;
          this.direction.normalize();
          this.ray.set(cameraPosition, this.direction);
          const hit = this.ray.intersectObject(sprite, false)[0];
          if (
            hit?.uv &&
            opaqueAtUV(
              this.assets[sprite.userData.atlas],
              sprite.material.map!,
              hit.uv,
            )
          ) {
            hidden = true;
            break;
          }
        }
      }
      prop.hold = hidden ? 0.16 : Math.max(0, prop.hold - dt);
      prop.occluded = hidden || prop.hold > 0;
      const opacity = fadeOpacity(sprite.material.opacity, prop.occluded, dt);
      // Scale the alpha cutoff with opacity so a faded sprite never vanishes entirely.
      sprite.material.opacity = opacity;
      sprite.material.alphaTest = (110 / 255) * opacity;
      sprite.material.depthWrite = opacity > 0.98;
      for (const child of sprite.children)
        if (child instanceof T.Sprite) child.material.opacity = opacity;
    }
    // Draw the agent after translucent occluders; overlapping billboard planes
    // must never erase the character even when several objects cover it.
    this.revealHero(this.props.some((p) => p.occluded));
  }
  private revealHero(hidden: boolean) {
    if (!this.hero) return;
    const material = this.hero.material;
    if (material.transparent !== hidden) {
      material.transparent = hidden;
      material.needsUpdate = true;
    }
    material.depthTest = !hidden;
    material.depthWrite = !hidden;
    this.hero.renderOrder = hidden ? 20 : 0;
  }
  reset() {
    this.revealHero(false);
    for (const p of this.props) {
      p.hold = 0;
      p.occluded = false;
      p.sprite.material.opacity = 1;
      p.sprite.material.alphaTest = 110 / 255;
      p.sprite.material.depthWrite = true;
    }
  }
}
