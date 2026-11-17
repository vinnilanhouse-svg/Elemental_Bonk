import * as T from "three";
import { heightAt, distance, type Obstacle } from "./logic";
import {
  propSprite,
  type SceneryAsset,
  type PropKind,
} from "./scenery-sprites";
import { SceneryOcclusion } from "./occlusion";
import { ZONES, zoneAt } from "./zones";
export class World {
  scene = new T.Scene();
  obstacles: Obstacle[] = [];
  occlusion: SceneryOcclusion;
  props: T.Sprite[] = [];
  water!: T.Mesh;
  private labels: { prop: T.Sprite; label: T.Sprite }[] = [];
  private time = 0;
  private ambient: { sprite: T.Sprite; base: number; phase: number }[] = [];
  constructor(public assets: SceneryAsset[]) {
    this.occlusion = new SceneryOcclusion(assets);
    this.scene.background = new T.Color("#233c2c");
    this.scene.fog = new T.FogExp2("#344b37", 0.009);
    this.scene.add(new T.HemisphereLight("#f2e7c7", "#3c5142", 1.8));
    const sun = new T.DirectionalLight("#fff0d0", 1.5);
    sun.position.set(-15, 30, 14);
    this.scene.add(sun);
    this.build();
  }
  texture(colors: string[], seed = 1) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const x = seed % 128;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const y = seed % 128;
      ctx.fillStyle = colors[seed % colors.length];
      ctx.fillRect(x, y, i % 3 ? 2 : 4, 2);
    }
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.magFilter = T.NearestFilter;
    t.minFilter = T.NearestFilter;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  prop(kind: PropKind, x: number, z: number, width: number) {
    const sprite = propSprite(this.assets, kind, width);
    sprite.position.set(x, heightAt(x, z), z);
    this.scene.add(sprite);
    this.props.push(sprite);
    this.occlusion.register(sprite);
    return sprite;
  }
  build() {
    const grass = this.texture(["#bdc7a7", "#b7c29f", "#cad1b5", "#a9b897"]);
    grass.repeat.set(14, 13);
    const geo = new T.PlaneGeometry(60, 56, 120, 112);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position,
      colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i);
      pos.setY(i, heightAt(x, z) - 0.06);
      new T.Color(zoneAt(x, z).color).toArray(colors, i * 3);
    }
    geo.setAttribute("color", new T.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    this.scene.add(
      new T.Mesh(
        geo,
        new T.MeshStandardMaterial({
          map: grass,
          vertexColors: true,
          roughness: 1,
        }),
      ),
    );
    this.path(false);
    this.path(true);
    const waterTexture = this.texture([
      "#6b999c",
      "#78a6a6",
      "#8db5ae",
      "#56878e",
    ]);
    waterTexture.repeat.set(1, 13);
    this.water = new T.Mesh(
      new T.PlaneGeometry(3, 56),
      new T.MeshBasicMaterial({ map: waterTexture }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(10.5, -0.03, 0);
    this.scene.add(this.water);
    this.prop("bridge", 10.5, 1.7, 5.2);
    this.prop("station", -7, -10, 7.6);
    this.obstacles.push({ x: -7, z: -10, r: 4 });
    this.prop("van", -7, -4, 3.5);
    this.obstacles.push({ x: -7, z: -4, r: 1.7 });
    this.prop("crates", -11, -6, 1.4);
    this.obstacles.push({ x: -11, z: -6, r: 0.6 });
    let seed = 81;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 155; i++) {
      const x = (rand() - 0.5) * 56,
        z = (rand() - 0.5) * 51;
      if (
        Math.abs(x) < 3.5 ||
        Math.abs(z) < 3.6 ||
        Math.hypot(x, z) < 8 ||
        (x > 7 && x < 14) ||
        (x > -12 && x < -2 && z > -14 && z < -2) ||
        ZONES.slice(1).some((a) => distance({ x, z }, a.anchor) < 4.8)
      )
        continue;
      const s = 0.75 + rand() * 0.6,
        zone = zoneAt(x, z);
      const kind =
        zone.id === 2
          ? "nightTree"
          : zone.id === 3
            ? "autumnTree"
            : zone.id === 4
              ? "swampTree"
              : (["oak", "pine", "willow"] as const)[i % 3];
      const sprite = this.prop(kind, x, z, (kind === "pine" ? 4.2 : 5.8) * s);
      if (zone.id === 5) sprite.material.color.set("#b0c3b4");
      this.obstacles.push({ x, z, r: 0.65 * s });
    }
    for (let i = 0; i < 27; i++) {
      const x = (rand() - 0.5) * 52,
        z = (rand() - 0.5) * 49;
      if (
        Math.abs(x) < 4 ||
        Math.abs(z) < 4 ||
        (x > 7 && x < 14) ||
        ZONES.slice(1).some((a) => distance({ x, z }, a.anchor) < 4.8)
      )
        continue;
      const zone = zoneAt(x, z);
      this.prop(
        zone.id === 2 ? "corruptRock" : "rock",
        x,
        z,
        1.5 + rand() * 0.6,
      );
      this.obstacles.push({ x, z, r: 0.7 });
    }
    for (let i = 0; i < 95; i++) {
      const x = (rand() - 0.5) * 56,
        z = (rand() - 0.5) * 52;
      if (Math.abs(x) < 3 || Math.abs(z) < 3 || (x > 8 && x < 13)) continue;
      const id = zoneAt(x, z).id;
      this.prop(
        id === 2
          ? "nightPlants"
          : id === 3
            ? "autumnPlants"
            : id === 4
              ? "reeds"
              : i % 3
                ? "bush"
                : "flowers",
        x,
        z,
        0.65 + rand() * 0.9,
      );
    }
    this.obstacles.push(
      { x: -22, z: -16, r: 1 },
      { x: 18.6, z: -17, r: 0.45 },
      { x: 21.4, z: -17, r: 0.45 },
      { x: 23, z: 19, r: 0.7 },
    );
    this.prop("nightPlants", -19, -17, 2.5);
    this.prop("corruptRock", -22, -16, 2.3);
    this.prop("autumnArch", 20, -17, 4);
    this.prop("autumnPlants", 17, -16, 1.8);
    this.prop("swampTree", 23, 19, 5.7);
    this.prop("boardwalk", 18, 16, 3.5);
    this.prop("reeds", 21, 15, 2);
    this.prop("ruinArch", -19, 21, 5);
    this.prop("pillars", -23, 17, 2.7);
    this.prop("ritual", -19, 17, 3.8);
    this.obstacles.push(
      { x: -20.7, z: 21, r: 0.5 },
      { x: -17.3, z: 21, r: 0.5 },
      { x: -23, z: 17, r: 0.65 },
    );
    for (let i = 0; i < 18; i++) {
      const x = 15 + rand() * 10,
        z = 11 + rand() * 12;
      this.pool(x, z, 0.7 + rand() * 1.2);
    }
    this.sign(1.6, -1.8, "01 / MATA VIVA");
    this.sign(-11, -15, "02 / BOSQUE");
    this.sign(16, -5, "03 / OUTONO");
    this.sign(15, 9, "04 / PANTANO");
    this.sign(-11, 11, "05 / RUINAS");
    this.fireflies(-19, -17, 0x8ae3e0);
    this.fireflies(-19, 17, 0xc6a0dc);
  }
  path(horizontal: boolean) {
    const tex = this.texture(["#ab9270", "#b6a17d", "#9b8768", "#c2ad87"]);
    tex.repeat.set(1, 13);
    const vertices: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= 104; i++) {
      const t = -26 + i * 0.5,
        curve = 0.7 * Math.sin(t * 0.19);
      for (const side of [-1, 1]) {
        const x = horizontal ? t : curve + side * 1.65,
          z = horizontal ? curve + side * 1.65 : t;
        vertices.push(x, heightAt(x, z) + 0.012, z);
        uv.push(side === -1 ? 0 : 1, i / 104);
      }
      if (i < 104) {
        const n = i * 2;
        indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    this.scene.add(
      new T.Mesh(
        geo,
        new T.MeshStandardMaterial({
          map: tex,
          side: T.DoubleSide,
          roughness: 1,
        }),
      ),
    );
  }
  pool(x: number, z: number, size: number) {
    const mesh = new T.Mesh(
      new T.CircleGeometry(size, 18),
      new T.MeshBasicMaterial({
        color: "#456b70",
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.y = 0.6;
    mesh.position.set(x, 0.004, z);
    this.scene.add(mesh);
  }
  sign(x: number, z: number, text: string) {
    const sprite = this.prop("sign", x, z, 1.7);
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = "#eee7bb";
    g.font = "bold 22px monospace";
    g.textAlign = "center";
    g.fillText(text, 128, 39);
    const t = new T.CanvasTexture(c);
    t.magFilter = T.NearestFilter;
    t.minFilter = T.NearestFilter;
    t.colorSpace = T.SRGBColorSpace;
    const label = new T.Sprite(
      new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false }),
    );
    label.scale.set(sprite.scale.x * 0.8, sprite.scale.y * 0.18, 1);
    label.renderOrder = 1;
    this.scene.add(label);
    this.labels.push({ prop: sprite, label });
  }
  fireflies(x: number, z: number, color: number) {
    for (let i = 0; i < 8; i++) {
      const material = new T.SpriteMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const sprite = new T.Sprite(material);
      sprite.scale.set(0.055, 0.055, 1);
      sprite.position.set(
        x + Math.sin(i * 2.4) * 3,
        0.4 + i * 0.12,
        z + Math.cos(i * 1.8) * 3,
      );
      this.scene.add(sprite);
      this.ambient.push({ sprite, base: sprite.position.y, phase: i });
    }
  }
  update(camera: T.Camera, hero: T.Sprite, dt: number) {
    this.occlusion.update(camera, hero, dt);
    const up = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 1),
      toward = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 2);
    for (const item of this.labels) {
      item.label.position
        .copy(item.prop.position)
        .addScaledVector(up, item.prop.scale.y * 0.68)
        .addScaledVector(toward, 0.025);
      item.label.material.opacity = item.prop.material.opacity;
    }
    this.time += dt;
    for (const a of this.ambient)
      a.sprite.position.y = a.base + Math.sin(this.time * 1.4 + a.phase) * 0.12;
    const zone = zoneAt(hero.position.x, hero.position.z),
      bg = new T.Color(
        zone.id === 2
          ? "#172837"
          : zone.id === 4
            ? "#354a4d"
            : zone.id === 5
              ? "#29372e"
              : "#233c2c",
      );
    (this.scene.background as T.Color).lerp(bg, 1 - Math.exp(-dt * 2));
    const fog = this.scene.fog as T.FogExp2;
    fog.color.lerp(bg, 1 - Math.exp(-dt * 2));
    fog.density = T.MathUtils.damp(
      fog.density,
      zone.id === 4 ? 0.018 : 0.009,
      2,
      dt,
    );
  }
}
