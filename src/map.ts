import { WORLD, riverAt, terrainSlope } from "./terrain";
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
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -64;
    sun.shadow.camera.right = 64;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.camera.far = 180;
    this.scene.add(sun);
    this.build();
    this.groundShadows();
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
    grass.repeat.set(WORLD.width / 4, WORLD.depth / 4);
    const geo = new T.PlaneGeometry(WORLD.width, WORLD.depth, 180, 168);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position,
      colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i);
      pos.setY(i, heightAt(x, z) - 0.06);
      const zone = zoneAt(x, z),
        color = new T.Color(zone.color),
        r = riverAt(z),
        edge = Math.abs(x - r.center) - r.halfWidth;
      const blended = new T.Color(0, 0, 0);
      for (const [dx, dz] of [
        [0, 0],
        [-1.8, 0],
        [1.8, 0],
        [0, -1.8],
        [0, 1.8],
      ]) {
        const sample = new T.Color(zoneAt(x + dx, z + dz).color);
        blended.r += sample.r / 5;
        blended.g += sample.g / 5;
        blended.b += sample.b / 5;
      }
      color.copy(blended);
      if (edge < 1.4 && edge > -0.2) color.lerp(new T.Color("#9e9474"), 0.65);
      if (terrainSlope(x, z) > 1.1) color.set("#756c55");
      color.toArray(colors, i * 3);
    }
    geo.setAttribute("color", new T.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const terrain = new T.Mesh(
      geo,
      new T.MeshStandardMaterial({
        map: grass,
        vertexColors: true,
        roughness: 1,
      }),
    );
    terrain.name = "explorable-terrain";
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    this.scene.add(terrain);
    this.path(false);
    this.path(true);
    this.path(false, -24, -25, 0);
    this.path(true, -25, -45, -22);
    const waterTexture = this.texture([
      "#6b999c",
      "#78a6a6",
      "#8db5ae",
      "#56878e",
    ]);
    waterTexture.repeat.set(1, 13);
    const waterGeo = new T.BufferGeometry(),
      wv: number[] = [],
      wu: number[] = [],
      wi: number[] = [];
    for (let i = 0; i <= 224; i++) {
      const z = -56 + i * 0.5,
        r = riverAt(z);
      for (const side of [-1, 1]) {
        wv.push(r.center + side * r.halfWidth, -0.64, z);
        wu.push(side < 0 ? 0 : 1, i / 8);
      }
      if (i < 224) {
        const n = i * 2;
        wi.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
      }
    }
    waterGeo.setAttribute("position", new T.Float32BufferAttribute(wv, 3));
    waterGeo.setAttribute("uv", new T.Float32BufferAttribute(wu, 2));
    waterGeo.setIndex(wi);
    waterGeo.computeVertexNormals();
    waterTexture.repeat.set(1, 1);
    this.water = new T.Mesh(
      waterGeo,
      new T.MeshStandardMaterial({
        map: waterTexture,
        roughness: 0.45,
        side: T.DoubleSide,
      }),
    );
    this.water.name = "curved-river";
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
    for (let i = 0; i < 210; i++) {
      const x = (rand() - 0.5) * 110,
        z = (rand() - 0.5) * 102;
      if (
        (Math.abs(z + 25) < 3.5 && x > -47 && x < -21) ||
        (Math.abs(x + 24) < 3.5 && z > -28 && z < 3) ||
        Math.abs(x) < 3.5 ||
        Math.abs(z) < 3.6 ||
        Math.hypot(x, z - 4) < 13 ||
        Math.abs(x - riverAt(z).center) < 4 ||
        (x > -12 && x < -2 && z > -14 && z < -2) ||
        ZONES.slice(1).some((a) => distance({ x, z }, a.anchor) < 7)
      )
        continue;
      const s = 0.72 + rand() * 0.35,
        zone = zoneAt(x, z);
      const kind =
        zone.id === 2
          ? "nightTree"
          : zone.id === 3
            ? "autumnTree"
            : zone.id === 4
              ? "swampTree"
              : (["oak", "pine", "willow"] as const)[i % 3];
      const sprite = this.prop(kind, x, z, (kind === "pine" ? 3.4 : 4.1) * s);
      if (zone.id === 5) sprite.material.color.set("#b0c3b4");
      this.obstacles.push({ x, z, r: 0.65 * s });
    }
    for (let i = 0; i < 27; i++) {
      const x = (rand() - 0.5) * 106,
        z = (rand() - 0.5) * 100;
      if (
        (Math.abs(z + 25) < 3.5 && x > -47 && x < -21) ||
        (Math.abs(x + 24) < 3.5 && z > -28 && z < 3) ||
        Math.abs(x) < 4 ||
        Math.abs(z) < 4 ||
        Math.abs(x - riverAt(z).center) < 4 ||
        ZONES.slice(1).some((a) => distance({ x, z }, a.anchor) < 7)
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
      const x = (rand() - 0.5) * 110,
        z = (rand() - 0.5) * 106;
      if (
        Math.abs(x) < 3 ||
        Math.abs(z) < 3 ||
        Math.abs(x - riverAt(z).center) < 4
      )
        continue;
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
      { x: -44, z: -34, r: 1 },
      { x: 40.6, z: -35, r: 0.45 },
      { x: 43.4, z: -35, r: 0.45 },
      { x: 45, z: 40, r: 0.7 },
    );
    this.prop("nightPlants", -41, -35, 2.5);
    this.prop("corruptRock", -44, -34, 2.3);
    this.prop("autumnArch", 42, -35, 4);
    this.prop("autumnPlants", 39, -34, 1.8);
    this.prop("swampTree", 45, 40, 4.2);
    this.prop("boardwalk", 40, 37, 3.5);
    this.prop("reeds", 43, 36, 2);
    this.prop("ruinArch", -41, 44, 5);
    this.prop("pillars", -45, 40, 2.7);
    this.prop("ritual", -41, 40, 3.8);
    this.obstacles.push(
      { x: -42.7, z: 44, r: 0.5 },
      { x: -39.3, z: 44, r: 0.5 },
      { x: -45, z: 40, r: 0.65 },
    );
    for (let i = 0; i < 18; i++) {
      const x = 32 + rand() * 20,
        z = 28 + rand() * 20;
      this.pool(x, z, 0.7 + rand() * 1.2);
    }
    this.sign(1.6, -1.8, "01 / MATA VIVA");
    this.sign(-24, -22, "02 / BOSQUE");
    this.sign(27, -14, "03 / OUTONO");
    this.sign(26, 22, "04 / PANTANO");
    this.sign(-23, 25, "05 / RUINAS");
    this.fireflies(-41, -35, 0x8ae3e0);
    this.fireflies(-41, 40, 0xc6a0dc);
  }
  groundShadows() {
    const vertices: number[] = [],
      colors: number[] = [],
      indices: number[] = [];
    for (const prop of this.props) {
      const { x, z } = prop.position,
        r = Math.min(1.5, prop.scale.x * 0.19),
        n = vertices.length / 3;
      vertices.push(x, heightAt(x, z) + 0.025, z);
      colors.push(0, 0, 0, 0.23);
      for (let i = 0; i <= 16; i++) {
        const a = (i * Math.PI) / 8,
          px = x + Math.cos(a) * r,
          pz = z + Math.sin(a) * r * 0.52;
        vertices.push(px, heightAt(px, pz) + 0.025, pz);
        colors.push(0, 0, 0, 0);
        if (i < 16) indices.push(n, n + i + 1, n + i + 2);
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    geo.setAttribute("color", new T.Float32BufferAttribute(colors, 4));
    geo.setIndex(indices);
    const mesh = new T.Mesh(
      geo,
      new T.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    mesh.name = "ground-contact-shadows";
    this.scene.add(mesh);
  }
  path(horizontal: boolean, offset = 0, start = -54, end = 54) {
    const tex = this.texture(["#ab9270", "#b6a17d", "#9b8768", "#c2ad87"]);
    tex.repeat.set(1, 1);
    const vertices: number[] = [],
      uv: number[] = [],
      indices: number[] = [],
      colors: number[] = [];
    const sides = [-1.3, -1, 0, 1, 1.3],
      rows = Math.ceil((end - start) / 0.5);
    for (let i = 0; i <= rows; i++) {
      const t = start + i * 0.5,
        curve = offset + (offset ? 0.12 : 1.2) * Math.sin(t * 0.1),
        width = 1.65 + 0.3 * Math.sin(t * 0.31);
      for (const side of sides) {
        const x = horizontal ? t : curve + side * width,
          z = horizontal ? curve + side * width : t;
        vertices.push(x, heightAt(x, z) + 0.02, z);
        uv.push((side + 1.3) / 2.6, (t + 54) / 8);
        colors.push(1, 1, 1, Math.abs(side) > 1 ? 0 : 0.95);
      }
      if (i < rows)
        for (let c = 0; c < 4; c++) {
          const n = i * 5 + c;
          indices.push(n, n + 5, n + 1, n + 1, n + 5, n + 6);
        }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.setAttribute("color", new T.Float32BufferAttribute(colors, 4));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    this.scene.add(
      new T.Mesh(
        geo,
        new T.MeshStandardMaterial({
          map: tex,
          vertexColors: true,
          transparent: true,
          depthWrite: false,
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
    mesh.position.set(x, heightAt(x, z) + 0.025, z);
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
  update(camera: T.Camera, hero: T.Sprite, dt: number, animate = true) {
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
    if (animate) this.time += dt;
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
