import * as T from "three";
import frames from "./agent-frames.json";
import { CHARACTERS, type Species } from "./species";
export type AgentFrame = { rect: number[]; pivot: number[]; duration: number };
export type AgentAsset = {
  texture: T.Texture;
  size: number[];
  frames: AgentFrame[];
  referenceHeight: number;
  height: number;
};
export const AGENT_META = {
  wolf: {
    url: "/wolf-atlas.png",
    ...frames.wolf,
    height: 2.3,
  },
  gorgon: { ...frames.gorgon, url: "/agents/gorgon.png", height: 1.85 },
  saci: { ...frames.saci, url: "/agents/saci.png", height: 1.85 },
  curupira: { ...frames.curupira, url: "/agents/curupira.png", height: 2.25 },
  vampire: { ...frames.vampire, url: "/agents/vampire.png", height: 2.05 },
  mummy: { ...frames.mummy, url: "/agents/mummy.png", height: 2.05 },
  construct: { ...frames.construct, url: "/agents/construct.png", height: 2.3 },
  fairy: { ...frames.fairy, url: "/agents/fairy.png", height: 1.55 },
};
export async function loadAgentAssets(
  progress: () => void = () => {},
): Promise<Record<Species, AgentAsset>> {
  const entries = await Promise.all(
    (Object.keys(AGENT_META) as Species[]).map(async (key) => {
      const m = AGENT_META[key],
        texture = await new T.TextureLoader().loadAsync(m.url);
      texture.colorSpace = T.SRGBColorSpace;
      texture.magFilter = T.NearestFilter;
      texture.minFilter = T.NearestFilter;
      texture.generateMipmaps = false;
      progress();
      return [key, { ...m, texture }] as const;
    }),
  );
  return Object.fromEntries(entries) as unknown as Record<Species, AgentAsset>;
}
export function portraitMarkup(species: Species, height: number) {
  if (species === "wolf")
    return `<img src="/wolf-portrait.png" alt="Lobisomem">`;
  const m = AGENT_META[species],
    f = m.frames[0],
    [x, y, w, h] = f.rect,
    s = height / h;
  return `<span class="atlas-portrait" role="img" aria-label="${CHARACTERS[species].name}" style="width:${w * s}px;height:${height}px;background-image:url('${m.url}');background-size:${m.size[0] * s}px ${m.size[1] * s}px;background-position:${-x * s}px ${-y * s}px"></span>`;
}
