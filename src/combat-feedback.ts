import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as T from "three";
import { heightAt, type Point } from "./logic";
export type AttackSignal = {
  group: T.Group;
  source: Point & { dead?: boolean };
  team: "player" | "enemy";
  phase: "windup" | "impact" | "evade";
  life: number;
  max: number;
};
export class CombatFeedback {
  signals: AttackSignal[] = [];
  private warning: T.Texture;
  constructor(private scene: T.Scene) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 48;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f4b15b";
    ctx.beginPath();
    ctx.moveTo(24, 2);
    ctx.lineTo(46, 44);
    ctx.lineTo(2, 44);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#4d241e";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#4d241e";
    ctx.fillRect(21, 15, 6, 14);
    ctx.fillRect(21, 33, 6, 6);
    this.warning = new T.CanvasTexture(canvas);
    this.warning.magFilter = T.NearestFilter;
    this.warning.minFilter = T.NearestFilter;
    this.warning.colorSpace = T.SRGBColorSpace;
  }
  emit(
    source: Point & { dead?: boolean },
    heading: Point,
    radius: number,
    team: "player" | "enemy",
    phase: "windup" | "impact",
    duration = 0.24,
    shape: "cone" | "circle" | "line" = "cone",
    height = 1.5,
  ) {
    if (this.signals.length >= 48) this.remove(this.signals.shift()!);
    const group = new T.Group(),
      color = team === "player" ? 0xffe4a3 : 0xf18e59;
    const material = () =>
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide,
        depthWrite: false,
        depthTest: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
    group.renderOrder = 31;
    const start = Math.atan2(-heading.z, heading.x) - 1.15;
    const rings = team === "player" && phase === "impact" ? 3 : 1,
      parts: T.BufferGeometry[] = [];
    for (let i = 0; i < rings; i++) {
      const r = (shape === "line" ? 0.65 : radius) * (1 - i * 0.18),
        geo = new T.RingGeometry(
          Math.max(0.05, r - (phase === "windup" ? 0.1 : 0.12)),
          r,
          40,
          1,
          shape === "circle" || shape === "line" ? 0 : start,
          shape === "circle" || shape === "line" ? Math.PI * 2 : 2.3,
        );
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, 0.08 + i * 0.012, 0);
      parts.push(geo);
    }
    if (shape === "line")
      for (let i = 0; i < 5; i++) {
        const geo = new T.BoxGeometry(0.18, 0.025, radius / 8);
        geo.rotateY(Math.atan2(heading.x, heading.z));
        geo.translate(
          (heading.x * radius * (i + 0.5)) / 5,
          0.09,
          (heading.z * radius * (i + 0.5)) / 5,
        );
        parts.push(geo);
      }
    const merged = mergeGeometries(parts)!;
    for (const part of parts) part.dispose();
    const mesh = new T.Mesh(merged, material());
    mesh.renderOrder = 31;
    group.add(mesh);
    if (phase === "windup") {
      const icon = new T.Sprite(
        new T.SpriteMaterial({
          map: this.warning,
          transparent: true,
          depthWrite: false,
          depthTest: false,
        }),
      );
      icon.renderOrder = 32;
      icon.position.y = height + 0.35;
      icon.scale.set(0.5, 0.5, 1);
      group.add(icon);
    }
    group.position.set(source.x, heightAt(source.x, source.z), source.z);
    this.scene.add(group);
    const signal: AttackSignal = {
      group,
      source,
      team,
      phase,
      life: duration,
      max: duration,
    };
    this.signals.push(signal);
    return signal;
  }
  update(dt: number) {
    this.signals = this.signals.filter((signal) => {
      signal.life -= dt;
      if (signal.life <= 0 || signal.source.dead) {
        this.remove(signal);
        return false;
      }
      signal.group.position.set(
        signal.source.x,
        heightAt(signal.source.x, signal.source.z),
        signal.source.z,
      );
      const t = 1 - signal.life / signal.max;
      if (signal.phase === "impact") signal.group.scale.setScalar(1 + t * 0.12);
      signal.group.traverse((o) => {
        if (o instanceof T.Mesh)
          (o.material as T.MeshBasicMaterial).opacity =
            signal.phase === "windup" ? 0.35 + t * 0.5 : 0.9 * (1 - t);
      });
      return true;
    });
  }
  evade(source: Point) {
    this.emit(
      { ...source },
      { x: 0, z: 1 },
      0.9,
      "player",
      "impact",
      0.3,
      "circle",
    );
    const signal = this.signals[this.signals.length - 1];
    signal.phase = "evade";
    signal.group.traverse((o) => {
      if (o instanceof T.Mesh)
        (o.material as T.MeshBasicMaterial).color.set(0x9fd6be);
    });
  }
  cancelSource(source: Point) {
    this.signals = this.signals.filter((signal) => {
      if (signal.source !== source) return true;
      this.remove(signal);
      return false;
    });
  }
  clear() {
    for (const signal of this.signals) this.remove(signal);
    this.signals = [];
  }
  private remove(signal: AttackSignal) {
    this.scene.remove(signal.group);
    signal.group.traverse((o) => {
      if (o instanceof T.Mesh) o.geometry.dispose();
      if (o instanceof T.Mesh || o instanceof T.Sprite)
        (o.material as T.Material).dispose();
    });
  }
}
