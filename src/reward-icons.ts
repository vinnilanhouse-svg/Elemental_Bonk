const paths: Record<string, string> = {
  fire: '<path d="M12 2c3 5 8 8 8 13a8 8 0 0 1-16 0c0-4 2-7 5-10v7c3-1 4-4 3-10Z"/>',
  blood: '<path d="M12 2S4 11 4 16a8 8 0 0 0 16 0c0-5-8-14-8-14Z"/><path d="M8 16c0 3 2 4 4 4"/>',
  bandage: '<path d="m3 8 5-5 13 13-5 5Zm2 2 5-5m-2 8 5-5m-2 8 5-5m-2 8 5-5"/>',
  module: '<path d="M5 5h14v14H5ZM9 9h6v6H9ZM8 1v4m8-4v4M8 19v4m8-4v4M1 8h4m-4 8h4m14-8h4m-4 8h4"/>',
  element: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  bat: '<path d="m2 5 7 5 1-6 2 3 2-3 1 6 7-5-2 12-5-2-3 6-3-6-5 2Z"/>',
  mist: '<path d="M3 7h18M5 12h14M2 17h20M9 3h6m-8 18h10"/>',
  serpents:
    '<path d="M4 18c-3-7 8-3 5-10S17 1 18 6s-6 4-5 8 7 7 8 1M6 18h12M15 5h.1M19 5l3-1"/>',
  stone:
    '<path d="m8 2 8 1 5 7-3 11H5L2 12Zm0 0 3 10-6 9m6-9 10-2m-10 2 7 9"/>',
  trap: '<path d="m3 5 5 4 4-6 4 6 5-4v13H3ZM3 18l5-5 4 5 4-5 5 5"/>',
  hp: '<path d="m8 3-4 4v13h16V7l-4-4-4 4Z"/><path d="M9 4v8H5m10-8v8h4M8 16h8"/>',
  damage: '<path d="M7 3 3 20M14 3 9 20M21 3l-6 17"/>',
  attack:
    '<path d="M8 12V5a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v9c0 4-2 6-6 6h-2c-2 0-4-1-5-3l-3-5a2 2 0 0 1 3-2l3 3"/>',
  speed:
    '<path d="M8 3h8v10l5 3v5H3v-5l5-2Z"/><path d="M9 7h7M9 10h7M4 18h16"/>',
  collect:
    '<path d="M5 3v9a7 7 0 0 0 14 0V3h-5v9a2 2 0 0 1-4 0V3Z"/><path d="M5 7h5m4 0h5"/>',
  cooldown:
    '<circle cx="12" cy="13" r="8"/><path d="M12 9v5l3 2M9 2h6m-3 0v3m6 2 2-2"/>',
  essence:
    '<path d="M9 2h6m-5 0v7L4 19c-1 2 1 3 2 3h12c2 0 3-1 2-3L14 9V2M7 15h10"/>',
  regen:
    '<path d="M12 2c2 5 7 7 7 13a7 7 0 0 1-14 0c0-4 3-7 4-9 0 4 2 5 3 5 2-2 1-5 0-9Z"/><path d="M12 14v5m-2-2h4"/>',
  armor:
    '<path d="m12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6Z"/><path d="m7 12 3 3 7-7"/>',
  recovery: '<path d="M4 7h16v14H4ZM9 7V3h6v4m-3 4v6m-3-3h6"/>',
  xp: '<path d="M3 4h6c2 0 3 1 3 3 0-2 1-3 3-3h6v15h-6c-2 0-3 1-3 2 0-1-1-2-3-2H3Zm9 3v14M6 8h3m-3 4h3m6-4h3m-3 4h3"/>',
  range:
    '<circle cx="12" cy="12" r="5"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5M9 4l3-2 3 2m-6 16 3 2 3-2M4 9l-2 3 2 3m16-6 2 3-2 3"/>',
  sopro:
    '<path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h5a3 3 0 1 1-3 3"/>',
  faro: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  furia:
    '<path d="M16 2A10 10 0 1 0 22 15 9 9 0 0 1 16 2Z"/><path d="m7 12 2 2 2-2m-3 5 2 1"/>',
  esquiva:
    '<path d="m12 2 8 4v6c0 4-4 8-8 10-4-2-8-6-8-10V6Z"/><path d="m9 8 6 4-6 4m-8-6h3m-3 4h3"/>',
};
export function rewardIcon(id: string) {
  const alias: Record<string, string> = {
    "curupira-q": "fire", "curupira-e": "attack", "curupira-trap": "fire", "curupira-r": "xp", "curupira- ": "xp",
    "vampire-q": "blood", "vampire-e": "faro", "vampire-mobility": "bat", "vampire-trap": "range", "vampire-mist": "mist", "vampire-borrow": "armor", "vampire-r": "blood", "vampire- ": "furia",
    "mummy-q": "bandage", "mummy-e": "serpents", "mummy-mobility": "esquiva", "mummy-r": "stone", "mummy- ": "xp",
    "construct-q": "module", "construct-e": "armor", "construct-defense": "recovery", "construct-mobility": "element", "construct-r": "fire", "construct- ": "module",
    "fairy-q": "element", "fairy-e": "sopro", "fairy-defense": "regen", "fairy-r": "element", "fairy- ": "armor",
    "gorgon-poison": "serpents",
    "gorgon-gaze": "faro",
    "gorgon-medusa": "stone",
    "gorgon-skin": "armor",
    "gorgon-scales": "armor",
    "saci-wind": "sopro",
    "saci-blink": "esquiva",
    "saci-tornado": "sopro",
    "saci-escape": "speed",
    "saci-trap": "trap",
    "saci-mobility": "recovery",
    "veteran-hp": "hp",
    "veteran-damage": "damage",
    "veteran-essence": "essence",
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[alias[id] || id] || paths.armor}</svg>`;
}
