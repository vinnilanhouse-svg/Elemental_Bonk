import { WORLD } from "./terrain";
import { NewSpeciesCombat } from "./new-species-combat";
import { ELEMENTS, isNewSpecies, type Element } from "./new-species";
import { Notifications } from "./notifications";
import { PlayerReadability, CombatText } from "./readability";
import { FieldItems } from "./field-items";
import {
  applyFieldItem,
  ambushSpots,
  fieldDamageMultiplier,
  fieldSpeedMultiplier,
  fieldProtectionMultiplier,
  fieldMagnetMultiplier,
  type FieldItemKind,
  type FieldNotice,
} from "./field-loot";
import * as T from "three";
import { CombatFeedback } from "./combat-feedback";
import { stableDirection } from "./motion";
import { nextWaypoint } from "./navigation";
import { CFG, ENEMY_BALANCE, ENEMY_XP, skillRecord, type Skill } from "./config";
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
import { zoneAt, zoneStats, ZONES, approachingZone } from "./zones";
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
import { targetsInArc, lineOfSight, selectTarget } from "./combat";
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
  fieldItems: FieldItems;
  notifications = new Notifications();
  readability: PlayerReadability;
  combatText: CombatText;
  attackTarget?: Enemy;
  ambushes: { point: Point; kind: number; remaining: number }[] = [];
  damageOrigin?: Point;
  damageDirectionTime = 0;
  private boundaryClock = 0;
  private accumulator = 0;
  private uiClock = 0;
  input = new Input();
  audio = new Audio();
  save = load();
  renderer: T.WebGLRenderer;
  player = freshPlayer();
  selectedSpecies: Species = "wolf";
  selectedElement: Element = "air";
  speciesCombat = new NewSpeciesCombat(this);
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
    kind?: string;
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
  cooldowns = skillRecord();
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
    this.fieldItems = new FieldItems(this.world.scene, this.world.obstacles);
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.hero = new T.Sprite(
      new T.SpriteMaterial({ transparent: false, alphaTest: 0.4 }),
    );
    this.hero.scale.set(2.3, 2.3, 1);
    this.hero.center.set(0.5, 16 / 256);
    this.world.scene.add(this.hero);
    this.readability = new PlayerReadability(this.world.scene);
    this.combatText = new CombatText(this.world.scene);
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
    this.renderer.shadowMap.needsUpdate = true;
  }
  clear() {
    this.speciesCombat.clear();
    this.hero.visible = true;
    this.ambushes = [];
    this.fieldItems.clear();
    this.notifications.clear();
    this.combatText.clear();
    this.attackTarget = undefined;
    this.damageOrigin = undefined;
    this.damageDirectionTime = 0;
    this.accumulator = 0;
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
    this.player = freshPlayer(this.selectedSpecies, this.selectedElement);
    this.anim.texture.dispose();
    this.anim = new Animator(this.hero, this.agentAssets[this.selectedSpecies]);
    this.fieldItems.seed(this.player);
    this.time = 0;
    this.currentRegion = 1;
    this.spawnClock = 1;
    this.boundaryClock = 0;
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
    this.cooldowns = skillRecord();
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
    this.input.active = true;
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
    this.player = freshPlayer(species, this.selectedElement);
    this.anim.texture.dispose();
    this.anim = new Animator(this.hero, this.agentAssets[species]);
    this.onUI();
  }
  selectElement(element: Element) {
    if (this.phase !== "menu" || !(element in ELEMENTS)) return;
    this.selectedElement = element;
    this.player.element = element;
    this.onUI();
  }
  pause() {
    if (this.phase === "playing") {
      this.phase = "paused";
      this.input.active = false;
      this.input.keys.clear();
      this.input.stick = { x: 0, z: 0 };
      this.onUI();
    }
  }
  resume() {
    if (this.phase === "paused") {
      this.phase = "playing";
      this.input.active = true;
      this.onUI();
    }
  }
  menu() {
    this.clear();
    this.phase = "menu";
    this.input.active = false;
    this.onUI();
  }
  message(t: string) {
    const category = t.includes("CHEFE")
      ? "boss"
      : t.includes("RAÍZES")
        ? "danger"
        : t.includes("PERIGO")
          ? "region"
          : "operation";
    this.notifications.push(t, t, "", category, category === "boss" ? 5 : 3.5);
    this.toast = t;
    this.toastTime = 2.5;
  }
  effect(x: number, z: number, color: number, size = 1, life = 0.4, grow = 2) {
    if (
      this.effects.length >=
      (this.save.reducedEffects ? CFG.particles / 3 : CFG.particles)
    )
      return;
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
    if (
      target.dead ||
      this.phase !== "playing" ||
      !lineOfSight(p, target, this.world.obstacles)
    )
      return;
    p.essence -= s.cost;
    this.cooldowns[key] = s.cooldown * p.cooldown;
    if (p.species !== "wolf") {
      this.activateSpeciesSkill(key, target, s, power);
      return;
    }
    if (key === "q") {
      const heading = normalize(target.x - p.x, target.z - p.z);
      if (this.attackAnim <= 0) this.heading = heading;
      for (const e of targetsInArc(
        this.enemies,
        p,
        heading,
        s.range * power,
      ).filter((e) => lineOfSight(p, e, this.world.obstacles))) {
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
        if (
          !e.dead &&
          distance(p, e) <= s.range &&
          lineOfSight(p, e, this.world.obstacles)
        )
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
          (e) =>
            !e.dead &&
            distance(p, e) <= s.range &&
            lineOfSight(p, e, this.world.obstacles),
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
        for (const enemy of targetsInArc(
          this.enemies,
          p,
          heading,
          s.range,
        ).filter((e) => lineOfSight(p, e, this.world.obstacles))) {
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
  shootBolt(target: Point, damage: number, kind: string, color: number) {
    if (this.bolts.length >= 32) return;
    const direction = normalize(target.x - this.player.x, target.z - this.player.z);
    const mesh = new T.Mesh(new T.IcosahedronGeometry(.22, 0), new T.MeshBasicMaterial({ color: 0x172826, depthTest: false }));
    const core = new T.Mesh(new T.IcosahedronGeometry(.15, 0), new T.MeshBasicMaterial({ color, depthTest: false }));
    mesh.add(core); mesh.renderOrder = 30; core.renderOrder = 31;
    this.world.scene.add(mesh);
    this.bolts.push({ x: this.player.x, z: this.player.z, vx: direction.x * 12, vz: direction.z * 12, damage, kind, life: distance(this.player, target) / 12 + .15, mesh });
  }
  private updateSpeciesEffects(dt: number) {
    if (this.gaze) {
      const gaze = this.gaze,
        d = this.input.direction();
      if (
        gaze.target.dead ||
        !lineOfSight(this.player, gaze.target, this.world.obstacles) ||
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
        if (
          !enemy.dead &&
          distance(v, enemy) < v.radius &&
          lineOfSight(v, enemy, this.world.obstacles)
        ) {
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
      const previous = { x: b.x, z: b.z };
      b.life -= dt;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      if (!lineOfSight(previous, b, this.world.obstacles, 0.12)) {
        b.life = 0;
        continue;
      }
      const target = this.enemies.find((e) => !e.dead && distance(b, e) < 0.8);
      if (target) {
        this.damage(target, b.damage);
        this.speciesCombat.onHit(target, b.kind || "wind");
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
    if (isNewSpecies(this.player.species)) { this.speciesCombat.auto(); return; }
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
      const target = selectTarget(
        this.enemies,
        this.player,
        (skillFor(this.player, key)?.range || 0) *
          (key === "q" && this.player.species === "wolf"
            ? 1 + this.player.skillPower.q
            : 1),
        this.world.obstacles,
      );
      if (!target) continue;
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
        r =
          ENEMY_BALANCE.spawnNear +
          Math.random() * (ENEMY_BALANCE.spawnFar - ENEMY_BALANCE.spawnNear),
        q = {
          x: this.player.x + Math.cos(a) * r,
          z: this.player.z + Math.sin(a) * r,
        };
      const test = { ...q };
      move(test, 0.01, 0.01, this.world.obstacles, 1);
      if (
        Math.abs(q.x) < WORLD.limitX - 2 &&
        Math.abs(q.z) < WORLD.limitZ - 2 &&
        distance(q, test) < 0.1 &&
        this.world.obstacles.every((o) => distance(q, o) > o.r + 1) &&
        true
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
      ENEMY_BALANCE.hp[kind] *
      region.hp *
      (kind === 3 ? 1 : 1 + this.time / ENEMY_BALANCE.hpRampDuration);
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
      speed: ENEMY_BALANCE.speed[kind] * region.speed,
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
      dotSum: 0,
      dotClock: 0,
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
    if (e.dead) return 0;
    const actual = amount * fieldDamageMultiplier(this.fieldItems.buffs);
    const effective = Math.min(Math.max(0, e.hp), actual);
    e.hp -= actual;
    if (flash) {
      this.combatText.pop(e, String(Math.max(1, Math.round(actual))));
      this.audio.play("hit");
    } else e.dotSum += actual;
    if (flash) {
      e.hit = 0.16;
      this.effect(e.x, e.z, 0xf1da9b, 0.45, 0.15, 1);
    }
    if (e.hp <= 0) {
      e.dead = true;
      this.speciesCombat.onKill(e);
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
      this.dropXP(e, e.xpValue);
      if (e.kind === 3) this.finish(true);
    }
    return effective;
  }
  private dropXP(p: Point, value: number) {
    const mesh = xpFragment(value, this.xpLabel);
    mesh.position.set(p.x, heightAt(p.x, p.z) + 0.28, p.z);
    this.world.scene.add(mesh);
    this.effect(p.x, p.z, 0xd5ed97, 0.4, 0.35, 1);
    this.gems.push({ x: p.x, z: p.z, value, age: 0, mesh });
    if (this.gems.length > 240) {
      const old = this.gems.shift()!;
      this.gems[0].value += old.value;
      this.world.scene.remove(old.mesh);
      this.disposeTransient(old.mesh);
    }
  }
  private collectFieldItem(kind: FieldItemKind): FieldNotice | null {
    const result = applyFieldItem(this.player, this.fieldItems.buffs, kind);
    if (!result) return null;
    const region = zoneAt(this.player.x, this.player.z);
    if (result.event === "ambush") {
      const points = ambushSpots(
        this.player,
        this.world.obstacles,
        Math.max(
          0,
          Math.min(
            5 + region.id,
            CFG.maxEnemies -
              this.enemies.filter((e) => !e.dead).length -
              this.ambushes.length,
          ),
        ),
      );
      for (const point of points) {
        const kind =
          region.id >= 3 && Math.random() < 0.2
            ? 2
            : Math.random() < 0.25
              ? 1
              : 0;
        this.ambushes.push({ point, kind, remaining: 1.2 });
        this.feedback.emit(
          point,
          { x: 0, z: 1 },
          1,
          "enemy",
          "windup",
          1.2,
          "circle",
        );
      }
      if (points.length)
        result.text = `${points.length} criaturas chegando em 1,2 s. Afaste-se dos sinais!`;
      else {
        result.event = "cache";
        result.title = "Chuva de fragmentos";
        result.tone = "good";
        result.text =
          "A relíquia revelou uma reserva de XP. Aproxime-se para coletar.";
      }
    }
    if (result.event === "cache")
      for (let i = 0; i < 5; i++) {
        const point = { ...this.player },
          angle = (i * Math.PI * 2) / 5;
        move(
          point,
          Math.cos(angle) * 2,
          Math.sin(angle) * 2,
          this.world.obstacles,
        );
        this.dropXP(point, 4 + region.id * 2);
      }
    if (result.event === "calm") {
      for (const enemy of this.enemies)
        if (!enemy.dead && distance(enemy, this.player) <= 12) {
          enemy.slow = Math.max(enemy.slow, 5);
          enemy.windup = 0;
          enemy.action = 0;
          enemy.cooldown = Math.max(enemy.cooldown, 5);
          this.feedback.cancelSource(enemy);
        }
      this.fieldItems.buffs.haste = Math.max(this.fieldItems.buffs.haste, 15);
      result.text =
        "Criaturas próximas desaceleradas e ataques interrompidos por 5s. Agilidade por 15s.";
    }
    this.effect(
      this.player.x,
      this.player.z,
      result.tone === "danger" ? 0xc7a1da : 0xbce5a0,
      0.8,
      0.6,
      2,
    );
    this.audio.play("collect");
    return result;
  }
  collectionRadius() {
    return (
      pickupRadius(this.player, this.scent > 0) *
      fieldMagnetMultiplier(this.fieldItems.buffs)
    );
  }
  hurt(amount: number, type: DamageType = "blunt", source?: Point) {
    if (this.invuln > 0 || this.speciesCombat.reconstruction > 0) return false;
    if (type === "poison" && this.player.species === "mummy" && this.player.skills.e > 0) {
      this.combatText.pop(this.player, "IMUNE", "#c9dca6", true);
      return false;
    }
    if (avoidsDamage(this.player)) {
      this.evadeFeedback = 0.5;
      this.feedback.evade(this.player);
      this.combatText.pop(this.player, "ESQUIVOU", "#9de3c0", true);
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
      this.combatText.pop(this.player, "PROTEGEU", "#95d9ee", true);
      this.message("É TIPO TROCAR DE ROUPA · Pele descartada");
    }
    const beforeHp = this.player.hp;
    this.player.hp = Math.max(
      0,
      this.player.hp -
        mitigatedDamage(this.player, amount, type) *
          (1 - this.speciesCombat.bonusProtection()) *
          fieldProtectionMultiplier(this.fieldItems.buffs),
    );
    const protectedHit =
      this.player.armor > 0 ||
      this.player.empowerTime > 0 ||
      this.speciesCombat.bonusProtection() > 0 ||
      this.player.species === "gorgon" ||
      this.fieldItems.buffs.ward > 0;
    this.combatText.pop(
      this.player,
      `−${Math.ceil(beforeHp - this.player.hp)}${protectedHit ? " PROT." : ""}`,
      protectedHit ? "#a4dcec" : "#ffb49f",
      protectedHit,
    );
    if (protectedHit) this.audio.play("block");
    if (source) {
      this.damageOrigin = { x: source.x, z: source.z };
      this.damageDirectionTime = 0.65;
    }
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
    if (this.projectiles.length >= ENEMY_BALANCE.maxProjectiles) return;
    const mesh = new T.Mesh(
      new T.IcosahedronGeometry(0.25, 0),
      new T.MeshBasicMaterial({ color: 0x1c2527, depthTest: false }),
    );
    this.world.scene.add(mesh);
    mesh.add(
      new T.Mesh(
        new T.IcosahedronGeometry(0.16, 0),
        new T.MeshBasicMaterial({ color: 0xffd58a, depthTest: false }),
      ),
    );
    mesh.renderOrder = 30;
    this.projectiles.push({
      x: e.x,
      z: e.z,
      vx: Math.cos(angle) * ENEMY_BALANCE.projectileSpeed,
      vz: Math.sin(angle) * ENEMY_BALANCE.projectileSpeed,
      life: 5,
      damage: ENEMY_BALANCE.projectileDamage[e.kind] * e.damageScale,
      damageType: e.kind === 3 ? "piercing" : "arcane",
      mesh,
    });
  }
  finish(win: boolean) {
    if (this.phase !== "playing") return;
    this.phase = win ? "victory" : "defeat";
    this.input.active = false;
    this.input.keys.clear();
    this.input.stick = { x: 0, z: 0 };
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
    this.input.active = true;
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
    this.input.active = false;
    this.input.keys.clear();
    this.input.stick = { x: 0, z: 0 };
    this.audio.play("level");
    this.onUI();
  }
  update(dt: number) {
    if (this.phase !== "playing") return;
    if (dt > 0.05) {
      for (
        let left = dt;
        left > 1e-6 && this.phase === "playing";
        left -= 1 / 60
      )
        this.update(Math.min(left, 1 / 60));
      return;
    }
    for (const a of this.ambushes) {
      a.remaining -= dt;
      if (a.remaining <= 0) this.spawn(a.kind, a.point);
    }
    this.ambushes = this.ambushes.filter((a) => a.remaining > 0);
    this.notifications.tick(dt);
    this.combatText.update(dt);
    this.damageDirectionTime = Math.max(0, this.damageDirectionTime - dt);
    const p = this.player;
    this.fieldItems.beginFrame(dt);
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
    p.rootImmunity = Math.max(0, p.rootImmunity - dt);
    p.immobilized = Math.max(0, p.immobilized - dt * immobilizationRate(p));
    p.mobilityTime = Math.max(0, p.mobilityTime - dt);
    const dir = this.input.direction();
    if (dir.x || dir.z) {
      if (this.attackAnim <= 0) this.heading = dir;
      const speed =
        movementSpeed(p, zoneAt(p.x, p.z).id === 4) *
        this.speciesCombat.bonusSpeed() *
        fieldSpeedMultiplier(this.fieldItems.buffs);
      move(p, dir.x * speed * dt, dir.z * speed * dt, this.world.obstacles);
    }
    this.fieldItems.update(dt, p, (kind) => {
      const notice = this.collectFieldItem(kind);
      if (notice)
        this.notifications.push(
          notice.title,
          notice.title,
          notice.text,
          notice.tone === "danger"
            ? "danger"
            : kind === "relic"
              ? "buff"
              : "pickup",
          4,
        );
      return notice;
    });
    this.boundaryClock = Math.max(0, this.boundaryClock - dt);
    if (this.boundaryClock === 0 && (dir.x || dir.z)) {
      const next = approachingZone(p.x, p.z, dir);
      if (next) {
        this.notifications.push(
          "border-" + next.id,
          "À frente: " + next.name,
          `Perigo ${next.id}/5 · Prepare-se antes de atravessar.`,
          "region",
          3,
        );
        this.boundaryClock = 5;
      }
    }
    const region = zoneAt(p.x, p.z);
    if (region.id !== this.currentRegion) {
      this.currentRegion = region.id;
      this.message(`${region.name} · PERIGO ${region.id}`);
    }
    this.anim.direction = stableDirection(
      this.anim.direction,
      (this.attackAnim > 0 ? this.attackHeading : this.heading).x,
      (this.attackAnim > 0 ? this.attackHeading : this.heading).z,
    );
    this.spawnClock -= dt;
    if (this.spawnClock <= 0 && !this.boss?.dead) {
      this.spawnClock = Math.max(
        ENEMY_BALANCE.spawnMin,
        ENEMY_BALANCE.spawnStart - this.time / ENEMY_BALANCE.spawnAcceleration,
      );
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
        { x: -41, z: 39 },
        { x: -38, z: 40 },
        { x: -43, z: 37 },
        { x: -40, z: 42 },
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
    this.speciesCombat.update(dt);
    this.autoSkills();
    if (this.phase !== "playing") return;
    this.attackClock -= dt;
    if (this.attackClock <= 0 && this.attackAnim <= 0 && !attackImpact) {
      const target = selectTarget(
        this.enemies,
        p,
        p.range + this.speciesCombat.bonusRange(),
        this.world.obstacles,
        this.speciesCombat.priorityTarget() || this.attackTarget,
      );
      if (target) {
        this.attackTarget = target;
        this.heading = normalize(target.x - p.x, target.z - p.z);
        this.attackHeading = { ...this.heading };
        this.attackClock =
          CHARACTERS[p.species].interval /
          p.attack /
          (p.empowerTime > 0 ? 1 + p.empowerAttack : 1) /
          (this.fury > 0 ? 1 + 0.65 * (1 + p.skillPower.r) : 1);
        this.attackDuration = Math.min(0.3, this.attackClock * 0.9);
        this.attackAnim = this.attackDuration;
        this.anim.set("attack", true);
        this.audio.play("claw");
      }
    } // Impact occurs on the extended pose, once per animation.
    if (attackImpact) {
      if (p.species === "saci") this.shootWind();
      else if (p.species === "fairy") this.shootBolt(
        { x: p.x + this.attackHeading.x * p.range, z: p.z + this.attackHeading.z * p.range },
        p.damage * (p.element === "earth" ? 1.2 : 1) * (p.empowerTime > 0 ? 1 + p.empowerDamage : 1),
        p.element === "fire" ? "fire-basic" : p.element, ELEMENTS[p.element].color,
      );
      else
        for (const e of targetsInArc(
          this.enemies,
          p,
          this.attackHeading,
          p.range + this.speciesCombat.bonusRange(),
        ).filter((e) => lineOfSight(p, e, this.world.obstacles)))
          this.damage(
            e,
            p.damage * (this.fury > 0 ? 1 + 0.7 * (1 + p.skillPower.r) : 1) * (p.empowerTime > 0 ? 1 + p.empowerDamage : 1),
          );
      this.feedback.emit(
        { ...p },
        this.attackHeading,
        p.range,
        "player",
        "impact",
        0.24,
        p.species === "saci" || p.species === "fairy" || p.species === "mummy" ? "line" : "cone",
      );
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.dotClock -= dt;
      if (e.dotClock <= 0 && e.dotSum > 0) {
        this.combatText.pop(
          e,
          String(Math.ceil(e.dotSum)),
          e.poisonTime > 0 ? "#c5e58c" : "#a6e8e1",
        );
        e.dotSum = 0;
        e.dotClock = 0.6;
      }
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
        e.mesh.material.depthTest = true;
        e.mesh.renderOrder = 0;
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
      const direct = d < 3 && lineOfSight(e, p, this.world.obstacles, 0.45);
      const v = normalize(
        (direct ? p.x : e.nav.x) - e.x,
        (direct ? p.z : e.nav.z) - e.z,
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
            lineOfSight(e, p, this.world.obstacles) &&
            (e.kind === 3
              ? d < 5
              : inCone(e, e.facing, p, e.kind === 2 ? 2.8 : 1.9))
          ) {
            const hit = this.hurt(
              ENEMY_BALANCE.meleeDamage[e.kind] * e.damageScale,
              e.kind === 0 ? "slashing" : "blunt",
              e,
            );
            if (
              hit &&
              e.kind === 0 &&
              ++e.attacks % 3 === 0 &&
              p.rootImmunity <= 0
            ) {
              p.immobilized = Math.max(
                p.immobilized,
                ENEMY_BALANCE.rootDuration,
              );
              p.rootImmunity =
                ENEMY_BALANCE.rootDuration + ENEMY_BALANCE.rootImmunity;
              this.message("RAÍZES · Movimento preso temporariamente");
            }
          } else if (e.attackMode === "melee" || e.attackMode === "slam")
            this.combatText.pop(e, "ERROU", "#b9c9b7", true);
        }
      } else if (e.action > 0) {
        // Finish the visible strike before locomotion resumes.
      } else if (e.kind === 1 && d < 11) {
        if (e.cooldown <= 0) {
          e.windup = ENEMY_BALANCE.windup[1];
          e.cooldown = ENEMY_BALANCE.interval[1];
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
        e.windup = ENEMY_BALANCE.windup[e.kind];
        e.cooldown = ENEMY_BALANCE.interval[e.kind];
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
          e.windup = ENEMY_BALANCE.windup[0];
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
      const revealed = this.speciesCombat.revealed(e);
      e.mesh.material.depthTest = !(e.windup > 0 || e.action > 0 || revealed);
      e.mesh.renderOrder = e.windup > 0 || e.action > 0 || revealed ? 21 : 0;
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
            : revealed ? 0xffc5c9 : this.scent > 0
              ? 0xc9ffb9
              : 0xffffff,
      );
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    for (const b of this.projectiles) {
      const previous = { x: b.x, z: b.z };
      b.life -= dt;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.mesh.position.set(b.x, heightAt(b.x, b.z) + 0.8, b.z);
      if (!lineOfSight(previous, b, this.world.obstacles, 0.12)) {
        b.life = 0;
        continue;
      }
      if (distance(b, p) < 0.7) {
        this.hurt(b.damage, b.damageType, { x: p.x - b.vx, z: p.z - b.vz });
        b.life = 0;
      }
      if (this.world.obstacles.some((o) => distance(o, b) < o.r)) b.life = 0;
    }
    this.projectiles = this.projectiles.filter((b) => {
      if (b.life > 0) return true;
      this.world.scene.remove(b.mesh);
      this.disposeTransient(b.mesh);
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
      if (gem.age >= XP_DROP_TIME && d <= this.collectionRadius())
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
      (this.attackAnim > 0 ? this.attackHeading : this.heading).x,
      (this.attackAnim > 0 ? this.attackHeading : this.heading).z,
    );
    if (this.phase === "playing" || this.phase === "upgrade")
      this.anim.set(
        this.hurtTime > 0
          ? "hurt"
          : this.attackAnim > 0
            ? "attack"
            : this.howl > 0
              ? "howl"
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
    if (this.phase === "menu") {
      this.last = now;
      requestAnimationFrame(this.loop);
      return;
    }
    const dt = Math.min((now - this.last) / 1000 || 0, 0.25);
    this.last = now;
    if (this.phase === "playing") {
      this.accumulator += dt;
      while (this.accumulator >= 1 / 60 && this.phase === "playing") {
        this.update(1 / 60);
        this.accumulator -= 1 / 60;
      }
    } else {
      this.accumulator = 0;
    }
    if (this.phase === "victory" || this.phase === "defeat") {
      this.updateCorpses(dt);
      this.combatText.update(dt);
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
    this.collector.scale.setScalar(this.collectionRadius());
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
    this.world.update(
      this.camera,
      this.hero,
      this.phase === "playing" ? dt : 0,
      !this.save.reducedEffects,
    );
    this.readability.update(
      this.hero,
      this.camera,
      ["playing", "paused", "upgrade"].includes(this.phase),
      this.world.occlusion.hidden,
      this.player.range,
      this.attackAnim > 0,
    );
    this.speciesCombat.render();
    this.renderer.render(this.world.scene, this.camera);
    this.uiClock += dt;
    if (this.uiClock >= 0.1) {
      this.onUI();
      this.uiClock = 0;
    }
    requestAnimationFrame(this.loop);
  };
}
