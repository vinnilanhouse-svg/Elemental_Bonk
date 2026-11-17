import * as T from "three";
import { heightAt, type Obstacle } from "./logic";
export class World {
  scene = new T.Scene();
  obstacles: Obstacle[] = [];
  water!: T.Mesh;
  constructor() {
    this.scene.background = new T.Color("#192d27");
    this.scene.fog = new T.FogExp2("#243d32", 0.013);
    this.scene.add(new T.HemisphereLight("#f8e9c6", "#334d3b", 2.6));
    const sun = new T.DirectionalLight("#ffebc0", 3.2);
    sun.position.set(-15, 30, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -32;
    sun.shadow.camera.right = 32;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    this.scene.add(sun);
    this.build();
  }
  texture(colors: string[], seed = 1) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    for (let y = 0; y < 64; y += 2)
      for (let x = 0; x < 64; x += 2) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        g.fillStyle = colors[seed % colors.length];
        g.fillRect(x, y, 2, 2);
      }
    const t = new T.CanvasTexture(c);
    t.magFilter = T.NearestFilter;
    t.minFilter = T.NearestFilter;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  material(color: string) {
    return new T.MeshStandardMaterial({ color, roughness: 1 });
  }
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
  ) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), this.material(color));
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }
  build() {
    const grass = this.texture([
      "#526644",
      "#536b44",
      "#5a704a",
      "#62764c",
      "#65764d",
    ]);
    grass.repeat.set(18, 16);
    const geo = new T.PlaneGeometry(60, 56, 120, 112);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++)
      pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)) - 0.06);
    geo.computeVertexNormals();
    const ground = new T.Mesh(
      geo,
      new T.MeshStandardMaterial({ map: grass, roughness: 1 }),
    );
    ground.receiveShadow = true;
    this.scene.add(ground);
    const path = this.texture(["#ac9770", "#b59e76", "#a58c65", "#bcaa80"]);
    path.repeat.set(2, 12);
    const road = new T.Mesh(
      new T.PlaneGeometry(5, 52),
      new T.MeshStandardMaterial({ map: path }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.005, 0);
    road.receiveShadow = true;
    this.scene.add(road);
    const cross = road.clone();
    cross.rotation.z = Math.PI / 2;
    cross.scale.set(0.85, 1, 1);
    cross.position.set(0, 0.015, 0);
    this.scene.add(cross);
    this.water = this.box(10.5, -0.35, 0, 3, 0.32, 56, "#618e93");
    for (let z = -26; z < 28; z += 2)
      this.box(10.5, 0.0, z, 2.8, 0.025, 0.09, "#88b1b0");
    this.box(10.5, 0.05, 0, 4.5, 0.22, 4.5, "#97805c");
    for (let x = 8.2; x < 13; x += 0.35)
      this.box(x, 0.28, 0, 0.06, 0.025, 4.5, "#5c513d");
    for (const z of [-2.1, 2.1]) {
      this.box(10.5, 0.3, z, 4.8, 0.15, 0.12, "#564c38");
      for (const x of [8.3, 10.5, 12.7])
        this.box(x, 0.2, z, 0.15, 0.7, 0.15, "#716044");
    }
    // Research station, its roof and the agency van.
    this.box(-7, 0, -10, 7, 2.8, 4, "#c4c5aa");
    this.box(-7, 2.8, -10, 7.5, 0.4, 4.6, "#334d45");
    this.box(-7, 1, -7.96, 1.1, 1.8, 0.08, "#35473f");
    for (const x of [-9, -5]) this.box(x, 1.3, -7.94, 1.4, 0.8, 0.1, "#92b7ae");
    this.obstacles.push({ x: -7, z: -10, r: 4 });
    this.box(-7, 0.35, -4, 3.2, 1.5, 1.6, "#d9d1b4");
    this.box(-6.3, 1.85, -4, 1.3, 0.6, 1.5, "#d9d1b4");
    this.box(-5.62, 1.9, -4, 0.05, 0.45, 1.2, "#638b86");
    for (const x of [-8, -6])
      for (const z of [-4.8, -3.2])
        this.box(x, 0.12, z, 0.6, 0.65, 0.24, "#28352e");
    this.obstacles.push({ x: -7, z: -4, r: 1.7 });
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
        (x > -12 && x < -2 && z > -14 && z < -2)
      )
        continue;
      const h = heightAt(x, z),
        s = 0.75 + rand() * 0.6;
      this.tree(x, h, z, s, i % 3);
      this.obstacles.push({ x, z, r: 0.65 * s });
    }
    for (let i = 0; i < 27; i++) {
      const x = (rand() - 0.5) * 52,
        z = (rand() - 0.5) * 49;
      if (Math.abs(x) < 4 || Math.abs(z) < 4 || (x > 7 && x < 14)) continue;
      const rock = new T.Mesh(
        new T.DodecahedronGeometry(0.6 + rand() * 0.55, 0),
        this.material("#8d947e"),
      );
      rock.position.set(x, heightAt(x, z) + 0.3, z);
      rock.scale.y = 0.7;
      rock.castShadow = true;
      this.scene.add(rock);
      this.obstacles.push({ x, z, r: 0.7 });
    }
    for (let i = 0; i < 160; i++) {
      const x = (rand() - 0.5) * 56,
        z = (rand() - 0.5) * 52;
      if (Math.abs(x) < 3 || Math.abs(z) < 3) continue;
      this.box(
        x,
        heightAt(x, z),
        z,
        0.09,
        0.18,
        0.09,
        i % 3 ? "#aab574" : "#d7bd78",
      );
    }
    this.sign(1.6, -1.8, "MATA VIVA");
    this.sign(-7, -7.7, "G.M.S. / PESQUISA");
  }
  tree(x: number, y: number, z: number, s: number, type: number) {
    const trunk = this.box(x, y, z, 0.38 * s, 2 * s, 0.38 * s, "#645541");
    trunk.rotation.y = 0.3;
    const shades = ["#294c39", "#36583e", "#405e40"];
    for (let j = 0; j < 3; j++) {
      const m = new T.Mesh(
        new T.ConeGeometry((1.7 - j * 0.3) * s, 2.1 * s, 7),
        this.material(shades[(type + j) % 3]),
      );
      m.position.set(x, y + (2.1 + j * 0.85) * s, z);
      m.rotation.y = j * 0.6;
      m.castShadow = true;
      this.scene.add(m);
    }
  }
  sign(x: number, z: number, text: string) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 100;
    const g = c.getContext("2d")!;
    g.fillStyle = "#263c30";
    g.fillRect(0, 0, 512, 100);
    g.strokeStyle = "#c9b77d";
    g.lineWidth = 5;
    g.strokeRect(5, 5, 502, 90);
    g.fillStyle = "#eee5c9";
    g.font = "bold 32px monospace";
    g.textAlign = "center";
    g.fillText(text, 256, 62);
    const m = new T.Mesh(
      new T.PlaneGeometry(3, 0.6),
      new T.MeshBasicMaterial({
        map: new T.CanvasTexture(c),
        side: T.DoubleSide,
      }),
    );
    m.position.set(x, 1.6, z);
    this.scene.add(m);
    this.box(x, 0, z, 0.1, 1.6, 0.1, "#655a3e");
  }
}
