import * as T from "three";
import { CombatFeedback } from "./combat-feedback";
import { stableDirection } from "./motion";
import { nextWaypoint } from "./navigation";
import { CFG, ENEMY_XP, type Skill } from "./config";
import {
  freshPlayer,
  canMove,
  move,
  heightAt,
  distance,
  normalize,
  inCone,
  xpFor,
  type Point,
} from "./logic";
import { type SceneryAsset } from "./scenery-sprites";
import { zoneAt, zoneStats, ZONES } from "./zones";
import { World } from "./map";
import { Camera } from "./camera";
import { Input } from "./input";
import { Animator } from "./animation";
import { EnemyAnimator, type EnemyAsset } from "./enemy-animation";
import { ENEMY_DEATH_DURATION } from "./enemy-animation-state";
import { XP_DROP_TIME, xpDropHeight, xpFragment, xpLabelTexture } from "./xp";
import {
  CHARACTERS,
  SPECIES_SKILLS,
  skillFor,
  type Species,
  type DamageType,
} from "./species";
import type { AgentAsset } from "./agent-assets";
import { poison, poisonTick, petrify } from "./species-effects";
import { Audio } from "./audio";
import { load, store } from "./save";
import { targetsInArc } from "./combat";
import {
  autoSkillReady,
  avoidsDamage,
  mitigatedDamage,
  immobilizationRate,
  movementSpeed,
} from "./skills";
import {
  rollChoices,
  applyChoice,
  pickupRadius,
  type UpgradeChoice,
} from "./progression";
import type { Enemy, Projectile, Gem, Effect } from "./enemies";
export class Game {
  world: World;
  camera = new Camera();
  feedback: CombatFeedback;
  input = new Input();
  audio = new Audio();
  save = load();
  renderer: T.WebGLRenderer;
  player = freshPlayer();
  selectedSpecies: Species = "wolf";
  hero: T.Sprite;
  collector: T.Mesh;
  anim: Animator;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  bolts: {
    x: number;
    z: number;
    vx: number;
    vz: number;
    damage: number;
    life: number;
    mesh: T.Mesh;
  }[] = [];
  traps: {
    x: number;
    z: number;
    life: number;
    arm: number;
    duration: number;
    mesh: T.Mesh;
  }[] = [];
  vortices: {
    x: number;
    z: number;
    life: number;
    damage: number;
    radius: number;
    tick: number;
    mesh: T.Mesh;
  }[] = [];
  gems: Gem[] = [];
  xpLabel = xpLabelTexture();
  xpFeedback = 0;
  lastXP = 0;
  effects: Effect[] = [];
  corpses: Enemy[] = [];
  phase = "menu";
  currentRegion = 1;
  time = 0;
  spawnClock = 0;
  attackClock = 0;
  invuln = 0;
  hurtTime = 0;
  evadeFeedback = 0;
  fury = 0;
  scent = 0;
  attackAnim = 0;
  attackDuration = 0.3;
  gaze?: { target: Enemy; time: number; duration: number };
  howl = 0;
  heading: Point = { x: 0, z: 1 };
  cooldowns: Record<Skill, number> = {
    q: 0,
    e: 0,
    r: 0,
    " ": 0,
    trap: 0,
    mobility: 0,
    defense: 0,
  };
  levels: Record<string, number> = {};
  offerHistory: string[][] = [];
  bossSpawned = false;
  boss?: Enemy;
  id = 0;
  last = 0;
  onUI: () => void = () => {};
  toast = "";
  toastTime = 0;
  upgradeChoices: UpgradeChoice[] = [];
  inventory: UpgradeChoice[] = [];
  attackHeading: Point = { x: 0, z: 1 };
  constructor(
    canvas: HTMLCanvasElement,
    public enemyAssets: EnemyAsset[],
    sceneryAssets: SceneryAsset[],
    public agentAssets: Record<Species, AgentAsset>,
  ) {
    this.world = new World(sceneryAssets);
    this.feedback = new CombatFeedback(this.world.scene);
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.hero = new T.Sprite(
      new T.SpriteMaterial({ transparent: false, alphaTest: 0.4 }),
    );
    this.hero.scale.set(2.3, 2.3, 1);
    this.hero.center.set(0.5, 16 / 256);
    this.world.scene.add(this.hero);
    this.collector = new T.Mesh(
      new T.RingGeometry(0.985, 1, 64),
      new T.MeshBasicMaterial({
        color: 0xc4d4a4,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    this.collector.rotation.x = -Math.PI / 2;
    this.world.scene.add(this.collector);
    this.anim = new Animator(this.hero, agentAssets.wolf);
    this.resize();
    this.camera.follow(0, 0, 4, 0, true);
    this.audio.volume = this.save.volume;
    this.input.onAction = (k) => {
      if (k === "escape") {
        if (this.phase === "playing") this.pause();
        else if (this.phase === "paused") this.resume();
      }
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
    this.gaze = undefined;
    this.feedback.clear();
    this.world.occlusion.reset();
    for (const e of new Set([...this.enemies, ...this.corpses])) {
      this.world.scene.remove(e.mesh);
      e.anim.dispose();
    }
    this.corpses = [];
    for (const a of [
      ...this.projectiles,
      ...this.bolts,
      ...this.vortices,
      ...this.traps,
      ...this.gems,
      ...this.effects,
    ]) {
      this.world.scene.remove(a.mesh);
      this.disposeTransient(a.mesh);
    }
    this.enemies = [];
    this.projectiles = [];
    this.bolts = [];
    this.vortices = [];
    this.traps = [];
    this.gems = [];
    this.effects = [];
  }
  start() {
    this.clear();
    this.player = freshPlayer(this.selectedSpecies);
    this.anim.texture.dispose();
    this.anim = new Animator(this.hero, this.agentAssets[this.selectedSpecies]);
    this.time = 0;
    this.currentRegion = 1;
    this.spawnClock = 1;
    this.xpFeedback = 0;
    this.lastXP = 0;
    this.attackClock = 0;
    this.invuln = 0;
    this.hurtTime = 0;
    this.evadeFeedback = 0;
    this.fury = 0;
    this.scent = 0;
    this.attackAnim = 0;
    this.attackDuration = 0.3;
    this.howl = 0;
    this.gaze = undefined;
    this.heading = { x: 0, z: 1 };
    this.cooldowns = {
      q: 0,
      e: 0,
      r: 0,
      " ": 0,
      trap: 0,
      mobility: 0,
      defense: 0,
    };
    this.levels =
      this.selectedSpecies === "gorgon"
        ? { "gorgon-scales": 1 }
        : this.selectedSpecies === "saci"
          ? { "saci-escape": 1 }
          : {};
    this.offerHistory = [];
    this.inventory = [];
    this.upgradeChoices = [];
    this.attackHeading = { x: 0, z: 1 };
    this.id = 0;
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
  selectSpecies(species: Species) {
    if (this.phase !== "menu" || !(species in CHARACTERS)) return;
    this.selectedSpecies = species;
    this.player = freshPlayer(species);
    this.anim.texture.dispose();
    this.anim = new Animator(this.hero, this.agentAssets[species]);
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
  private activateSkill(key: Skill, target: Enemy) {
    const p = this.player,
      s = skillFor(p, key)!,
      power = 1 + p.skillPower[key];
    p.essence -= s.cost;
    this.cooldowns[key] = s.cooldown * p.cooldown;
    if (p.species !== "wolf") {
      this.activateSpeciesSkill(key, target, s, power);
      return;
    }
    if (key === "q") {
      const heading = normalize(target.x - p.x, target.z - p.z);
      if (this.attackAnim <= 0) this.heading = heading;
      for (const e of targetsInArc(this.enemies, p, heading, s.range * power)) {
        this.damage(e, s.damage * power);
        move(
          e,
          heading.x * 3 * power,
          heading.z * 3 * power,
          this.world.obstacles,
          e.kind === 3 ? 1 : 0.45,
        );
        e.slow = 3;
      }
      for (let i = 1; i < 6; i++)
        this.effect(
          p.x + heading.x * i,
          p.z + heading.z * i,
          0xd6e8cd,
          0.3 + i * 0.16,
          0.45,
          2,
        );
      this.audio.play("claw");
    } else {
      // Utility instincts also deliver their own automatic pulse/counterattack.
      for (const e of this.enemies)
        if (!e.dead && distance(p, e) <= s.range)
          this.damage(e, s.damage * power);
      if (key === "e") {
        this.scent = s.duration * power;
        this.effect(p.x, p.z, 0xb8cf83, 1, 0.8, 10);
      }
      if (key === "r") {
        this.fury = s.duration * power;
        this.howl = 0.7;
        this.audio.play("howl");
        this.effect(p.x, p.z, 0xe1b16d, 1, 0.7, 5);
      }
    }
  }
  private activateSpeciesSkill(
    key: Skill,
    target: Enemy,
    s: import("./species").SkillDef,
    power: number,
  ) {
    const p = this.player,
      heading = normalize(target.x - p.x, target.z - p.z);
    this.howl = 0.35;
    if (this.attackAnim <= 0) this.heading = heading;
    if (p.species === "gorgon") {
      if (key === "q") {
        this.damage(target, s.damage * power);
        if (!target.dead) poison(target, 8 * power, s.duration);
        this.effect(target.x, target.z, 0xb5df69, 0.9, 0.5, 1);
      }
      if (key === "e") {
        this.gaze = { target, time: 1.2, duration: s.duration * power };
        this.feedback.emit(
          p,
          heading,
          distance(p, target),
          "player",
          "windup",
          1.2,
          "line",
        );
      }
      if (key === "r")
        for (const enemy of this.enemies.filter(
          (e) => !e.dead && distance(p, e) <= s.range,
        )) {
          if (enemy.kind === 3) enemy.slow = Math.max(enemy.slow, 1.5);
          else {
            petrify(enemy, s.duration * power);
            this.feedback.cancelSource(enemy);
          }
          this.effect(enemy.x, enemy.z, 0xc6c9ac, 0.8, 0.5, 1);
        }
    } else {
      if (key === "r") {
        if (this.vortices.length >= 3) {
          const old = this.vortices.shift()!;
          this.world.scene.remove(old.mesh);
          this.disposeTransient(old.mesh);
        }
        const radius = s.range,
          mesh = new T.Mesh(
            new T.RingGeometry(radius * 0.83, radius, 32, 1, 0, 5.6),
            new T.MeshBasicMaterial({
              color: 0x94e1dc,
              transparent: true,
              opacity: 0.65,
              side: T.DoubleSide,
              depthWrite: false,
            }),
          );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(p.x, heightAt(p.x, p.z) + 0.1, p.z);
        for (let i = 1; i <= 4; i++) {
          const r = 0.7 + i * 0.3,
            ring = new T.Mesh(
              new T.RingGeometry(r - 0.07, r, 24, 1, i * 0.8, 4.8),
              new T.MeshBasicMaterial({
                color: 0xbcefe1,
                transparent: true,
                opacity: 0.55,
                side: T.DoubleSide,
                depthWrite: false,
              }),
            );
          ring.position.z = -i * 0.4;
          mesh.add(ring);
        }
        this.world.scene.add(mesh);
        this.vortices.push({
          x: p.x,
          z: p.z,
          life: s.duration * power,
          damage: s.damage * power,
          radius,
          tick: 0.25,
          mesh,
        });
      }
      if (key === "trap") {
        if (this.traps.length >= 4) {
          const old = this.traps.shift()!;
          this.world.scene.remove(old.mesh);
          this.disposeTransient(old.mesh);
        }
        const mesh = new T.Mesh(
          new T.RingGeometry(1.25, 1.45, 12),
          new T.MeshBasicMaterial({
            color: 0xa6bf75,
            transparent: true,
            opacity: 0.65,
            side: T.DoubleSide,
            depthWrite: false,
          }),
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(p.x, heightAt(p.x, p.z) + 0.07, p.z);
        this.world.scene.add(mesh);
        this.traps.push({
          x: p.x,
          z: p.z,
          life: 12,
          arm: 0.3,
          duration: s.duration * power,
          mesh,
        });
      }
      if (key === "mobility") {
        p.mobilityTime = s.duration * power;
        this.effect(p.x, p.z, 0xc1e9ab, 1, 0.5, 2);
      }
      if (key === "e") {
        const direction = this.input.direction();
        move(
          p,
          direction.x * Math.min(4.5, 2.5 * power),
          direction.z * Math.min(4.5, 2.5 * power),
          this.world.obstacles,
        );
        this.invuln = Math.max(this.invuln, s.duration * power);
        p.immobilized = 0;
        this.effect(p.x, p.z, 0xc9eee1, 0.7, 0.45, 2);
      }
      if (key === "q") {
        for (const enemy of targetsInArc(this.enemies, p, heading, s.range)) {
          this.damage(enemy, s.damage * power);
          move(enemy, heading.x * 3, heading.z * 3, this.world.obstacles);
          enemy.slow = 3;
          enemy.windup = 0;
          enemy.action = 0;
          enemy.cooldown = Math.max(enemy.cooldown, 0.6);
          this.feedback.cancelSource(enemy);
        }
        for (let i = 1; i <= 5; i++)
          this.effect(
            p.x + heading.x * i,
            p.z + heading.z * i,
            0xb3e5e0,
            0.4 + i * 0.2,
            0.4,
            1,
          );
      }
    }
  }
  private shootWind() {
    if (this.bolts.length >= 32) return;
    const mesh = new T.Mesh(
      new T.IcosahedronGeometry(0.17, 0),
      new T.MeshBasicMaterial({ color: 0xd6f5e8 }),
    );
    this.world.scene.add(mesh);
    this.bolts.push({
      x: this.player.x,
      z: this.player.z,
      vx: this.attackHeading.x * 11,
      vz: this.attackHeading.z * 11,
      damage: this.player.damage,
      life: this.player.range / 11,
      mesh,
    });
  }
  private updateSpeciesEffects(dt: number) {
    if (this.gaze) {
      const gaze = this.gaze,
        d = this.input.direction();
      if (
        gaze.target.dead ||
        distance(this.player, gaze.target) >
          skillFor(this.player, "e")!.range ||
        d.x ||
        d.z
      ) {
        this.feedback.cancelSource(this.player);
        this.gaze = undefined;
      } else {
        gaze.time -= dt;
        if (gaze.time <= 0) {
          petrify(gaze.target, gaze.duration);
          this.feedback.cancelSource(gaze.target);
          this.effect(gaze.target.x, gaze.target.z, 0xc6c9ac, 1, 0.5, 1);
          this.feedback.cancelSource(this.player);
          this.gaze = undefined;
        }
      }
    }
    for (const v of this.vortices) {
      v.x = this.player.x;
      v.z = this.player.z;
      v.mesh.position.set(v.x, heightAt(v.x, v.z) + 0.1, v.z);
      const active = Math.min(dt, Math.max(0, v.life));
      v.life -= dt;
      v.tick -= dt;
      v.mesh.rotation.z += dt * 3;
      for (const enemy of this.enemies)
        if (!enemy.dead && distance(v, enemy) < v.radius) {
          const direction = normalize(v.x - enemy.x, v.z - enemy.z);
          if (enemy.rooted <= 0 && enemy.petrified <= 0)
            move(
              enemy,
              direction.x * dt,
              direction.z * dt,
              this.world.obstacles,
            );
          enemy.slow = Math.max(enemy.slow, 0.35);
          enemy.disoriented = Math.max(enemy.disoriented, 1.2);
          this.damage(enemy, v.damage * active, false);
        }
      if (v.tick <= 0) v.tick += 0.25;
    }
    this.vortices = this.vortices.filter((v) => {
      if (v.life > 0) return true;
      this.world.scene.remove(v.mesh);
      this.disposeTransient(v.mesh);
      return false;
    });
    for (const trap of this.traps) {
      trap.life -= dt;
      trap.arm -= dt;
      if (trap.arm <= 0) {
        const enemy = this.enemies.find(
          (e) => !e.dead && distance(e, trap) < 1.6,
        );
        if (enemy) {
          enemy.rooted = Math.max(
            enemy.rooted,
            Math.min(trap.duration, enemy.kind === 3 ? 0.9 : 5),
          );
          trap.life = 0;
          this.effect(enemy.x, enemy.z, 0xa7bd78, 1, 0.5, 1);
        }
      }
    }
    this.traps = this.traps.filter((t) => {
      if (t.life > 0) return true;
      this.world.scene.remove(t.mesh);
      this.disposeTransient(t.mesh);
      return false;
    });
    for (const b of this.bolts) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      const target = this.enemies.find((e) => !e.dead && distance(b, e) < 0.8);
      if (target) {
        this.damage(target, b.damage);
        b.life = 0;
      }
      if (this.world.obstacles.some((o) => distance(o, b) < o.r + 0.1))
        b.life = 0;
      b.mesh.position.set(b.x, heightAt(b.x, b.z) + 0.8, b.z);
    }
    this.bolts = this.bolts.filter((b) => {
      if (b.life > 0) return true;
      this.world.scene.remove(b.mesh);
      this.disposeTransient(b.mesh);
      return false;
    });
  }
  private autoSkills() {
    for (const key of Object.keys(
      SPECIES_SKILLS[this.player.species],
    ) as Skill[]) {
      if (!autoSkillReady(key, this.player, this.cooldowns[key], 0)) continue;
      if (this.player.species === "gorgon" && key === "e") {
        const d = this.input.direction();
        if (this.gaze || d.x || d.z) continue;
      }
      if (
        this.player.species === "saci" &&
        (key === "e" || key === "mobility")
      ) {
        const d = this.input.direction();
        if (!d.x && !d.z) continue;
        if (key === "e") {
          const probe = { x: this.player.x, z: this.player.z },
            length = Math.min(4.5, 2.5 * (1 + this.player.skillPower.e));
          move(probe, d.x * length, d.z * length, this.world.obstacles);
          if (distance(probe, this.player) < 0.2) continue;
        }
      }
      const target = this.enemies
        .filter((e) => !e.dead)
        .sort((a, b) => distance(this.player, a) - distance(this.player, b))[0];
      if (!target) break;
      if (
        autoSkillReady(
          key,
          this.player,
          this.cooldowns[key],
          distance(this.player, target),
        )
      )
        this.activateSkill(key, target);
      if (this.phase !== "playing") break;
    }
  }
  spawn(kind: number, point?: Point) {
    if (this.enemies.filter((e) => !e.dead).length >= CFG.maxEnemies) return;
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
    const region = zoneStats(kind, p);
    const maxHp =
      [38, 25, 100, 2100][kind] *
      region.hp *
      (kind === 3 ? 1 : 1 + this.time / 800);
    const mesh = new T.Sprite(
      new T.SpriteMaterial({
        map: this.enemyAssets[kind].texture,
        transparent: false,
        alphaTest: 110 / 255,
        color: 0xffffff,
      }),
    );
    const anim = new EnemyAnimator(mesh, this.enemyAssets[kind]);
    mesh.position.set(p.x, heightAt(p.x, p.z), p.z);
    this.world.scene.add(mesh);
    const enemy: Enemy = {
      ...p,
      id: this.id++,
      kind,
      hp: maxHp,
      maxHp,
      speed: [2.1, 1.55, 1.2, 0.8][kind] * region.speed,
      zoneId: region.zoneId,
      damageScale: region.damage,
      xpValue: Math.round(ENEMY_XP[kind] * region.xp),
      cooldown: 1.5,
      slow: 0,
      windup: 0,
      hit: 0,
      mesh,
      dead: false,
      poisonTime: 0,
      poisonDps: 0,
      petrified: 0,
      rooted: 0,
      disoriented: 0,
      attacks: 0,
      anim,
      facing: normalize(this.player.x - p.x, this.player.z - p.z),
      action: 0,
      attackMode: "melee",
      bossPattern: 0,
      navClock: 0,
    };
    this.enemies.push(enemy);
    if (kind === 3) this.boss = enemy;
  }
  damage(e: Enemy, amount: number, flash = true) {
    if (e.dead) return;
    e.hp -= amount;
    if (flash) {
      e.hit = 0.16;
      this.effect(e.x, e.z, 0xf1da9b, 0.45, 0.15, 1);
    }
    if (e.hp <= 0) {
      e.dead = true;
      this.player.kills++;
      e.anim.set("death");
      e.mesh.material.transparent = true;
      e.mesh.material.depthWrite = false;
      e.mesh.material.needsUpdate = true;
      e.mesh.material.color.set(0xffffff);
      e.mesh.material.rotation = 0;
      this.corpses.push(e);
      if (this.corpses.length > 24) {
        const old = this.corpses.shift()!;
        this.world.scene.remove(old.mesh);
        old.anim.dispose();
      }
      const mesh = xpFragment(e.xpValue, this.xpLabel);
      mesh.position.set(e.x, heightAt(e.x, e.z) + 0.28, e.z);
      this.world.scene.add(mesh);
      this.effect(e.x, e.z, 0xd5ed97, 0.4, 0.35, 1);
      this.gems.push({ x: e.x, z: e.z, value: e.xpValue, age: 0, mesh });
      if (this.gems.length > 240) {
        const old = this.gems.shift()!;
        this.gems[0].value += old.value;
        this.world.scene.remove(old.mesh);
        this.disposeTransient(old.mesh);
      }
      if (e.kind === 3) this.finish(true);
    }
  }
  hurt(amount: number, type: DamageType = "blunt") {
    if (this.invuln > 0) return false;
    if (avoidsDamage(this.player)) {
      this.evadeFeedback = 0.5;
      this.feedback.evade(this.player);
      return false;
    }
    if (this.gaze) this.feedback.cancelSource(this.player);
    this.gaze = undefined;
    if (
      this.player.species === "gorgon" &&
      this.player.skills.defense > 0 &&
      this.cooldowns.defense <= 0 &&
      amount >= this.player.maxHp * 0.18
    ) {
      amount *= Math.max(0.15, 0.35 - this.player.skillPower.defense * 0.1);
      this.cooldowns.defense =
        skillFor(this.player, "defense")!.cooldown * this.player.cooldown;
      this.effect(this.player.x, this.player.z, 0xbacf98, 1.1, 0.8, 0.2);
      this.shedSkin();
      this.message("É TIPO TROCAR DE ROUPA · Pele descartada");
    }
    this.player.hp = Math.max(
      0,
      this.player.hp - mitigatedDamage(this.player, amount, type),
    );
    this.invuln = CFG.invulnerability;
    this.hurtTime = 0.18;
    this.audio.play("hurt");
    if (this.save.shake) this.camera.position.x += 0.18;
    if (this.player.hp <= 0) this.finish(false);
    return true;
  }
  private shedSkin() {
    const texture = this.anim.texture.clone();
    texture.needsUpdate = true;
    const mesh = new T.Mesh(
      new T.PlaneGeometry(this.hero.scale.x, this.hero.scale.y),
      new T.MeshBasicMaterial({
        map: texture,
        color: 0xd3daba,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        alphaTest: 0.4,
        side: T.DoubleSide,
      }),
    );
    mesh.userData.ownedTexture = texture;
    mesh.quaternion.copy(this.camera.quaternion);
    mesh.position.set(
      this.player.x,
      heightAt(this.player.x, this.player.z) +
        this.hero.scale.y * (0.5 - this.hero.center.y),
      this.player.z,
    );
    this.world.scene.add(mesh);
    this.effects.push({ mesh, life: 1.2, max: 1.2, grow: 0 });
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
      damage: (e.kind === 3 ? 18 : 12) * e.damageScale,
      damageType: e.kind === 3 ? "piercing" : "arcane",
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
    const choice = this.upgradeChoices.find((u) => u.id === id)!;
    applyChoice(p, choice);
    this.inventory.push(choice);
    this.phase = "playing";
    this.checkLevel();
    this.onUI();
  }
  checkLevel() {
    if (this.phase !== "playing" || this.player.xp < xpFor(this.player.level))
      return;
    const options = rollChoices(
      this.levels,
      this.player,
      Math.random,
      this.offerHistory,
    );
    this.offerHistory.push(options.map((u) => u.id));
    this.offerHistory = this.offerHistory.slice(-2);
    this.player.xp -= xpFor(this.player.level);
    this.player.level++;
    this.upgradeChoices = options;
    this.phase = "upgrade";
    this.audio.play("level");
    this.onUI();
  }
  update(dt: number) {
    if (this.phase !== "playing") return;
    const p = this.player;
    const attackImpact =
      this.attackAnim > this.attackDuration * 0.5 &&
      Math.max(0, this.attackAnim - dt) <= this.attackDuration * 0.5;
    this.updateCorpses(dt);
    this.feedback.update(dt);
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    this.evadeFeedback = Math.max(0, this.evadeFeedback - dt);
    this.time += dt;
    this.toastTime -= dt;
    this.xpFeedback = Math.max(0, this.xpFeedback - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.fury = Math.max(0, this.fury - dt);
    this.scent = Math.max(0, this.scent - dt);
    this.howl = Math.max(0, this.howl - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    for (const k of Object.keys(SPECIES_SKILLS[this.player.species]) as Skill[])
      this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    p.essence = Math.min(p.maxEssence, p.essence + p.essenceRegen * dt);
    p.hp = Math.min(p.maxHp, p.hp + p.recovery * dt);
    p.immobilized = Math.max(0, p.immobilized - dt * immobilizationRate(p));
    p.mobilityTime = Math.max(0, p.mobilityTime - dt);
    const dir = this.input.direction();
    if (dir.x || dir.z) {
      if (this.attackAnim <= 0) this.heading = dir;
      const speed = movementSpeed(p, zoneAt(p.x, p.z).id === 4);
      move(p, dir.x * speed * dt, dir.z * speed * dt, this.world.obstacles);
    }
    const region = zoneAt(p.x, p.z);
    if (region.id !== this.currentRegion) {
      this.currentRegion = region.id;
      this.message(`${region.name} · PERIGO ${region.id}`);
    }
    this.anim.direction = stableDirection(
      this.anim.direction,
      this.heading.x,
      this.heading.z,
    );
    this.spawnClock -= dt;
    if (this.spawnClock <= 0 && !this.boss?.dead) {
      this.spawnClock = Math.max(0.4, 2.5 - this.time / 210);
      const kind =
        (this.time > 100 || region.id >= 3) &&
        Math.random() < 0.2 + region.id * 0.035
          ? 2
          : (this.time > 40 || region.id >= 2) &&
              Math.random() < 0.25 + region.id * 0.035
            ? 1
            : 0;
      this.spawn(kind);
    }
    if (this.time >= CFG.duration && !this.bossSpawned) {
      const point = [
        { x: -19, z: 16 },
        { x: -16, z: 17 },
        { x: -20, z: 14 },
        { x: -18, z: 19 },
      ].find(
        (p0) =>
          canMove(p0, this.world.obstacles, 1.1) && distance(p, p0) >= 2.5,
      );
      if (point) {
        this.enemies
          .filter((e) => !e.dead)
          .slice(0, 8)
          .forEach((e) => this.damage(e, 9999));
        this.spawn(3, point);
        this.bossSpawned = Boolean(this.boss);
        if (this.bossSpawned)
          this.message("CHEFE NAS RUÍNAS · Siga para a região 5");
      }
    }
    this.updateSpeciesEffects(dt);
    this.autoSkills();
    if (this.phase !== "playing") return;
    this.attackClock -= dt;
    if (this.attackClock <= 0 && this.attackAnim <= 0 && !attackImpact) {
      const target = this.enemies
        .filter((e) => !e.dead && distance(p, e) < p.range)
        .sort((a, b) => distance(p, a) - distance(p, b))[0];
      if (target) {
        this.heading = normalize(target.x - p.x, target.z - p.z);
        this.attackHeading = { ...this.heading };
        this.attackClock =
          CHARACTERS[p.species].interval /
          p.attack /
          (this.fury > 0 ? 1 + 0.65 * (1 + p.skillPower.r) : 1);
        this.attackDuration = Math.min(0.3, this.attackClock * 0.9);
        this.attackAnim = this.attackDuration;
        this.anim.set("attack", true);
        this.audio.play("claw");
      }
    } // Impact occurs on the extended pose, once per animation.
    if (attackImpact) {
      if (p.species === "saci") this.shootWind();
      else
        for (const e of targetsInArc(
          this.enemies,
          p,
          this.attackHeading,
          p.range,
        ))
          this.damage(
            e,
            p.damage * (this.fury > 0 ? 1 + 0.7 * (1 + p.skillPower.r) : 1),
          );
      this.feedback.emit(
        { ...p },
        this.attackHeading,
        p.range,
        "player",
        "impact",
        0.24,
        p.species === "saci" ? "line" : "cone",
      );
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      const poisonBefore = e.poisonTime;
      const poisonDamage = poisonTick(e, dt);
      if (poisonDamage > 0) this.damage(e, poisonDamage, false);
      if (e.dead) continue;
      if (
        Math.floor(poisonBefore) !== Math.floor(e.poisonTime) &&
        e.poisonTime > 0
      )
        this.effect(e.x, e.z, 0xb8d775, 0.4, 0.25, 1);
      e.petrified = Math.max(0, e.petrified - dt);
      if (e.petrified > 0) {
        e.anim.set("idle");
        e.mesh.material.color.set(0xa6aaa0);
        e.mesh.position.set(e.x, heightAt(e.x, e.z), e.z);
        continue;
      }
      e.rooted = Math.max(0, e.rooted - dt);
      e.disoriented = Math.max(0, e.disoriented - dt);
      const previousWindup = e.windup;
      const oldX = e.x,
        oldZ = e.z;
      e.cooldown -= dt;
      e.slow = Math.max(0, e.slow - dt);
      e.hit = Math.max(0, e.hit - dt);
      e.action = Math.max(0, e.action - dt);
      const d = distance(e, p);
      if (!e.nav || e.navClock <= 0 || distance(e, e.nav) < 0.3) {
        e.nav = nextWaypoint(e, p, this.world.obstacles);
        e.navClock = 0.8 + Math.random() * 0.3;
      }
      e.navClock -= dt;
      const v = normalize(
        (d < 3 ? p.x : e.nav.x) - e.x,
        (d < 3 ? p.z : e.nav.z) - e.z,
      );
      if (e.disoriented > 0) {
        const a = e.id * 2.4 + this.time * 3;
        v.x = Math.cos(a);
        v.z = Math.sin(a);
        e.cooldown = Math.max(e.cooldown, 0.25);
      }
      if (e.windup > 0) {
        e.windup = Math.max(0, e.windup - dt);
        if (e.windup === 0) {
          this.feedback.emit(
            { x: e.x, z: e.z },
            e.facing,
            e.kind === 3 ? 5 : e.kind === 2 ? 2.8 : 1.9,
            "enemy",
            "impact",
            0.25,
            e.kind === 3
              ? "circle"
              : e.attackMode === "ranged"
                ? "line"
                : "cone",
          );
          e.action =
            e.attackMode === "volley" || e.attackMode === "summon" ? 0.5 : 0.26;
          if (e.attackMode === "ranged")
            this.shoot(e, Math.atan2(e.facing.z, e.facing.x));
          else if (e.attackMode === "volley")
            for (let i = 0; i < 12; i++) this.shoot(e, (i * Math.PI) / 6);
          else if (e.attackMode === "summon")
            for (let i = 0; i < 2; i++)
              this.spawn(0, { x: e.x + 3 + i * 2, z: e.z + 3 });
          else if (
            e.kind === 3
              ? d < 5
              : inCone(e, e.facing, p, e.kind === 2 ? 2.8 : 1.9)
          ) {
            const hit = this.hurt(
              (e.kind === 3 ? 35 : e.kind === 2 ? 25 : 10) * e.damageScale,
              e.kind === 0 ? "slashing" : "blunt",
            );
            if (hit && e.kind === 0 && ++e.attacks % 3 === 0) {
              p.immobilized = Math.max(p.immobilized, 1.6);
              this.message("RAÍZES · Movimento preso temporariamente");
            }
          }
        }
      } else if (e.action > 0) {
        // Finish the visible strike before locomotion resumes.
      } else if (e.kind === 1 && d < 11) {
        if (e.cooldown <= 0) {
          e.windup = 0.36;
          e.cooldown = 2.2;
          e.attackMode = "ranged";
          e.facing = normalize(p.x - e.x, p.z - e.z);
        } else if (d < 5 && e.rooted <= 0)
          move(e, -v.x * dt, -v.z * dt, this.world.obstacles);
      } else if (
        (e.kind === 3 || e.kind === 2) &&
        d < (e.kind === 3 ? 8 : 2.5) &&
        e.cooldown <= 0
      ) {
        e.attackMode =
          e.kind === 3
            ? (["slam", "volley", "summon"] as const)[e.bossPattern++ % 3]
            : "melee";
        e.windup = e.kind === 3 ? 1.3 : 0.8;
        e.cooldown = e.kind === 3 ? 4 : 2.5;
        e.facing = normalize(p.x - e.x, p.z - e.z);
      } else {
        if (d > 1.3) {
          move(
            e,
            v.x * e.speed * dt * (e.rooted > 0 ? 0 : e.slow > 0 ? 0.4 : 1),
            v.z * e.speed * dt * (e.rooted > 0 ? 0 : e.slow > 0 ? 0.4 : 1),
            this.world.obstacles,
            0.45,
          );
          e.facing = v;
        }
        if (d < 1.7 && e.cooldown <= 0) {
          e.windup = 0.24;
          e.attackMode = "melee";
          e.cooldown = CFG.enemyInterval;
          e.facing = normalize(p.x - e.x, p.z - e.z);
        }
      }
      if (previousWindup <= 0 && e.windup > 0)
        this.feedback.emit(
          e,
          e.facing,
          e.attackMode === "ranged"
            ? 8
            : e.kind === 3
              ? 5
              : e.kind === 2
                ? 2.8
                : 1.9,
          "enemy",
          "windup",
          e.windup,
          e.attackMode === "ranged" ? "line" : e.kind === 3 ? "circle" : "cone",
          e.anim.asset.height,
        );
      e.anim.direction = stableDirection(
        e.anim.direction,
        e.facing.x,
        e.facing.z,
      );
      e.anim.set(
        e.windup > 0
          ? "windup"
          : e.action > 0
            ? e.attackMode === "volley" || e.attackMode === "summon"
              ? "cast"
              : "attack"
            : e.hit > 0
              ? "hurt"
              : Math.hypot(e.x - oldX, e.z - oldZ) > 0.001
                ? "walk"
                : "idle",
      );
      e.anim.update(dt);
      e.mesh.position.set(e.x, heightAt(e.x, e.z), e.z);
      e.mesh.material.color.set(
        e.hit > 0
          ? 0xffd6a3
          : e.poisonTime > 0
            ? 0xb9d39a
            : this.scent > 0
              ? 0xc9ffb9
              : 0xffffff,
      );
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    for (const b of this.projectiles) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.mesh.position.set(b.x, heightAt(b.x, b.z) + 0.8, b.z);
      if (distance(b, p) < 0.7) {
        this.hurt(b.damage, b.damageType);
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
      gem.age += dt;
      const d = distance(gem, p);
      gem.mesh.rotation.y += dt * 2;
      gem.mesh.scale.setScalar(
        (this.scent > 0 ? 1.6 : 1) * Math.min(1, 0.45 + gem.age * 4),
      );
      gem.mesh.position.y = heightAt(gem.x, gem.z) + xpDropHeight(gem.age);
      if (gem.age >= XP_DROP_TIME && d <= pickupRadius(p, this.scent > 0))
        gem.attracted = true;
      if (gem.attracted) {
        const v = normalize(p.x - gem.x, p.z - gem.z);
        const step = Math.min(d, dt * 12);
        gem.x += v.x * step;
        gem.z += v.z * step;
        gem.mesh.position.set(gem.x, heightAt(gem.x, gem.z) + 0.3, gem.z);
      }
      if (gem.age >= XP_DROP_TIME && distance(gem, p) < 0.6) {
        const gained = gem.value * (1 + p.xpBonus);
        p.xp += gained;
        this.lastXP = gained;
        this.xpFeedback = 0.9;
        gem.value = 0;
        this.audio.play("collect");
      }
    }
    this.gems = this.gems.filter((g) => {
      if (g.value) return true;
      this.world.scene.remove(g.mesh);
      this.disposeTransient(g.mesh);
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
      this.disposeTransient(e.mesh);
      return false;
    });
    if (this.phase === "playing") this.checkLevel();
    this.anim.direction = stableDirection(
      this.anim.direction,
      this.heading.x,
      this.heading.z,
    );
    if (this.phase === "playing" || this.phase === "upgrade")
      this.anim.set(
        this.howl > 0
          ? "howl"
          : this.attackAnim > 0
            ? "attack"
            : this.hurtTime > 0
              ? "hurt"
              : dir.x || dir.z
                ? "walk"
                : "idle",
      );
  }
  private disposeTransient(mesh: T.Mesh) {
    mesh.traverse((child) => {
      if (child instanceof T.Mesh) child.geometry.dispose();
      if (child.userData.ownedTexture) child.userData.ownedTexture.dispose();
      if (child instanceof T.Mesh || child instanceof T.Sprite)
        (child.material as T.Material).dispose();
    });
  }
  updateCorpses(dt: number) {
    this.corpses = this.corpses.filter((e) => {
      e.anim.update(dt);
      e.mesh.material.opacity = Math.min(
        1,
        Math.max(0, (ENEMY_DEATH_DURATION - e.anim.time) / 0.15),
      );
      if (e.anim.time < ENEMY_DEATH_DURATION) return true;
      this.world.scene.remove(e.mesh);
      e.anim.dispose();
      return false;
    });
  }
  loop = (now: number) => {
    const dt = Math.min((now - this.last) / 1000 || 0, 0.05);
    this.last = now;
    if (this.phase === "playing") this.update(dt);
    else if (this.phase === "victory" || this.phase === "defeat") {
      this.updateCorpses(dt);
      this.feedback.update(dt);
    }
    this.hero.position.set(
      this.player.x,
      heightAt(this.player.x, this.player.z),
      this.player.z,
    );
    this.collector.visible = ["playing", "paused", "upgrade"].includes(
      this.phase,
    );
    this.collector.position.set(
      this.player.x,
      heightAt(this.player.x, this.player.z) + 0.04,
      this.player.z,
    );
    this.collector.scale.setScalar(pickupRadius(this.player, this.scent > 0));
    this.hero.material.color.set(
      this.hurtTime > 0 ? 0xffc9b2 : this.fury > 0 ? 0xffce88 : 0xffffff,
    );
    if (
      this.phase === "playing" ||
      this.phase === "defeat" ||
      this.phase === "victory"
    )
      this.anim.update(
        this.anim.state === "attack" ? (dt * 0.3) / this.attackDuration : dt,
      );
    this.camera.follow(
      this.player.x,
      heightAt(this.player.x, this.player.z),
      this.player.z,
      dt,
    );
    this.world.update(this.camera, this.hero, dt);
    this.renderer.render(this.world.scene, this.camera);
    this.onUI();
    requestAnimationFrame(this.loop);
  };
}
