import { CFG, LOOT, SKILLS, type Skill } from "./config";
import type { Player } from "./logic";

type Stat =
  | "hp"
  | "damage"
  | "attack"
  | "speed"
  | "collect"
  | "cooldown"
  | "essence"
  | "regen"
  | "armor"
  | "recovery"
  | "xp"
  | "range";
type Reward = {
  id: string;
  title: string;
  max: number;
  stat?: Stat;
  amount: number;
  skill?: Skill;
  fallback?: boolean;
};
export const REWARDS: Reward[] = [
  { id: "hp", title: "Colete reforçado", max: 5, stat: "hp", amount: 25 },
  {
    id: "damage",
    title: "Amolador de garras",
    max: 6,
    stat: "damage",
    amount: CFG.damage * 0.2,
  },
  {
    id: "attack",
    title: "Luvas do predador",
    max: 5,
    stat: "attack",
    amount: 0.12,
  },
  {
    id: "speed",
    title: "Botas de patrulha",
    max: 4,
    stat: "speed",
    amount: CFG.speed * 0.08,
  },
  {
    id: "collect",
    title: "Ímã de fragmentos",
    max: 4,
    stat: "collect",
    amount: CFG.collect * 0.35,
  },
  {
    id: "cooldown",
    title: "Cronômetro tático",
    max: 4,
    stat: "cooldown",
    amount: 0.11,
  },
  {
    id: "essence",
    title: "Frasco ancestral",
    max: 5,
    stat: "essence",
    amount: 20,
  },
  {
    id: "regen",
    title: "Catalisador de Essência",
    max: 4,
    stat: "regen",
    amount: 0.8,
  },
  {
    id: "armor",
    title: "Placas de contenção",
    max: 5,
    stat: "armor",
    amount: 0.04,
  },
  {
    id: "recovery",
    title: "Kit regenerativo",
    max: 5,
    stat: "recovery",
    amount: 0.3,
  },
  { id: "xp", title: "Caderno de campo", max: 5, stat: "xp", amount: 0.12 },
  {
    id: "range",
    title: "Talas de alcance",
    max: 4,
    stat: "range",
    amount: 0.25,
  },
  { id: "sopro", title: "Sopro de Repulsão", max: 5, skill: "q", amount: 0.2 },
  { id: "faro", title: "Faro", max: 5, skill: "e", amount: 0.2 },
  { id: "furia", title: "Fúria", max: 5, skill: "r", amount: 0.2 },
  { id: "esquiva", title: "Esquiva", max: 5, skill: " ", amount: 0.2 },
  // Once the catalog is exhausted, every level still offers three effective rewards.
  {
    id: "veteran-hp",
    title: "Reserva vital",
    max: Infinity,
    stat: "hp",
    amount: 5,
    fallback: true,
  },
  {
    id: "veteran-damage",
    title: "Instinto veterano",
    max: Infinity,
    stat: "damage",
    amount: 1,
    fallback: true,
  },
  {
    id: "veteran-essence",
    title: "Reserva espiritual",
    max: Infinity,
    stat: "essence",
    amount: 5,
    fallback: true,
  },
];
export type UpgradeChoice = Reward & {
  rarity: (typeof LOOT.rarities)[number];
  quality: (typeof LOOT.qualities)[number];
  value: number;
  text: string;
  kind: "item" | "skill";
  unlock: boolean;
};
const round = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => Number(n.toFixed(2)).toLocaleString("pt-BR");
function weighted<T extends { weight: number }>(
  entries: readonly T[],
  rng: () => number,
): T {
  let n = rng() * entries.reduce((sum, e) => sum + e.weight, 0);
  for (const e of entries) {
    n -= e.weight;
    if (n < 0) return e;
  }
  return entries[entries.length - 1];
}
export function validRewards(levels: Record<string, number>, p: Player) {
  const hasInstinct = Object.values(p.skills).some((rank) => rank > 0);
  const rewards = REWARDS.filter(
    (r) =>
      !r.fallback &&
      (hasInstinct ||
        !["cooldown", "essence", "regen"].includes(r.stat || "")) &&
      (levels[r.id] || 0) < r.max &&
      !(r.stat === "armor" && p.armor >= 0.6),
  );
  return rewards.length >= 3
    ? rewards
    : [...rewards, ...REWARDS.filter((r) => r.fallback)];
}
export function makeChoice(
  reward: Reward,
  p: Player,
  rng: () => number = Math.random,
): UpgradeChoice {
  const rarity = weighted(LOOT.rarities, rng),
    quality = weighted(LOOT.qualities, rng);
  const unlock = reward.skill !== undefined && p.skills[reward.skill] === 0;
  let value = round(reward.amount * rarity.multiplier * quality.multiplier);
  if (reward.stat === "hp" || reward.stat === "essence")
    value = Math.round(value);
  if (reward.stat === "armor") value = round(Math.min(value, 0.6 - p.armor));
  let text = "";
  switch (reward.stat) {
    case "hp":
      text = `+${fmt(value)} de vida máxima; recupera ${fmt(value)} de vida.`;
      break;
    case "damage":
      text = `+${fmt(value)} de dano em cada golpe de garras.`;
      break;
    case "attack":
      text = `+${fmt(value * 100)}% de velocidade de ataque.`;
      break;
    case "speed":
      text = `+${fmt(value)} m/s de movimento.`;
      break;
    case "collect":
      text = `+${fmt(value)} m no raio de coleta de XP.`;
      break;
    case "cooldown":
      text = `Recargas das habilidades ${fmt((1 - 1 / (1 + value)) * 100)}% menores.`;
      break;
    case "essence":
      text = `+${fmt(value)} de Essência máxima e recuperação.`;
      break;
    case "regen":
      text = `+${fmt(value)} de Essência regenerada por segundo.`;
      break;
    case "armor":
      text = `+${fmt(value * 100)} pontos percentuais de proteção contra dano.`;
      break;
    case "recovery":
      text = `Regenera +${fmt(value)} de vida por segundo.`;
      break;
    case "xp":
      text = `+${fmt(value * 100)}% de XP recebido ao coletar fragmentos.`;
      break;
    case "range":
      text = `+${fmt(value)} m de alcance das garras automáticas.`;
      break;
  }
  if (reward.skill) {
    const key = reward.skill;
    const effects: Record<Skill, string> = {
      q: "dano, alcance e empurrão do cone",
      e: "dano do pulso, duração e coleta durante o faro",
      r: "dano do uivo, bônus de combate e duração da fúria",
      " ": "dano do contra-ataque, distância e invulnerabilidade da esquiva",
    };
    text = `${unlock ? "Desbloqueia" : "Aprimora"} ${SKILLS[key].name} automático. +${fmt(value * 100)}% à potência: ${effects[key]}.`;
  }
  return {
    ...reward,
    rarity,
    quality,
    value,
    text,
    kind: reward.skill ? "skill" : "item",
    unlock,
  };
}
export function rollChoices(
  levels: Record<string, number>,
  p: Player,
  rng: () => number = Math.random,
): UpgradeChoice[] {
  const pool = validRewards(levels, p),
    out: UpgradeChoice[] = [];
  for (let i = 0; i < 3; i++) {
    const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
    out.push(makeChoice(pool.splice(index, 1)[0], p, rng));
  }
  return out;
}
export function applyChoice(p: Player, c: UpgradeChoice) {
  const v = c.value;
  if (c.skill) {
    p.skills[c.skill]++;
    p.skillPower[c.skill] = round(p.skillPower[c.skill] + v);
    return;
  }
  switch (c.stat) {
    case "hp":
      p.maxHp += v;
      p.hp = Math.min(p.maxHp, p.hp + v);
      break;
    case "damage":
      p.damage = round(p.damage + v);
      break;
    case "attack":
      p.attack = round(p.attack + v);
      break;
    case "speed":
      p.speed = round(p.speed + v);
      break;
    case "collect":
      p.collect = round(p.collect + v);
      break;
    case "cooldown":
      p.cooldown /= 1 + v;
      break;
    case "essence":
      p.maxEssence += v;
      p.essence = Math.min(p.maxEssence, p.essence + v);
      break;
    case "regen":
      p.essenceRegen = round(p.essenceRegen + v);
      break;
    case "armor":
      p.armor = Math.min(0.6, round(p.armor + v));
      break;
    case "recovery":
      p.recovery = round(p.recovery + v);
      break;
    case "xp":
      p.xpBonus = round(p.xpBonus + v);
      break;
    case "range":
      p.range = round(p.range + v);
      break;
  }
}
export const pickupRadius = (p: Player, scentActive: boolean) =>
  p.collect * (scentActive ? 1.5 * (1 + p.skillPower.e) : 1);
