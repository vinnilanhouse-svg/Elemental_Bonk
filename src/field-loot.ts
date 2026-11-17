import {
  canMove,
  distance,
  type Obstacle,
  type Point,
  type Player,
} from "./logic";
import { zoneAt } from "./zones";
import { resourceName } from "./new-species";

export const FIELD_ITEMS = {
  heal: {
    name: "Kit de primeiros socorros",
    color: "#efad94",
    weight: 20,
    icon: "recovery",
  },
  essence: {
    name: "Frasco de Essência",
    color: "#89d4e8",
    weight: 12,
    icon: "essence",
  },
  power: {
    name: "Presa ancestral",
    color: "#f3c576",
    weight: 14,
    icon: "damage",
  },
  haste: {
    name: "Pluma do vento",
    color: "#ade3a0",
    weight: 12,
    icon: "speed",
  },
  ward: {
    name: "Escudo espiritual",
    color: "#91c6ee",
    weight: 12,
    icon: "armor",
  },
  magnet: {
    name: "Pedra magnética",
    color: "#efd88d",
    weight: 12,
    icon: "collect",
  },
  relic: {
    name: "Relíquia instável",
    color: "#d7a9ee",
    weight: 18,
    icon: "furia",
  },
} as const;
export type FieldItemKind = keyof typeof FIELD_ITEMS;
export const FIELD_RULES = {
  perZone: 3,
  maxItems: 20,
  refillSeconds: 30,
  pickupRadius: 1,
  duration: 15,
  minSpacing: 3.5,
};
export const FIELD_BUFFS = {
  power: {
    name: "Poder",
    text: "+30% de dano em ataques e habilidades",
    icon: "damage",
  },
  haste: {
    name: "Agilidade",
    text: "+25% de velocidade de movimento",
    icon: "speed",
  },
  ward: { name: "Proteção", text: "Recebe 30% menos dano", icon: "armor" },
  magnet: {
    name: "Magnetismo",
    text: "+75% no raio de coleta de XP",
    icon: "collect",
  },
} as const;
export type FieldBuff = keyof typeof FIELD_BUFFS;
export type FieldBuffs = Record<FieldBuff, number>;
export const freshFieldBuffs = (): FieldBuffs => ({
  power: 0,
  haste: 0,
  ward: 0,
  magnet: 0,
});
export function tickFieldBuffs(buffs: FieldBuffs, dt: number) {
  for (const key of Object.keys(buffs) as FieldBuff[])
    buffs[key] = Math.max(0, buffs[key] - dt);
}
export const fieldDamageMultiplier = (b: FieldBuffs) => (b.power > 0 ? 1.3 : 1);
export const fieldSpeedMultiplier = (b: FieldBuffs) => (b.haste > 0 ? 1.25 : 1);
export const fieldProtectionMultiplier = (b: FieldBuffs) =>
  b.ward > 0 ? 0.7 : 1;
export const fieldMagnetMultiplier = (b: FieldBuffs) =>
  b.magnet > 0 ? 1.75 : 1;
export type FieldEvent = "ambush" | "cache" | "blessing" | "calm";
export type FieldNotice = {
  title: string;
  text: string;
  tone: "good" | "danger" | "mystery";
};
export type FieldResult = FieldNotice & { event?: FieldEvent };
function weighted<T>(
  entries: readonly { value: T; weight: number }[],
  rng: () => number,
) {
  let roll = rng() * entries.reduce((n, e) => n + e.weight, 0);
  for (const e of entries) {
    roll -= e.weight;
    if (roll < 0) return e.value;
  }
  return entries[entries.length - 1].value;
}
export const rollFieldSupply = (
  rng: () => number = Math.random,
): FieldItemKind =>
  weighted(
    (Object.keys(FIELD_ITEMS) as FieldItemKind[])
      .filter((k) => k !== "relic")
      .map((k) => ({ value: k, weight: FIELD_ITEMS[k].weight })),
    rng,
  );
export const rollFieldItem = (rng: () => number = Math.random): FieldItemKind =>
  weighted(
    (Object.keys(FIELD_ITEMS) as FieldItemKind[]).map((value) => ({
      value,
      weight: FIELD_ITEMS[value].weight,
    })),
    rng,
  );
export const rollFieldEvent = (rng: () => number = Math.random): FieldEvent =>
  weighted(
    [
      { value: "ambush", weight: 35 },
      { value: "cache", weight: 30 },
      { value: "blessing", weight: 20 },
      { value: "calm", weight: 15 },
    ],
    rng,
  );
