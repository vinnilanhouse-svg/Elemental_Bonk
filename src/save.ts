export type Save = {
  version: 1;
  volume: number;
  quality: string;
  shake: boolean;
  reducedEffects: boolean;
  bestTime: number;
  bestKills: number;
  wins: number;
  last: string;
};
const defaults: Save = {
  version: 1,
  volume: 0.25,
  quality: "alta",
  shake: true,
  reducedEffects: false,
  bestTime: 0,
  bestKills: 0,
  wins: 0,
  last: "Nenhuma operação",
};
export function load(): Save {
  try {
    const s = JSON.parse(localStorage.getItem("monstrao") || "null");
    if (!s || s.version !== 1) return { ...defaults };
    return {
      version: 1,
      volume: Number.isFinite(s.volume)
        ? Math.max(0, Math.min(1, s.volume))
        : defaults.volume,
      quality: ["alta", "baixa"].includes(s.quality) ? s.quality : "alta",
      shake: typeof s.shake === "boolean" ? s.shake : true,
      reducedEffects:
        typeof s.reducedEffects === "boolean" ? s.reducedEffects : false,
      bestTime: Number.isFinite(s.bestTime) ? Math.max(0, s.bestTime) : 0,
      bestKills: Number.isFinite(s.bestKills)
        ? Math.max(0, Math.floor(s.bestKills))
        : 0,
      wins: Number.isFinite(s.wins) ? Math.max(0, Math.floor(s.wins)) : 0,
      last: typeof s.last === "string" ? s.last : defaults.last,
    };
  } catch {
    return { ...defaults };
  }
}
export function store(save: Save) {
  try {
    localStorage.setItem("monstrao", JSON.stringify(save));
  } catch {
    /* private browsing may disallow storage */
  }
}
