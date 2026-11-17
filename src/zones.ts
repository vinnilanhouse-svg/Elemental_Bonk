import type { Point } from "./logic";
export const ZONES = [
  {
    id: 1,
    name: "Mata Viva",
    theme: "Luz dourada",
    color: "#60794c",
    mapColor: "#a4bc74",
    hp: 1,
    damage: 1,
    speed: 1,
    xp: 1,
    anchor: { x: 0, z: 4 },
  },
  {
    id: 2,
    name: "Bosque Bioluminescente",
    theme: "Noite e cogumelos luminosos",
    color: "#2d4556",
    mapColor: "#66c6cf",
    hp: 1.3,
    damage: 1.2,
    speed: 1.04,
    xp: 1.25,
    anchor: { x: -41, z: -35 },
  },
  {
    id: 3,
    name: "Floresta de Outono",
    theme: "Folhas de cobre e ouro",
    color: "#957046",
    mapColor: "#dba164",
    hp: 1.65,
    damage: 1.45,
    speed: 1.08,
    xp: 1.5,
    anchor: { x: 42, z: -34 },
  },
  {
    id: 4,
    name: "Pântano da Névoa",
    theme: "Salgueiros e águas escuras",
    color: "#526d68",
    mapColor: "#82aaa5",
    hp: 2.05,
    damage: 1.75,
    speed: 1.12,
    xp: 1.8,
    anchor: { x: 42, z: 38 },
  },
  {
    id: 5,
    name: "Ruínas Ancestrais",
    theme: "Pedra antiga e corrupção",
    color: "#5d6851",
    mapColor: "#c3a5d3",
    hp: 2.5,
    damage: 2.15,
    speed: 1.16,
    xp: 2.2,
    anchor: { x: -41, z: 40 },
  },
] as const;
export function zoneAt(x: number, z: number) {
  if ((x / 28) ** 2 + ((z - 4) / 34) ** 2 <= 1) return ZONES[0];
  return x < 0 ? (z < 0 ? ZONES[1] : ZONES[4]) : z < 0 ? ZONES[2] : ZONES[3];
}
export function zoneStats(kind: number, p: Point) {
  const zone = zoneAt(p.x, p.z);
  return {
    zoneId: zone.id,
    hp: zone.hp,
    damage: zone.damage,
    speed: zone.speed,
    xp: zone.xp,
  };
}

export function approachingZone(x: number, z: number, heading: Point) {
  const current = zoneAt(x, z);
  for (const ahead of [4, 7, 10]) {
    const next = zoneAt(x + heading.x * ahead, z + heading.z * ahead);
    if (next.id > current.id) return next;
  }
  return null;
}
