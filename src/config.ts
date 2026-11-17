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
  dashInvulnerability: 0.28,
  dashDistance: 3.8,
  enemyInterval: 1.4,
  particles: 90,
};
export const SKILLS = {
  q: { name: "Sopro", cost: 25, cooldown: 9, duration: 0 },
  e: { name: "Faro", cost: 18, cooldown: 14, duration: 6 },
  r: { name: "Fúria", cost: 40, cooldown: 26, duration: 7 },
  " ": { name: "Esquiva", cost: 0, cooldown: 3, duration: 0.28 },
};
export type Skill = keyof typeof SKILLS;
export const UPGRADES = [
  {
    id: "hp",
    title: "Pele de ferro",
    text: "+25 de vida máxima e recuperação",
    max: 5,
  },
  {
    id: "damage",
    title: "Garras afiadas",
    text: "+20% de dano das garras",
    max: 6,
  },
  {
    id: "attack",
    title: "Instinto predador",
    text: "+12% de velocidade de ataque",
    max: 5,
  },
  { id: "speed", title: "Passos da mata", text: "+8% de movimento", max: 4 },
  {
    id: "collect",
    title: "Sentidos aguçados",
    text: "+35% de alcance de coleta",
    max: 4,
  },
  {
    id: "cooldown",
    title: "Fôlego renovado",
    text: "−10% nas recargas",
    max: 4,
  },
  {
    id: "essence",
    title: "Reserva ancestral",
    text: "+20 de Essência máxima",
    max: 5,
  },
  {
    id: "power",
    title: "Vento ancestral",
    text: "+30% de alcance e força do sopro",
    max: 4,
  },
];
