import * as T from "three";
import { nextWaypoint } from "./navigation";
import { CFG, SKILLS, type Skill } from "./config";
import {
  freshPlayer,
  canMove,
  move,
  heightAt,
  distance,
  normalize,
  xpFor,
  validUpgrades,
  type Point,
} from "./logic";
import { World } from "./map";
import { Camera } from "./camera";
import { Input } from "./input";
import { Animator, wolfAtlas, enemyTexture } from "./animation";
import { Audio } from "./audio";
import { load, store } from "./save";
import { targetsInArc } from "./combat";
import { skillAvailability } from "./skills";
import type { Enemy, Projectile, Gem, Effect } from "./enemies";
export class Game {
  world = new World();
  camera = new Camera();
  input = new Input();
  audio = new Audio();
  save = load();
  renderer: T.WebGLRenderer;
  player = freshPlayer();
  hero: T.Sprite;
  anim: Animator;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  gems: Gem[] = [];
  effects: Effect[] = [];
  textures = [enemyTexture(0), enemyTexture(1), enemyTexture(2)];
  phase = "menu";
  time = 0;
  spawnClock = 0;
  attackClock = 0;
  invuln = 0;
  fury = 0;
  scent = 0;
  attackAnim = 0;
  howl = 0;
  heading: Point = { x: 0, z: 1 };
  cooldowns: Record<Skill, number> = { q: 0, e: 0, r: 0, " ": 0 };
  levels: Record<string, number> = {};
  bossSpawned = false;
  boss?: Enemy;
  id = 0;
  last = 0;
  onUI: () => void = () => {};
  toast = "";
  toastTime = 0;
  upgradeChoices = validUpgrades({});
  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.hero = new T.Sprite(
      new T.SpriteMaterial({ transparent: true, alphaTest: 0.4 }),
    );
    this.hero.scale.set(2.3, 2.3, 1);
    this.hero.center.set(0.5, 16 / 256);
    this.world.scene.add(this.hero);
    this.anim = new Animator(this.hero, wolfAtlas());
    this.resize();
    this.camera.follow(0, 0, 4, 0, true);
    this.audio.volume = this.save.volume;
    this.input.onAction = (k) => {
      if (k === "escape") {
        if (this.phase === "playing") this.pause();
        else if (this.phase === "paused") this.resume();
      } else if (k in SKILLS) this.skill(k as Skill);
    };
    window.addEventListener("resize", () => this.resize());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.pause();
    });
    window.addEventListener("blur", () => this.pause());
    canvas.addEventListener(
      "wheel",
      (e) => {
        this.camera.zoomDistance = T.MathUtils.clamp(
          this.camera.zoomDistance + e.deltaY * 0.01,
          15,
          27,
        );
      },
      { passive: true },
    );
    requestAnimationFrame(this.loop);
  }
  resize() {
    this.renderer.setPixelRatio(
      this.save.quality === "alta" ? Math.min(devicePixelRatio, 1.5) : 0.75,
    );
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.resize();
    this.renderer.shadowMap.enabled = this.save.quality === "alta";
  }
  clear() {
    for (const e of this.enemies) this.world.scene.remove(e.mesh);
    for (const a of [...this.projectiles, ...this.gems, ...this.effects]) {
      this.world.scene.remove(a.mesh);
      a.mesh.geometry.dispose();
      (a.mesh.material as T.Material).dispose();
    }
    this.enemies = [];
    this.projectiles = [];
    this.gems = [];
    this.effects = [];
  }
  start() {
    this.clear();
    this.player = freshPlayer();
    this.time = 0;
    this.spawnClock = 1;
    this.attackClock = 0;
    this.invuln = 0;
    this.fury = 0;
    this.scent = 0;
    this.attackAnim = 0;
    this.howl = 0;
    this.heading = { x: 0, z: 1 };
    this.cooldowns = { q: 0, e: 0, r: 0, " ": 0 };
    this.levels = {};
    this.boss = undefined;
    this.bossSpawned = false;
    this.phase = "playing";
    this.anim.set("idle");
    this.input.keys.clear();
    this.input.stick = { x: 0, z: 0 };
    this.audio.start();
    this.audio.volume = this.save.volume;
    this.camera.follow(0, 0, 4, 0, true);
    this.message("OPERAÇÃO INICIADA · Contenha a anomalia");
    this.onUI();
  }
  pause() {
    if (this.phase === "playing") {
      this.phase = "paused";
      this.input.keys.clear();
      this.input.stick = { x: 0, z: 0 };
      this.onUI();
    }
  }
  resume() {
    if (this.phase === "paused") {
      this.phase = "playing";
      this.onUI();
    }
  }
  menu() {
    this.clear();
    this.phase = "menu";
    this.onUI();
  }
  message(t: string) {
    this.toast = t;
    this.toastTime = 2.5;
  }
  effect(x: number, z: number, color: number, size = 1, life = 0.4, grow = 2) {
    if (this.effects.length >= CFG.particles) return;
    const mesh = new T.Mesh(
      new T.RingGeometry(size * 0.8, size, 32),
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, heightAt(x, z) + 0.12, z);
    this.world.scene.add(mesh);
    this.effects.push({ mesh, life, max: life, grow });
  }
  skill(key: Skill) {
    if (this.phase !== "playing") return;
    const problem = skillAvailability(
      key,
      this.player.essence,
      this.cooldowns[key],
    );
    if (problem) {
      this.message(problem);
      return;
    }
    const s = SKILLS[key];
    this.player.essence -= s.cost;
    this.cooldowns[key] = s.cooldown * this.player.cooldown;
    if (key === "q") {
      for (const e of targetsInArc(
        this.enemies,
        this.player,
        this.heading,
        6 * this.player.power,
      )) {
        this.damage(e, 28 * this.player.power);
        move(
          e,
          this.heading.x * 3 * this.player.power,
          this.heading.z * 3 * this.player.power,
          this.world.obstacles,
          e.kind === 3 ? 1 : 0.45,
        );
        e.slow = 3;
      }
      for (let i = 1; i < 6; i++)
        this.effect(
          this.player.x + this.heading.x * i,
          this.player.z + this.heading.z * i,
          0xd6e8cd,
          0.3 + i * 0.16,
          0.45,
          2,
        );
      this.audio.play("claw");
    }
    if (key === "e") {
      this.scent = s.duration;
      this.effect(this.player.x, this.player.z, 0xb8cf83, 1, 0.8, 10);
      this.message("FARO · Losangos: fragmentos / Silhuetas: ameaças");
    }
    if (key === "r") {
      this.fury = s.duration;
      this.howl = 0.7;
      this.audio.play("howl");
      this.effect(this.player.x, this.player.z, 0xe1b16d, 1, 0.7, 5);
    }
    if (key === " ") {
      const dir = this.input.direction();
      const d = dir.x || dir.z ? dir : this.heading;
      move(
        this.player,
        d.x * CFG.dashDistance,
        d.z * CFG.dashDistance,
        this.world.obstacles,
      );
      this.invuln = CFG.dashInvulnerability;
      this.effect(this.player.x, this.player.z, 0xf7efc8, 0.6, 0.3, 1);
    }
  }
  spawn(kind: number, point?: Point) {
    if (this.enemies.length >= CFG.maxEnemies) return;
    let p = point;
    for (let i = 0; !p && i < 40; i++) {
      const a = Math.random() * Math.PI * 2,
        r = 13 + Math.random() * 6,
        q = {
          x: this.player.x + Math.cos(a) * r,
          z: this.player.z + Math.sin(a) * r,
        };
      const test = { ...q };
      move(test, 0.01, 0.01, this.world.obstacles, 1);
      if (
        Math.abs(q.x) < 26 &&
        Math.abs(q.z) < 24 &&
        distance(q, test) < 0.1 &&
        this.world.obstacles.every((o) => distance(q, o) > o.r + 1) &&
        !(q.x > 8 && q.x < 13)
      )
        p = q;
    }
    if (
      !p ||
      !canMove(p, this.world.obstacles, 0.7) ||
      distance(p, this.player) < 1.8
    )
      return;
    const maxHp =
      [38, 25, 100, 2100][kind] * (kind === 3 ? 1 : 1 + this.time / 800);
    const mesh = new T.Sprite(
      new T.SpriteMaterial({
        map: this.textures[kind === 3 ? 2 : kind],
        transparent: true,
        alphaTest: 0.3,
        color: kind === 3 ? 0xd4a1b5 : 0xffffff,
      }),
    );
    const scale = kind === 3 ? 4.3 : kind === 2 ? 2.3 : 1.6;
    mesh.scale.set(scale, scale * 1.15, 1);
    this.world.scene.add(mesh);
    const enemy: Enemy = {
      ...p,
      id: this.id++,
      kind,
      hp: maxHp,
      maxHp,
      speed: [2.1, 1.55, 1.2, 0.8][kind],
      cooldown: 1.5,
      slow: 0,
      windup: 0,
      hit: 0,
      mesh,
      dead: false,
      navClock: 0,
    };
    this.enemies.push(enemy);
    if (kind === 3) this.boss = enemy;
  }
  damage(e: Enemy, amount: number) {
    if (e.dead) return;
    e.hp -= amount;
    e.hit = 0.16;
    this.effect(e.x, e.z, 0xf1da9b, 0.45, 0.15, 1);
    if (e.hp <= 0) {
      e.dead = true;
      this.player.kills++;
      this.world.scene.remove(e.mesh);
      const mesh = new T.Mesh(
        new T.OctahedronGeometry(0.19),
        new T.MeshStandardMaterial({
          color: 0xd5e4a0,
          emissive: 0x71813e,
          emissiveIntensity: 0.6,
        }),
      );
      mesh.position.set(e.x, heightAt(e.x, e.z) + 0.3, e.z);
      this.world.scene.add(mesh);
      this.gems.push({ x: e.x, z: e.z, value: e.kind === 2 ? 10 : 5, mesh });
      if (this.gems.length > 240) {
        const old = this.gems.shift()!;
        this.gems[0].value += old.value;
        this.world.scene.remove(old.mesh);
        old.mesh.geometry.dispose();
        (old.mesh.material as T.Material).dispose();
      }
      if (e.kind === 3) this.finish(true);
    }
  }
  hurt(amount: number) {
    if (this.invuln > 0) return;
    this.player.hp = Math.max(0, this.player.hp - amount);
    this.invuln = CFG.invulnerability;
    this.anim.set("hurt");
    this.audio.play("hurt");
    if (this.save.shake) this.camera.position.x += 0.18;
    if (this.player.hp <= 0) this.finish(false);
  }
  shoot(e: Enemy, angle: number) {
    if (this.projectiles.length > 100) return;
    const mesh = new T.Mesh(
      new T.IcosahedronGeometry(0.22, 0),
      new T.MeshBasicMaterial({ color: 0xb9dfd4 }),
    );
    this.world.scene.add(mesh);
    this.projectiles.push({
      x: e.x,
      z: e.z,
      vx: Math.cos(angle) * 5,
      vz: Math.sin(angle) * 5,
      life: 5,
      damage: e.kind === 3 ? 18 : 12,
      mesh,
    });
  }
  finish(win: boolean) {
    if (this.phase !== "playing") return;
    this.phase = win ? "victory" : "defeat";
    this.anim.set(win ? "howl" : "death");
    this.audio.play(win ? "win" : "lose");
    this.save.bestTime = Math.max(this.save.bestTime, this.time);
    this.save.bestKills = Math.max(this.save.bestKills, this.player.kills);
    if (win) this.save.wins++;
    this.save.last = win ? "Mata Viva contida" : "Agente extraído";
    store(this.save);
    this.onUI();
  }
  choose(id: string) {
    if (
      this.phase !== "upgrade" ||
      !this.upgradeChoices.some((u) => u.id === id)
    )
      return;
    this.levels[id] = (this.levels[id] || 0) + 1;
    const p = this.player;
    if (id === "hp") {
      p.maxHp += 25;
      p.hp = Math.min(p.maxHp, p.hp + 40);
    }
    if (id === "damage") p.damage += CFG.damage * 0.2;
    if (id === "attack") p.attack += 0.12;
    if (id === "speed") p.speed += CFG.speed * 0.08;
    if (id === "collect") p.collect += CFG.collect * 0.35;
    if (id === "cooldown") p.cooldown *= 0.9;
    if (id === "essence") {
      p.maxEssence += 20;
      p.essence += 20;
    }
    if (id === "power") p.power += 0.3;
    this.phase = "playing";
    this.checkLevel();
    this.onUI();
  }
  checkLevel() {
    if (this.player.xp < xpFor(this.player.level)) return;
    const options = validUpgrades(this.levels);
    if (!options.length) return;
    this.player.xp -= xpFor(this.player.level);
    this.player.level++;
    this.upgradeChoices = options.sort(() => Math.random() - 0.5).slice(0, 3);
    this.phase = "upgrade";
    this.audio.play("level");
    this.onUI();
  }
  update(dt: number) {
    const p = this.player;
    this.time += dt;
    this.toastTime -= dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.fury = Math.max(0, this.fury - dt);
    this.scent = Math.max(0, this.scent - dt);
    this.howl = Math.max(0, this.howl - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    for (const k of Object.keys(SKILLS) as Skill[])
      this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    p.essence = Math.min(p.maxEssence, p.essence + CFG.regen * dt);
    const dir = this.input.direction();
    if (dir.x || dir.z) {
      if (this.attackAnim <= 0) this.heading = dir;
      move(p, dir.x * p.speed * dt, dir.z * p.speed * dt, this.world.obstacles);
    }
    this.anim.direction =
      Math.abs(this.heading.x) > 0.5
        ? this.heading.x < 0
          ? 2
          : 3
        : this.heading.z < 0
          ? 1
          : 0;
    this.spawnClock -= dt;
    if (this.spawnClock <= 0 && !this.boss?.dead) {
      this.spawnClock = Math.max(0.4, 2.5 - this.time / 210);
      const kind =
        this.time > 100 && Math.random() < 0.23
          ? 2
          : this.time > 40 && Math.random() < 0.3
            ? 1
            : 0;
      this.spawn(kind);
    }
    if (this.time >= CFG.duration && !this.bossSpawned) {
      this.bossSpawned = true;
      this.enemies
        .filter((e) => !e.dead)
        .slice(0, 8)
        .forEach((e) => this.damage(e, 9999));
      this.spawn(3, { x: 0, z: this.player.z > 0 ? -6 : 6 });
      this.message("ANOMALIA CRÍTICA · Coração da Corrupção");
    }
    this.attackClock -= dt;
    if (this.attackClock <= 0) {
      const target = this.enemies
        .filter((e) => !e.dead && distance(p, e) < CFG.range)
        .sort((a, b) => distance(p, a) - distance(p, b))[0];
      if (target) {
        this.heading = normalize(target.x - p.x, target.z - p.z);
        this.attackClock =
          CFG.attackInterval / p.attack / (this.fury > 0 ? 1.65 : 1);
        this.attackAnim = 0.3;
        this.audio.play("claw");
      }
    } // Impact occurs on the extended pose, once per animation.
    if (
      this.attackAnim > 0 &&
      this.attackAnim <= 0.16 &&
      this.attackAnim + dt > 0.16
    ) {
      for (const e of targetsInArc(this.enemies, p, this.heading, CFG.range))
        this.damage(e, p.damage * (this.fury > 0 ? 1.7 : 1));
      this.effect(
        p.x + this.heading.x,
        p.z + this.heading.z,
        0xf0d5a0,
        0.9,
        0.18,
        2,
      );
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.cooldown -= dt;
      e.slow = Math.max(0, e.slow - dt);
      e.hit = Math.max(0, e.hit - dt);
      const d = distance(e, p);
      if (!e.nav || e.navClock <= 0) {
        e.nav = nextWaypoint(e, p, this.world.obstacles);
        e.navClock = 0.8 + Math.random() * 0.3;
      }
      e.navClock -= dt;
      const v = normalize(
        (d < 3 ? p.x : e.nav.x) - e.x,
        (d < 3 ? p.z : e.nav.z) - e.z,
      );
      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          if (e.kind === 3) {
            if (d < 5) this.hurt(35);
            for (let i = 0; i < 12; i++) this.shoot(e, (i * Math.PI) / 6);
            for (let i = 0; i < 2; i++)
              this.spawn(0, { x: e.x + 3 + i * 2, z: e.z + 3 });
          } else if (d < 2.8) this.hurt(25);
        }
      } else if (e.kind === 1 && d < 11) {
        if (e.cooldown <= 0) {
          this.shoot(e, Math.atan2(v.z, v.x));
          e.cooldown = 2.2;
        }
        if (d < 5) move(e, -v.x * dt, -v.z * dt, this.world.obstacles);
      } else if (
        (e.kind === 3 || e.kind === 2) &&
        d < (e.kind === 3 ? 8 : 2.5) &&
        e.cooldown <= 0
      ) {
        e.windup = e.kind === 3 ? 1.3 : 0.8;
        e.cooldown = e.kind === 3 ? 4 : 2.5;
        this.effect(e.x, e.z, 0xd77b74, e.kind === 3 ? 5 : 2.8, e.windup, 0);
      } else {
        if (d > 1.3)
          move(
            e,
            v.x * e.speed * dt * (e.slow > 0 ? 0.4 : 1),
            v.z * e.speed * dt * (e.slow > 0 ? 0.4 : 1),
            this.world.obstacles,
            0.45,
          );
        if (d < 1.7 && e.cooldown <= 0) {
          this.hurt(e.kind === 2 ? 25 : 10);
          e.cooldown = CFG.enemyInterval;
        }
      }
      e.mesh.position.set(e.x, heightAt(e.x, e.z) + e.mesh.scale.y / 2, e.z);
      e.mesh.material.color.set(
        e.hit > 0
          ? 0xffd6a3
          : this.scent > 0
            ? 0xc9ffb9
            : e.kind === 3
              ? 0xc59bad
              : 0xffffff,
      );
      e.mesh.material.rotation =
        e.windup > 0 ? Math.sin(this.time * 25) * 0.07 : 0;
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    for (const b of this.projectiles) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.mesh.position.set(b.x, heightAt(b.x, b.z) + 0.8, b.z);
      if (distance(b, p) < 0.7) {
        this.hurt(b.damage);
        b.life = 0;
      }
      if (this.world.obstacles.some((o) => distance(o, b) < o.r)) b.life = 0;
    }
    this.projectiles = this.projectiles.filter((b) => {
      if (b.life > 0) return true;
      this.world.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      (b.mesh.material as T.Material).dispose();
      return false;
    });
    for (const gem of this.gems) {
      const d = distance(gem, p);
      gem.mesh.rotation.y += dt * 2;
      gem.mesh.scale.setScalar(this.scent > 0 ? 1.6 : 1);
      if (d < p.collect) {
        const v = normalize(p.x - gem.x, p.z - gem.z);
        gem.x += v.x * dt * 12;
        gem.z += v.z * dt * 12;
        gem.mesh.position.set(gem.x, heightAt(gem.x, gem.z) + 0.3, gem.z);
      }
      if (d < 0.6) {
        p.xp += gem.value;
        gem.value = 0;
        this.audio.play("collect");
      }
    }
    this.gems = this.gems.filter((g) => {
      if (g.value) return true;
      this.world.scene.remove(g.mesh);
      g.mesh.geometry.dispose();
      (g.mesh.material as T.Material).dispose();
      return false;
    });
    for (const e of this.effects) {
      e.life -= dt;
      e.mesh.scale.addScalar(dt * e.grow);
      (e.mesh.material as T.MeshBasicMaterial).opacity =
        Math.max(0, e.life / e.max) * 0.7;
    }
    this.effects = this.effects.filter((e) => {
      if (e.life > 0) return true;
      this.world.scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      (e.mesh.material as T.Material).dispose();
      return false;
    });
    if (this.phase === "playing") this.checkLevel();
    this.anim.direction =
      Math.abs(this.heading.x) > 0.5
        ? this.heading.x < 0
          ? 2
          : 3
        : this.heading.z < 0
          ? 1
          : 0;
    if (this.phase === "playing" || this.phase === "upgrade")
      this.anim.set(
        this.howl > 0
          ? "howl"
          : this.invuln > 0.3
            ? "hurt"
            : this.attackAnim > 0
              ? "attack"
              : dir.x || dir.z
                ? "walk"
                : "idle",
      );
  }
  loop = (now: number) => {
    const dt = Math.min((now - this.last) / 1000 || 0, 0.05);
    this.last = now;
    if (this.phase === "playing") this.update(dt);
    this.hero.position.set(
      this.player.x,
      heightAt(this.player.x, this.player.z),
      this.player.z,
    );
    this.hero.material.color.set(this.fury > 0 ? 0xffce88 : 0xffffff);
    if (
      this.phase === "playing" ||
      this.phase === "defeat" ||
      this.phase === "victory"
    )
      this.anim.update(dt);
    this.camera.follow(
      this.player.x,
      heightAt(this.player.x, this.player.z),
      this.player.z,
      dt,
    );
    this.renderer.render(this.world.scene, this.camera);
    this.onUI();
    requestAnimationFrame(this.loop);
  };
}