// Temporary multipliers remain separate from permanent level rewards. Recollection refreshes the timer.
export function applyFieldItem(
  p: Player,
  buffs: FieldBuffs,
  kind: FieldItemKind,
  rng: () => number = Math.random,
): FieldResult | null {
  if (kind === "heal") {
    if (p.maxHp - p.hp < 0.5) return null;
    const gain = Math.min(p.maxHp - p.hp, Math.ceil(p.maxHp * 0.3));
    p.hp += gain;
    return {
      title: "Suprimento médico",
      text: `+${Number(gain.toFixed(1))} de vida`,
      tone: "good",
    };
  }
  if (kind === "essence") {
    if (p.maxEssence - p.essence < 0.5) return null;
    const gain = Math.min(
      p.maxEssence - p.essence,
      Math.ceil(p.maxEssence * 0.4),
    );
    p.essence += gain;
    return {
      title: `${resourceName(p.species)} recuperada`,
      text: `+${Number(gain.toFixed(1))} de ${resourceName(p.species)}`,
      tone: "good",
    };
  }
  if (kind !== "relic") {
    buffs[kind] = Math.max(buffs[kind], FIELD_RULES.duration);
    return {
      title: FIELD_ITEMS[kind].name,
      text: `${FIELD_BUFFS[kind].text} · ${FIELD_RULES.duration}s`,
      tone: "good",
    };
  }
  const event = rollFieldEvent(rng);
  if (event === "blessing") {
    p.hp = Math.min(p.maxHp, p.hp + Math.ceil(p.maxHp * 0.3));
    p.essence = Math.min(
      p.maxEssence,
      p.essence + Math.ceil(p.maxEssence * 0.4),
    );
    buffs.ward = Math.max(buffs.ward, FIELD_RULES.duration);
  }
  const notices: Record<FieldEvent, FieldNotice> = {
    ambush: {
      title: "Emboscada!",
      text: "A relíquia atraiu criaturas para perto de você.",
      tone: "danger",
    },
    cache: {
      title: "Chuva de fragmentos",
      text: "A relíquia revelou uma reserva de XP. Aproxime-se para coletar.",
      tone: "good",
    },
    blessing: {
      title: "Bênção da mata",
      text: `Vida e ${resourceName(p.species)} restauradas parcialmente. Proteção por 15s.`,
      tone: "good",
    },
    calm: {
      title: "Calmaria sobrenatural",
      text: "Criaturas próximas desaceleradas e ataques interrompidos por 5s.",
      tone: "good",
    },
  };
  return { ...notices[event], event };
}
// Flood fill includes the bridge and rejects disconnected pockets, so every seeded item is reachable.
export function reachableLootSpots(
  obstacles: Obstacle[],
  start: Point = { x: 0, z: 4 },
) {
  const queue: Point[] = [{ x: Math.round(start.x), z: Math.round(start.z) }],
    seen = new Set<string>([`${queue[0].x},${queue[0].z}`]),
    spots: Point[] = [];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (canMove(p, obstacles, 0.85)) spots.push(p);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const q = { x: p.x + dx, z: p.z + dz },
        key = `${q.x},${q.z}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (
        canMove(q, obstacles, 0.55) &&
        canMove({ x: p.x + dx * 0.5, z: p.z + dz * 0.5 }, obstacles, 0.55)
      )
        queue.push(q);
    }
  }
  return spots;
}
export function pickLootSpot(
  zoneId: number,
  spots: readonly Point[],
  existing: readonly Point[],
  player: Point,
  rng: () => number = Math.random,
): Point | undefined {
  const candidates = spots.filter(
    (p) =>
      zoneAt(p.x, p.z).id === zoneId &&
      distance(p, player) >= 4.5 &&
      existing.every((q) => distance(p, q) >= FIELD_RULES.minSpacing),
  );
  if (!candidates.length) return;
  return {
    ...candidates[
      Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))
    ],
  };
}
export function ambushSpots(
  player: Point,
  obstacles: Obstacle[],
  count: number,
  rng: () => number = Math.random,
) {
  const out: Point[] = [];
  for (let n = 0; n < 120 && out.length < count; n++) {
    const angle = rng() * Math.PI * 2,
      radius = 7 + rng() * 4,
      q = {
        x: player.x + Math.cos(angle) * radius,
        z: player.z + Math.sin(angle) * radius,
      };
    if (canMove(q, obstacles, 0.9) && out.every((p) => distance(p, q) > 1.4))
      out.push(q);
  }
  return out;
}
