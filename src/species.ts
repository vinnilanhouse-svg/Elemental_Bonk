import { SKILLS, type Skill } from "./config";
export type Species = "wolf" | "gorgon" | "saci";
export type DamageType = "slashing" | "piercing" | "blunt" | "arcane";
export type SkillDef = {
  name: string;
  cost: number;
  cooldown: number;
  duration: number;
  damage: number;
  range: number;
  description?: string;
};
export const CHARACTERS = {
  wolf: {
    name: "Lobisomem",
    tag: "LICANTROPO",
    basic: "Garras",
    basicIcon: "damage",
    hp: 120,
    speed: 5,
    damage: 22,
    range: 2.5,
    interval: 0.7,
    description: "Força ancestral. Instinto de proteção.",
    passive: "Esquiva pode ser aprendida durante a missão.",
  },
  gorgon: {
    name: "Górgona",
    tag: "GÓRGONA",
    basic: "Bote das Serpentes",
    basicIcon: "serpents",
    hp: 110,
    speed: 4.5,
    damage: 18,
    range: 2.8,
    interval: 0.8,
    description: "Veneno, defesa e petrificação.",
    passive: "Ssssssscamas: 20% de proteção contra corte e perfuração.",
  },
  saci: {
    name: "Saci",
    tag: "SACI",
    basic: "Rajada Travessa",
    basicIcon: "sopro",
    hp: 95,
    speed: 5.6,
    damage: 16,
    range: 7,
    interval: 0.8,
    description: "Vento, mobilidade e controle da mata.",
    passive:
      "Me Pegue se Puder: escapa duas vezes mais rápido de imobilizações.",
  },
} as const;
export const SPECIES_SKILLS: Record<
  Species,
  Partial<Record<Skill, SkillDef>>
> = {
  wolf: SKILLS,
  gorgon: {
    q: {
      name: "Dia do Cabelo Maluco",
      cost: 20,
      cooldown: 7,
      duration: 5,
      damage: 20,
      range: 3.2,
      description: "Mordida próxima; aplica veneno por 5 segundos.",
    },
    e: {
      name: "Penteado Diferenciado",
      cost: 30,
      cooldown: 12,
      duration: 2.5,
      damage: 0,
      range: 7,
      description:
        "O agente parado canaliza o olhar sobre um alvo por 1,2 s e o petrifica. Movimento ou dano interrompem.",
    },
    r: {
      name: "A Medusa",
      cost: 40,
      cooldown: 24,
      duration: 3,
      damage: 0,
      range: 5,
      description:
        "Petrifica inimigos próximos; chefes sofrem lentidão intensa por menos tempo.",
    },
    defense: {
      name: "É Tipo Trocar de Roupa",
      cost: 0,
      cooldown: 30,
      duration: 0,
      damage: 0,
      range: 0,
      description:
        "Reduz um golpe forte e deixa uma pele vazia. Defesa automática.",
    },
    " ": {
      name: "Ssssssscamas",
      cost: 0,
      cooldown: 0,
      duration: 0,
      damage: 0,
      range: 0,
      description: "Defesa passiva contra corte e perfuração.",
    },
  },
  saci: {
    q: {
      name: "Travessura do Vento",
      cost: 22,
      cooldown: 8,
      duration: 2,
      damage: 24,
      range: 6,
      description: "Cone que empurra e interrompe ataques.",
    },
    e: {
      name: "Sumiço Rápido",
      cost: 16,
      cooldown: 10,
      duration: 0.35,
      damage: 0,
      range: 5,
      description:
        "Teleporte curto na direção de movimento, respeitando obstáculos.",
    },
    r: {
      name: "Dia do Saci",
      cost: 32,
      cooldown: 18,
      duration: 4,
      damage: 12,
      range: 5,
      description:
        "Tornado persistente com dano por segundo, atração e desorientação.",
    },
    " ": {
      name: "Me Pegue se Puder",
      cost: 0,
      cooldown: 0,
      duration: 0,
      damage: 0,
      range: 0,
      description: "Escapa mais rápido de imobilizações.",
    },
    trap: {
      name: "Armadilha Natural",
      cost: 14,
      cooldown: 11,
      duration: 3,
      damage: 0,
      range: 7,
      description: "Deixa uma armadilha que prende o primeiro inimigo.",
    },
    mobility: {
      name: "Viva o SUS",
      cost: 18,
      cooldown: 18,
      duration: 5,
      damage: 0,
      range: 8,
      description: "Velocidade temporária e imunidade ao terreno difícil.",
    },
  },
};
export function skillFor(player: { species: Species }, key: Skill) {
  return SPECIES_SKILLS[player.species][key];
}
