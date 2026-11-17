import * as T from "three";
import type { Game } from "./game";
import type { Enemy } from "./enemies";
import { canMove, distance, heightAt, inCone, move, normalize, type Point } from "./logic";
import { lineOfSight, selectTarget } from "./combat";
import { SPECIES_SKILLS, skillFor } from "./species";
import type { Skill } from "./config";
import { ELEMENTS, isNewSpecies } from "./new-species";
import { apexUnlocked, canPayBlood, drainRecovery, NEW_BALANCE, PLAGUES } from "./new-species-rules";
import { poison, petrify } from "./species-effects";
import { EnemyAnimator } from "./enemy-animation";

type Area = Point & { kind: "flames" | "arena" | "mist" | "stones"; life: number; tick: number; power: number; radius: number };
type Servant = Point & { life: number; clock: number; mesh: T.Sprite; anim: EnemyAnimator };
// Additional species share the existing damage, navigation, feedback and pause clocks.
export class NewSpeciesCombat {
  areas: Area[] = [];
  bleeds = new Map<Enemy, { remaining: number; dps: number }>();
  burns = new Map<Enemy, { remaining: number; dps: number }>();
  servants: Servant[] = [];
  mark?: Enemy;
  markTime = 0;
  batTime = 0;
  copyTime = 0;
  copiedKind?: number;
  lastVictim?: number;
  safeTime = 0;
  reconstruction = 0;
  reconstructPower = 1;
  season?: { elapsed: number; stage: number; power: number; tick: number };
  private bleedingKill?: Enemy;
  private bat?: T.Sprite;
  constructor(public game: Game) {}
  clear() {
    for (const s of this.servants) this.removeServant(s);
    this.servants = [];
    this.areas = [];
    this.bleeds.clear(); this.burns.clear();
    this.mark = undefined; this.markTime = this.batTime = this.copyTime = this.safeTime = this.reconstruction = 0;
    this.lastVictim = this.copiedKind = undefined; this.season = undefined;
    if (this.bat) this.bat.visible = false;
  }
  near(range: number, origin: Point = this.game.player) {
    return this.game.enemies.filter(e => !e.dead && distance(e, origin) <= range && lineOfSight(origin, e, this.game.world.obstacles));
  }
  interrupt(e: Enemy, duration = .6) {
    e.windup = 0; e.action = 0; e.cooldown = Math.max(e.cooldown, duration);
    this.game.feedback.cancelSource(e);
  }
  control(e: Enemy, duration: number, mode: "root" | "confuse" | "freeze") {
    const time = Math.min(e.kind === 3 ? .65 : 4, duration);
    if (mode === "freeze") petrify(e, time);
    else if (mode === "root") e.rooted = Math.max(e.rooted, time);
    else if (e.kind !== 3) e.disoriented = Math.max(e.disoriented, time);
    else e.slow = Math.max(e.slow, time);
    this.interrupt(e, time);
  }
  private announce(title: string, text = "") {
    this.game.notifications.push(title, title, text, "buff", 3);
  }
  private area(kind: Area["kind"], life: number, power: number, radius: number, center: Point = this.game.player) {
    if (this.areas.length >= 6) this.areas.shift();
    this.areas.push({ x: center.x, z: center.z, kind, life, power, radius, tick: 0 });
  }
  private empower(duration: number, damage: number, armor: number, attack = 0) {
    const p = this.game.player;
    p.empowerTime = duration; p.empowerDamage = damage; p.empowerArmor = armor; p.empowerAttack = attack;
  }
  private safeDestination(length: number) {
    const g = this.game, p = g.player, input = g.input.direction();
    let best: Point | undefined, score = -Infinity;
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8, dx = Math.cos(a), dz = Math.sin(a), q = { x: p.x, z: p.z };
      move(q, dx * length, dz * length, g.world.obstacles);
      if (distance(q, p) < 1 || !canMove(q, g.world.obstacles) || !lineOfSight(p, q, g.world.obstacles, .45)) continue;
      const nearest = Math.min(10, ...g.enemies.filter(e => !e.dead).map(e => distance(q, e)));
      const value = nearest + (dx * input.x + dz * input.z) * .4;
      if (nearest > 1.8 && value > score) { score = value; best = q; }
    }
    return best;
  }
  private eligible(key: Skill, target?: Enemy) {
    const g = this.game, p = g.player, s = skillFor(p, key);
    if (!s || key === " " || !p.skills[key] || g.cooldowns[key] > 0 || p.essence < s.cost || !canPayBlood(p, key)) return false;
    if (s.apex && !apexUnlocked(p)) return false;
    if (s.range > 0 && (!target || target.dead || distance(p, target) > s.range || !lineOfSight(p, target, g.world.obstacles))) return false;
    const crowded = this.near(4.5).length >= 3;
    if (p.species === "curupira" && key === "e") return crowded;
    if (p.species === "vampire") {
      if (key === "q") return p.hp < p.maxHp * .95 && !!target && target.kind !== 1;
      if (key === "e") return !!target && target.kind !== 3;
      if (key === "mobility" || key === "mist") return crowded;
      if (key === "trap" || key === "r") return !!target && target.hp < target.maxHp;
      if (key === "borrow") return this.lastVictim !== undefined;
    }
    if (p.species === "mummy" && key === "mobility") return crowded && !!this.safeDestination(3.5);
    if (p.species === "construct") {
      if (key === "defense") return p.hp <= p.maxHp * NEW_BALANCE.repairThreshold;
      if (key === "mobility") return crowded;
      if (key === "r") return crowded && p.hp <= p.maxHp * NEW_BALANCE.reconstructThreshold && this.reconstruction <= 0;
    }
    if (p.species === "fairy") {
      if (key === "e") return !!target && target.windup > 0;
      if (key === "defense") return this.safeTime >= 3 && p.essence < p.maxEssence;
    }
    return true;
  }
  auto() {
    const g = this.game, p = g.player;
    // Emergency reconstruction takes precedence over ordinary modules.
    const keys = Object.keys(SPECIES_SKILLS[p.species]) as Skill[];
    if (p.species === "construct") keys.sort((a, b) => (a === "r" ? -1 : b === "r" ? 1 : 0));
    for (const key of keys) {
      if (g.phase !== "playing") break;
      const s = skillFor(p, key)!;
      let candidates = this.near(s.range);
      if (p.species === "vampire" && key === "q") candidates = candidates.filter(e => e.kind !== 1);
      if (p.species === "vampire" && key === "e") candidates = candidates.filter(e => e.kind !== 3);
      if (p.species === "vampire" && (key === "trap" || key === "r")) candidates = candidates.filter(e => e.hp < e.maxHp);
      if (p.species === "fairy" && key === "e") candidates = candidates.filter(e => e.windup > 0);
      const target = selectTarget(candidates, p, s.range, g.world.obstacles);
      this.cast(key, target);
    }
  }
  cast(key: Skill, target?: Enemy) {
    const g = this.game, p = g.player;
    if (!isNewSpecies(p.species) || g.phase !== "playing" || !this.eligible(key, target)) return false;
    const s = skillFor(p, key)!, power = 1 + p.skillPower[key];
    p.essence -= s.cost; p.hp -= s.healthCost || 0;
    g.cooldowns[key] = s.cooldown * p.cooldown; g.howl = .35;
    if (target && g.attackAnim <= 0) g.heading = normalize(target.x - p.x, target.z - p.z);
    const targets = this.near(s.range), heading = target ? normalize(target.x - p.x, target.z - p.z) : g.heading;
    if (p.species === "curupira") {
      if (key === "q") g.shootBolt(target!, s.damage * power, "fire", 0xffa34c);
      if (key === "e") this.empower(s.duration * power, .4 * power, Math.min(.5, .2 * power));
      if (key === "trap") this.area("flames", s.duration * power, power, s.range);
      if (key === "r") {
        this.area("arena", s.duration * power, power, s.range);
        for (const e of targets) {
          g.damage(e, s.damage * power);
          if (e.kind !== 3) { const d = normalize(e.x - p.x, e.z - p.z); move(e, d.x * 3, d.z * 3, g.world.obstacles); }
          this.interrupt(e);
        }
        this.announce("SELVA!!!", "Arena sobrenatural · ameaças reveladas por tempo limitado.");
      }
    }
    if (p.species === "vampire") {
      if (key === "q") { const actual = g.damage(target!, s.damage * power); this.heal(drainRecovery(actual, p.maxHp - p.hp)); }
      if (key === "e") this.control(target!, s.duration * power, "confuse");
      if (key === "mobility") { this.batTime = s.duration * power; p.mobilityTime = this.batTime; }
      if (key === "trap") { this.mark = target; this.markTime = s.duration * power; }
      if (key === "mist") this.area("mist", s.duration * power, power, s.range);
      if (key === "borrow") { this.copiedKind = this.lastVictim; this.copyTime = s.duration * power; this.announce("DOIS É BOM", ["Agilidade da raiz", "Alcance do espectro", "Proteção do bruto", "Proteção do guardião"][this.copiedKind!]); }
      if (key === "r") {
        for (const e of targets.filter(e => e.hp < e.maxHp)) this.bleeds.set(e, { remaining: s.duration * power, dps: s.damage * power });
        this.mark = target; this.markTime = s.duration * power;
        this.announce("A SANGRIA", "Sangramento ativo · até três servos, por oito segundos.");
      }
    }
    if (p.species === "mummy") {
      if (key === "q") {
        g.damage(target!, s.damage * power);
        if (!target!.dead) {
          if (target!.kind <= 1) { const d = normalize(p.x - target!.x, p.z - target!.z); move(target!, d.x * Math.min(2.8, distance(p, target!) - 1.5), d.z * Math.min(2.8, distance(p, target!) - 1.5), g.world.obstacles); }
          this.control(target!, s.duration * power, "root");
          g.feedback.emit(p, heading, distance(p, target!), "player", "impact", .3, "line");
        }
      }
      if (key === "e") for (const e of targets.filter(e => inCone(p, heading, e, s.range))) { g.damage(e, s.damage * power); if (!e.dead) poison(e, 7 * power, s.duration); }
      if (key === "mobility") {
        const destination = this.safeDestination(3.5);
        if (destination) { g.feedback.emit(p, normalize(destination.x - p.x, destination.z - p.z), distance(p, destination), "player", "impact", .35, "line"); p.x = destination.x; p.z = destination.z; p.immobilized = 0; g.invuln = Math.max(g.invuln, s.duration * power); }
      }
      if (key === "r") this.plague(Math.floor(Math.random() * PLAGUES.length), power);
    }
    if (p.species === "construct") {
      if (key === "q") g.shootBolt(target!, s.damage * power, "module", 0x67e7ef);
      if (key === "e") this.empower(s.duration * power, 0, Math.min(.6, .3 * power));
      if (key === "defense") this.heal(p.maxHp * Math.min(.55, NEW_BALANCE.repairFraction * power));
      if (key === "mobility") for (const e of targets) { g.damage(e, s.damage * power); this.interrupt(e); }
      if (key === "r") {
        this.reconstruction = s.duration; this.reconstructPower = power;
        g.invuln = Math.max(g.invuln, s.duration + .2);
        g.feedback.emit(p, g.heading, s.range, "player", "windup", s.duration, "circle");
        this.announce("AUTO DESTRUIÇÃO", "Núcleo protegido · reconstrução garantida após a explosão.");
      }
    }
    if (p.species === "fairy") {
      if (key === "q") for (const e of targets) this.control(e, s.duration * power, "confuse");
      if (key === "e") { this.control(target!, s.duration * power, "freeze"); g.damage(target!, s.damage * power); }
      if (key === "defense") { p.essence = Math.min(p.maxEssence, p.essence + 25 * power); this.announce("HEI MICHAEL DOUGLAS", "Meditação segura · Essência recuperada."); }
      if (key === "r") { this.season = { elapsed: 0, stage: -1, power, tick: 0 }; this.updateSeasons(0); }
    }
    g.effect(p.x, p.z, this.color(), 1, .4, 2); g.audio.play("howl");
    return true;
  }
  plague(index: number, power: number) {
    const g = this.game, s = skillFor(g.player, "r")!;
    this.announce("AS PRAGAS · " + PLAGUES[index].toLocaleUpperCase("pt-BR"));
    const targets = this.near(s.range);
    for (const e of targets) {
      if (index === 0) this.control(e, s.duration * power, "confuse");
      if (index === 1) this.control(e, s.duration * power, "root");
      if (index === 2) this.control(e, s.duration * power, "freeze");
      if (index === 4) poison(e, 14 * power, s.duration * power);
      if (index === 5) g.damage(e, s.damage * power * (e.revived ? 2 : 1) * (e.kind === 3 ? .65 : 1));
    }
    if (index === 3) {
      for (const e of targets.slice(0, 8)) {
        this.area("stones", .85, power, 1.7, e);
        g.feedback.emit(e, { x: 0, z: 1 }, 1.7, "player", "windup", .8, "circle");
      }
    }
  }
  color() { return ({curupira: 0xffa34c, vampire: 0xd795ba, mummy: 0xdfcfa2, construct: 0x76e4ee, fairy: ELEMENTS[this.game.player.element].color} as Record<string, number>)[this.game.player.species] || 0xe6dda6; }
  heal(amount: number) {
    const p = this.game.player, actual = Math.min(p.maxHp - p.hp, amount);
    p.hp += actual;
    if (actual > 0) this.game.combatText.pop(p, "+" + Math.ceil(actual), "#b7efb0", true);
  }
  onHit(e: Enemy, kind: string) {
    if (e.dead) return;
    const p = this.game.player;
    if (kind === "fire" || kind === "fire-basic") this.burns.set(e, { remaining: 3, dps: kind === "fire" ? 6 * (1 + p.skillPower.q) : 4 });
    if (kind === "water") e.slow = Math.max(e.slow, 2);
    if (kind === "air" && e.kind !== 3) { const d = normalize(e.x - p.x, e.z - p.z); move(e, d.x * .65, d.z * .65, this.game.world.obstacles); }
  }
  onKill(e: Enemy) {
    this.lastVictim = e.kind;
    if (this.game.player.species === "vampire" && this.bleedingKill === e && this.servants.length < NEW_BALANCE.maxServants) {
      const asset = this.game.enemyAssets[e.kind], mesh = new T.Sprite(new T.SpriteMaterial({ transparent: true, opacity: .65, alphaTest: .4, color: 0xdda4dc }));
      const anim = new EnemyAnimator(mesh, asset);
      this.game.world.scene.add(mesh);
      this.servants.push({ x: e.x, z: e.z, life: NEW_BALANCE.servantLife, clock: .3, mesh, anim });
    }
  }
  private removeServant(s: Servant) { this.game.world.scene.remove(s.mesh); s.anim.dispose(); }
  bonusRange() { return this.copyTime > 0 && this.copiedKind === 1 ? 1.2 : 0; }
  bonusSpeed() { return this.copyTime > 0 && this.copiedKind === 0 ? 1.2 : 1; }
  bonusProtection() { return this.copyTime > 0 && (this.copiedKind || 0) >= 2 ? .2 : 0; }
  priorityTarget() { return this.markTime > 0 && this.mark && !this.mark.dead ? this.mark : undefined; }
  revealed(e: Enemy) { return (this.markTime > 0 && this.mark === e) || this.areas.some(a => a.kind === "arena" && distance(a, e) <= a.radius); }
  private updateSeasons(dt: number) {
    if (!this.season) return;
    const s = this.season, g = this.game, p = g.player, def = skillFor(p, "r")!;
    s.elapsed += dt; s.tick -= dt;
    const stage = Math.floor(s.elapsed / 2);
    if (stage >= 4) { this.season = undefined; return; }
    if (stage !== s.stage) {
      s.stage = stage;
      this.announce("QUATRO ESTAÇÕES · " + ["PRIMAVERA", "VERÃO", "OUTONO", "INVERNO"][stage]);
      const near = this.near(def.range);
      if (stage === 0) { this.heal(16 * s.power); for (const e of near) this.control(e, 1.4 * s.power, "root"); }
      if (stage === 1) this.empower(2, .3 * s.power, 0);
      if (stage === 2) for (const e of near) { e.slow = Math.max(e.slow, 3); this.interrupt(e); }
      if (stage === 3) for (const e of near) this.control(e, 1.5 * s.power, "freeze");
    }
    if (s.tick <= 0) {
      s.tick = .5;
      g.effect(p.x, p.z, [0xb7e488, 0xffa34c, 0xd2a36b, 0xa5e8f5][stage], def.range, .6, .15);
      if (stage === 1) for (const e of this.near(def.range)) { g.damage(e, def.damage * s.power * .5, false); this.burns.set(e, {remaining: 3, dps: 4 * s.power}); }
    }
  }
  update(dt: number) {
    const g = this.game, p = g.player;
    if (!isNewSpecies(p.species)) return;
    this.markTime = Math.max(0, this.markTime - dt); this.batTime = Math.max(0, this.batTime - dt); this.copyTime = Math.max(0, this.copyTime - dt);
    p.empowerTime = Math.max(0, p.empowerTime - dt);
    this.safeTime = this.near(10).length === 0 ? this.safeTime + dt : 0;
    if (this.reconstruction > 0) {
      this.reconstruction -= dt;
      if (this.reconstruction <= 0) {
        const def = skillFor(p, "r")!;
        for (const e of this.near(def.range)) g.damage(e, def.damage * this.reconstructPower);
        p.hp = Math.min(p.maxHp, Math.max(p.hp, p.maxHp * NEW_BALANCE.reconstructFloor));
        g.invuln = Math.max(g.invuln, 1); this.announce("RECONSTRUÇÃO CONCLUÍDA", "Núcleo estável · corpo restaurado.");
      }
    }
    this.updateSeasons(dt);
    for (const [map, bleed] of [[this.bleeds, true], [this.burns, false]] as const) for (const [e, dot] of map) {
      const active = Math.min(dt, Math.max(0, dot.remaining)); dot.remaining -= dt;
      if (!e.dead && active > 0) {
        if (bleed) this.bleedingKill = e;
        g.damage(e, dot.dps * active, false);
        this.bleedingKill = undefined;
      }
      if (dot.remaining <= 0 || e.dead) map.delete(e);
    }
    for (const a of this.areas) {
      a.life -= dt; a.tick -= dt;
      if (a.kind === "flames") { a.x = p.x; a.z = p.z; }
      if (a.kind === "stones") {
        if (a.life <= 0) { for (const e of this.near(a.radius, a)) g.damage(e, 50 * a.power); g.effect(a.x, a.z, 0xb7a58e, a.radius, .4, .5); }
        continue;
      }
      if (a.life <= 0) continue;
      if (a.tick <= 0) {
        a.tick += .5;
        g.effect(a.x, a.z, a.kind === "mist" ? 0xc7a8dc : 0xf4a451, a.radius, .55, .1);
        for (const e of this.near(a.radius, a)) {
          if (a.kind === "flames") g.damage(e, (skillFor(p, "trap")?.damage || 12) * .5 * a.power, false);
          // Specters already see in darkness and ignore the mist.
          if (a.kind === "mist" && e.kind !== 1) this.control(e, .7, "confuse");
        }
      }
    }
    this.areas = this.areas.filter(a => a.life > 0);
    for (const s of this.servants) {
      s.life -= dt; s.clock -= dt;
      if (s.life <= 0) continue;
      const target = selectTarget(g.enemies, s, 12, g.world.obstacles);
      const dest = target || p, direction = normalize(dest.x - s.x, dest.z - s.z);
      if (distance(s, dest) > 1.5) move(s, direction.x * dt * 4.5, direction.z * dt * 4.5, g.world.obstacles);
      if (target && distance(s, target) < 2.3 && s.clock <= 0) { g.damage(target, NEW_BALANCE.servantDamage); s.clock = 1; s.anim.set("attack"); }
      else s.anim.set("walk");
      s.anim.direction = Math.abs(direction.x) > Math.abs(direction.z) ? (direction.x < 0 ? 2 : 3) : (direction.z < 0 ? 1 : 0);
      s.anim.update(dt); s.mesh.position.set(s.x, heightAt(s.x, s.z), s.z);
    }
    this.servants = this.servants.filter(s => { if (s.life > 0) return true; this.removeServant(s); return false; });
  }
  status() {
    const out: string[] = [];
    if (this.batTime > 0) out.push(`Forma de Morcego · ${Math.ceil(this.batTime)}s`);
    if (this.copyTime > 0) out.push(`Dois É Bom · ${Math.ceil(this.copyTime)}s`);
    if (this.markTime > 0 && this.mark && !this.mark.dead) out.push(`Presa marcada · ${Math.ceil(this.markTime)}s`);
    if (this.reconstruction > 0) out.push("Núcleo protegido · reconstruindo");
    if (this.season) out.push(`Quatro Estações · ${["Primavera", "Verão", "Outono", "Inverno"][this.season.stage]}`);
    if (this.servants.length) out.push(`${this.servants.length}/3 servos temporários`);
    if (this.game.player.empowerTime > 0) out.push(`Fortalecimento · ${Math.ceil(this.game.player.empowerTime)}s`);
    return out;
  }
  render() {
    const g = this.game, active = this.batTime > 0 && ["playing", "paused", "upgrade"].includes(g.phase);
    g.hero.visible = !active;
    if (active && !this.bat) {
      const c = document.createElement("canvas"); c.width = 32; c.height = 20;
      const ctx = c.getContext("2d")!;
      // Deliberately small pixel silhouette, separate from the humanoid pose atlas.
      const lines = ["100000000110000000001", "110000001111000000011", "111100011111100001111", "111111111111111111111", "011111111111111111110", "001111111111111111100", "000110011111100110000", "000000001111000000000", "000000001001000000000"];
      ctx.fillStyle = "#542c5e";
      lines.forEach((line, y) => [...line].forEach((v, x) => { if (v === "1") ctx.fillRect(x + 5, y + 4, 1, 1); }));
      ctx.fillStyle = "#f9db9d"; ctx.fillRect(14, 7, 1, 1); ctx.fillRect(17, 7, 1, 1);
      const texture = new T.CanvasTexture(c); texture.magFilter = texture.minFilter = T.NearestFilter; texture.colorSpace = T.SRGBColorSpace;
      this.bat = new T.Sprite(new T.SpriteMaterial({map: texture, transparent: true, depthTest: false})); this.bat.renderOrder = 25;
      g.world.scene.add(this.bat);
    }
    if (this.bat) {
      this.bat.visible = active;
      this.bat.position.set(g.player.x, heightAt(g.player.x, g.player.z) + 1.1, g.player.z);
      this.bat.scale.set(2, 1.2 + Math.sin(g.time * 18) * .1, 1);
    }
  }
}
