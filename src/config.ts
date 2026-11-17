export const CFG = {
  duration: 480,
  maxEnemies: 48,
  speed: 5,
  hp: 120,
  essence: 100,
  regen: 6,
  damage: 22,
  attackInterval: 0.7,
  range: 2.5,
  collect: 2.8,
  invulnerability: 0.65,
  evasionBase: 0.08,
  evasionPerPower: 0.2,
  evasionCap: 0.5,
  enemyInterval: 1.4,
  particles: 90,
};
export const SKILLS = {
  q: {
    name: "Sopro",
    cost: 25,
    cooldown: 9,
    duration: 0,
    damage: 28,
    range: 6,
  },
  e: {
    name: "Faro",
    cost: 18,
    cooldown: 14,
    duration: 6,
    damage: 12,
    range: 7,
  },
  r: {
    name: "Fúria",
    cost: 40,
    cooldown: 26,
    duration: 7,
    damage: 40,
    range: 4,
  },
  " ": {
    name: "Esquiva",
    cost: 0,
    cooldown: 0,
    duration: 0,
    damage: 0,
    range: 0,
  },
};
export const SKILL_KEYS = ["q", "e", "r", " ", "trap", "mobility", "defense", "mist", "borrow"] as const;
export type Skill = typeof SKILL_KEYS[number];
export const skillRecord = (value = 0) => Object.fromEntries(SKILL_KEYS.map(k => [k, value])) as Record<Skill, number>;
// XP carried by one fragment per defeated creature, independent of wave time.
export const ENEMY_XP = [5, 8, 16, 100] as const;
export const LOOT = {
  rarities: [
    { id: "common", name: "Comum", weight: 55, multiplier: 1 },
    { id: "uncommon", name: "Incomum", weight: 27, multiplier: 1.25 },
    { id: "rare", name: "Raro", weight: 12, multiplier: 1.6 },
    { id: "epic", name: "Épico", weight: 5, multiplier: 2 },
    { id: "legendary", name: "Lendário", weight: 1, multiplier: 2.6 },
  ],
  qualities: [
    { id: "standard", name: "Padrão", weight: 65, multiplier: 1 },
    { id: "superior", name: "Superior", weight: 28, multiplier: 1.15 },
    { id: "masterwork", name: "Obra-prima", weight: 7, multiplier: 1.35 },
  ],
};

export const ENEMY_BALANCE = {
  hp: [38, 25, 100, 2100],
  windup: [0.24, 0.36, 0.8, 1.3],
  interval: [1.4, 2.2, 2.5, 4],
  spawnNear: 13,
  spawnFar: 19,
  hpRampDuration: 800,
  projectileSpeed: 5,
  speed: [2.1, 1.55, 1.2, 0.8],
  meleeDamage: [10, 0, 25, 35],
  projectileDamage: [0, 12, 0, 18],
  spawnStart: 2.5,
  spawnMin: 0.4,
  spawnAcceleration: 210,
  maxProjectiles: 100,
  rootDuration: 1.6,
  rootImmunity: 3,
} as const;
