import * as T from "three";
import { heightAt, type Point } from "./logic";
export class PlayerReadability {
  marker: T.Mesh;
  range: T.Mesh;
  outlines: T.Sprite[] = [];
  constructor(scene: T.Scene) {
    this.marker = new T.Mesh(
      new T.RingGeometry(0.58, 0.67, 24),
      new T.MeshBasicMaterial({
        color: 0xffefb8,
        transparent: true,
        opacity: 0.85,
        side: T.DoubleSide,
        depthWrite: false,
        depthTest: false,
      }),
    );
    this.range = new T.Mesh(
      new T.RingGeometry(0.986, 1, 48),
      new T.MeshBasicMaterial({
        color: 0xffdda0,
        transparent: true,
        opacity: 0.3,
        side: T.DoubleSide,
        depthWrite: false,
        depthTest: false,
      }),
    );
    this.range.rotation.x = -Math.PI / 2;
    this.range.renderOrder = 18;
    this.range.visible = false;
    scene.add(this.range);
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.renderOrder = 18;
    scene.add(this.marker);
    for (let i = 0; i < 8; i++) {
      const sprite = new T.Sprite(
        new T.SpriteMaterial({
          color: 0xffedac,
          transparent: true,
          opacity: 0.85,
          depthTest: false,
          depthWrite: false,
          alphaTest: 0.35,
        }),
      );
      sprite.renderOrder = 19;
      sprite.visible = false;
      scene.add(sprite);
      this.outlines.push(sprite);
    }
  }
  update(
    hero: T.Sprite,
    camera: T.Camera,
    active: boolean,
    occluded: boolean,
    range = 0,
    showRange = false,
  ) {
    this.range.visible = active && showRange;
    this.range.scale.setScalar(range);
    this.range.position.set(
      hero.position.x,
      hero.position.y + 0.045,
      hero.position.z,
    );
    this.marker.visible = active;
    this.marker.position.set(
      hero.position.x,
      hero.position.y + 0.08,
      hero.position.z,
    );
    const right = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 0),
      up = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    for (let i = 0; i < 8; i++) {
      const s = this.outlines[i];
      s.visible = active && occluded;
      if (!s.visible) continue;
      s.material.map = hero.material.map;
      s.scale.copy(hero.scale);
      s.center.copy(hero.center);
      s.position
        .copy(hero.position)
        .addScaledVector(right, Math.cos((i * Math.PI) / 4) * 0.045)
        .addScaledVector(up, Math.sin((i * Math.PI) / 4) * 0.045);
    }
  }
}
export class CombatText {
  slots: {
    sprite: T.Sprite;
    canvas: HTMLCanvasElement;
    texture: T.CanvasTexture;
    life: number;
    p: Point;
    y: number;
  }[] = [];
  cursor = 0;
  constructor(scene: T.Scene) {
    for (let i = 0; i < 24; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 56;
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      texture.magFilter = texture.minFilter = T.NearestFilter;
      const sprite = new T.Sprite(
        new T.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        }),
      );
      sprite.renderOrder = 35;
      sprite.scale.set(2.25, 0.8, 1);
      sprite.visible = false;
      scene.add(sprite);
      this.slots.push({
        sprite,
        canvas,
        texture,
        life: 0,
        p: { x: 0, z: 0 },
        y: 0,
      });
    }
  }
  pop(p: Point, text: string, color = "#ffe6a5", small = false) {
    const slot =
        this.slots.find((s) => s.life <= 0) ||
        this.slots[this.cursor++ % this.slots.length],
      ctx = slot.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 160, 56);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${small ? 23 : 30}px Arial`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#11201c";
    ctx.strokeText(text, 80, 28);
    ctx.fillStyle = color;
    ctx.fillText(text, 80, 28);
    slot.texture.needsUpdate = true;
    slot.life = 0.7;
    slot.p = { ...p };
    slot.y = heightAt(p.x, p.z) + 1.6;
    slot.sprite.visible = true;
    slot.sprite.material.opacity = 1;
    slot.sprite.position.set(p.x, slot.y, p.z);
  }
  update(dt: number) {
    for (const s of this.slots) {
      s.life = Math.max(0, s.life - dt);
      s.sprite.visible = s.life > 0;
      if (s.life > 0) {
        s.y += dt * 0.9;
        s.sprite.position.set(s.p.x, s.y, s.p.z);
        s.sprite.material.opacity = Math.min(1, s.life * 4);
      }
    }
  }
  clear() {
    for (const s of this.slots) {
      s.life = 0;
      s.sprite.visible = false;
    }
  }
}
