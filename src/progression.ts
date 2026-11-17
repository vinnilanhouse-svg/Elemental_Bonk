import { skillFor, type Species } from "./species";
import { CFG, LOOT, type Skill } from "./config";
import { evasionChance, scaleResistance } from "./skills";
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
  species?: Species;
};
export const REWARDS: Reward[] = [
  { id: "hp", title: "Colete reforçado", max: 5, stat: "hp", amount: 25 },
  {
    id: "damage",
    title: "Talismã de combate",
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
  {
    species: "wolf",
    id: "sopro",
    title: "Sopro de Repulsão",
    max: 5,
    skill: "q",
    amount: 0.2,
  },
  {
    species: "wolf",
    id: "faro",
    title: "Faro",
    max: 5,
    skill: "e",
    amount: 0.2,
  },
  {
    species: "wolf",
    id: "furia",
    title: "Fúria",
    max: 5,
    skill: "r",
    amount: 0.2,
  },
  {
    species: "wolf",
    id: "esquiva",
    title: "Esquiva",
    max: 5,
    skill: " ",
    amount: 0.2,
  },
  {
    species: "gorgon",
    id: "gorgon-poison",
    title: "Dia do Cabelo Maluco",
    max: 5,
    skill: "q",
    amount: 0.2,
  },
  {
    species: "gorgon",
    id: "gorgon-gaze",
    title: "Penteado Diferenciado",
    max: 5,
    skill: "e",
    amount: 0.2,
  },
  {
    species: "gorgon",
    id: "gorgon-medusa",
    title: "A Medusa",
    max: 5,
    skill: "r",
    amount: 0.2,
  },
  {
    species: "gorgon",
    id: "gorgon-skin",
    title: "É Tipo Trocar de Roupa",
    max: 5,
    skill: "defense",
    amount: 0.2,
  },
  {
    species: "gorgon",
    id: "gorgon-scales",
    title: "Ssssssscamas",
    max: 5,
    skill: " ",
    amount: 0.2,
  },
  {
    species: "saci",
    id: "saci-wind",
    title: "Travessura do Vento",
    max: 5,
    skill: "q",
    amount: 0.2,
  },
  {
    species: "saci",
    id: "saci-blink",
    title: "Sumiço Rápido",
    max: 5,
    skill: "e",
    amount: 0.2,
  },
  {
    species: "saci",
    id: "saci-tornado",
    title: "Dia do Saci",
    max: 5,
    skill: "r",
    amount: 0.2,
  },
  {
    species: "saci",
    id: "saci-escape",
    title: "Me Pegue se Puder",
    max: 5,
    skill: " ",
    amount: 0.2,
  },
  {
    species: "saci",
    id: "saci-trap",
    title: "Armadilha Natural",
    max: 5,
    skill: "trap",
    amount: 0.2,
  },
  {
    species: "saci",
    id: "saci-mobility",
    title: "Viva o SUS",
    max: 5,
    skill: "mobility",
    amount: 0.2,
  },
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
function powerCap(p: Player, key: Skill) {
  if (p.species === "gorgon") {
    if (key === "e" || key === "r")
      return (
        Math.floor((4 / skillFor(p, key)!.duration - 1) * 100 + 1e-6) / 100
      );
    if (key === "defense") return 2;
  }
  if (p.species === "saci" && key === "trap") return 0.66;
  return Infinity;
}
export function validRewards(levels: Record<string, number>, p: Player) {
  const hasInstinct = Object.entries(p.skills).some(
    ([k, v]) => k !== " " && v > 0,
  );
  const rewards = REWARDS.filter(
    (r) =>
      !r.fallback &&
      (!r.species || r.species === p.species) &&
      (hasInstinct ||
        !["cooldown", "essence", "regen"].includes(r.stat || "")) &&
      (levels[r.id] || 0) < r.max &&
      (!r.skill || p.skillPower[r.skill] < powerCap(p, r.skill) - 1e-6) &&
      !(r.stat === "armor" && p.armor >= 0.6) &&
      !(
        r.skill === " " &&
        (p.species === "wolf"
          ? evasionChance(p) >= CFG.evasionCap
          : p.species === "gorgon"
            ? scaleResistance(p) >= 0.55
            : false)
      ),
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
  if (reward.skill)
    value = Math.min(
      value,
      round(powerCap(p, reward.skill) - p.skillPower[reward.skill]),
    );
  if (reward.skill === " " && p.species === "wolf")
    value = round(
      Math.min(
        value,
        (CFG.evasionCap - CFG.evasionBase) / CFG.evasionPerPower -
          p.skillPower[" "],
      ),
    );
  if (reward.skill === " " && p.species === "gorgon")
    value = round(Math.min(value, (0.55 - 0.2) / 0.2 - p.skillPower[" "]));
  if (reward.stat === "hp" || reward.stat === "essence")
    value = Math.round(value);
  if (reward.stat === "armor") value = round(Math.min(value, 0.6 - p.armor));
  let text = "";
  switch (reward.stat) {
    case "hp":
      text = `+${fmt(value)} de vida máxima; recupera ${fmt(value)} de vida.`;
      break;
    case "damage":
      text = `+${fmt(value)} de dano em cada ataque básico.`;
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
      text = `+${fmt(value)} m de alcance do ataque básico automático.`;
      break;
  }
  if (reward.skill) {
    const key = reward.skill;
    const effects: Partial<Record<Skill, string>> = {
      q: "dano, alcance e empurrão do cone",
      e: "dano do pulso, duração e coleta durante o faro",
      r: "dano do uivo, bônus de combate e duração da fúria",
    };
    const def = skillFor(p, key)!;
    text = `${unlock ? "Desbloqueia" : "Aprimora"} ${def.name} automático. ${def.description || effects[key] || ""} ${p.species === "wolf" ? `+${fmt(value * 100)}% à potência.` : ""}`;
    if (p.species !== "wolf") {
      const power = 1 + p.skillPower[key] + value;
      if (def.damage)
        text += ` Dano ${fmt(def.damage * power)}${key === "r" && p.species === "saci" ? "/s" : ""}.`;
      if (key === "q" && p.species === "gorgon")
        text += ` Veneno: ${fmt(8 * power)} de dano/s por ${def.duration}s.`;
      if (["e", "r", "trap", "mobility"].includes(key) && def.duration)
        text += ` Duração ${fmt(def.duration * power)}s${["trap"].includes(key) || p.species === "gorgon" ? " (controle de chefes reduzido)" : ""}.`;
      if (key === "defense")
        text += ` Reduz ${fmt((1 - Math.max(0.15, 0.35 - (p.skillPower.defense + value) * 0.1)) * 100)}% do golpe; recarga ${def.cooldown}s.`;
    }
    if (key === " " && p.species === "wolf") {
      const next = {
        ...p,
        skills: { ...p.skills, " ": p.skills[" "] + 1 },
        skillPower: { ...p.skillPower, " ": p.skillPower[" "] + value },
      };
      text = `${unlock ? "Desbloqueia" : "Aprimora"} esquiva passiva: ${fmt(evasionChance(p) * 100)}% → ${fmt(evasionChance(next) * 100)}% de chance de evitar um golpe. Não move o personagem.`;
    }
  }
  if (reward.skill === " " && p.species === "gorgon")
    text = `Aprimora Ssssssscamas: ${fmt(scaleResistance(p) * 100)}% → ${fmt(Math.min(0.55, 0.2 + (p.skillPower[" "] + value) * 0.2) * 100)}% de redução de corte e perfuração.`;
  if (reward.skill === " " && p.species === "saci")
    text = `Aprimora Me Pegue se Puder: imobilizações expiram ${fmt(2 + p.skillPower[" "] + value)} vezes mais rápido.`;

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
  recentOffers: readonly (readonly string[])[] = [],
): UpgradeChoice[] {
  const pool = validRewards(levels, p),
    out: UpgradeChoice[] = [];
  const last = new Set(recentOffers[recentOffers.length - 1] || []);
  const fresh = pool.filter((r) => !last.has(r.id));
  for (let i = 0; i < 3; i++) {
    let candidates =
      i < 2 && fresh.length >= 2 ? pool.filter((r) => !last.has(r.id)) : pool;
    if (!candidates.length) candidates = pool;
    if (i === 2 && out.every((c) => c.kind === out[0].kind)) {
      const opposite = candidates.filter(
        (r) => Boolean(r.skill) !== Boolean(out[0].skill),
      );
      if (opposite.length) candidates = opposite;
    }
    const weights = candidates.map((r) => ({
      reward: r,
      weight:
        1 / (1 + recentOffers.flat().filter((id) => id === r.id).length * 3),
    }));
    const selected = weighted(weights, rng).reward;
    pool.splice(pool.indexOf(selected), 1);
    out.push(makeChoice(selected, p, rng));
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
