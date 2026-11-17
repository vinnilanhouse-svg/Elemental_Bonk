import * as T from "three";
import {
  distance,
  heightAt,
  type Point,
  type Obstacle,
  type Player,
} from "./logic";
import { ZONES, zoneAt } from "./zones";
import {
  FIELD_ITEMS,
  FIELD_RULES,
  rollFieldItem,
  rollFieldSupply,
  reachableLootSpots,
  pickLootSpot,
  freshFieldBuffs,
  tickFieldBuffs,
  type FieldItemKind,
  type FieldNotice,
} from "./field-loot";

// Small original pixel sprites, drawn at native 24px without filtering or external requests.
const silhouettes: Record<FieldItemKind, string[]> = {
  heal: [
    "  oooooooooo  ",
    " ooRRRRRRRRoo ",
    "ooRRRRwwRRRRoo",
    "oRRRRRwwRRRRRo",
    "oRRRwwwwwwRRRo",
    "oRRRwwwwwwRRRo",
    "oRRRRRwwRRRRRo",
    "oRRRRRwwRRRRRo",
    "oRRRRRRRRRRRRo",
    " oooooooooooo ",
  ],
  essence: [
    "    ooooo    ",
    "    ottto    ",
    "   ooooooo   ",
    "   obbbbbo   ",
    "  obwwbbbbo  ",
    " obwwbbbbbbo ",
    " obbbbbbbbbo ",
    " obbbbBbbbbo ",
    " obbBBBBBbbo ",
    "  ooooooooo  ",
  ],
  power: [
    "    ooo    ",
    "   owwwo   ",
    "  owwwwwo  ",
    " owwwYwwwo ",
    " owwYYwwwo ",
    "  owYYwwo  ",
    "  owYYwo   ",
    "   oYwo    ",
    "   oYo     ",
    "    o      ",
  ],
  haste: [
    "       ooo  ",
    "     oggggo ",
    "    ogwgggo ",
    "   ogwgggo  ",
    "  ogwgggo   ",
    " ogwgggo    ",
    " oggggo     ",
    "  oggo      ",
    "  ogo       ",
    "  oo        ",
  ],
  ward: [
    " ooooooooooo ",
    " oYYYBBBYYYo ",
    " oYBBwwwBBYo ",
    " oYBBwBwBBYo ",
    " oYBBwwwBBYo ",
    "  oYBBBBBYo  ",
    "  oYYBBBYYo  ",
    "   oYYBYYo   ",
    "    oYYYo    ",
    "     ooo     ",
  ],
  magnet: [
    " oooo    oooo ",
    " owwottttowwo ",
    " owwottttowwo ",
    " oRRo    oRRo ",
    " oRRo    oRRo ",
    " oRRo    oRRo ",
    "  oRRo  oRRo  ",
    "   oRRooRRo   ",
    "    oRRRRo    ",
    "     oooo     ",
  ],
  relic: [
    "    ooooo    ",
    "   opwwwpo   ",
    "  opppppppo  ",
    " opppppppppo ",
    " oYYwwwwwYYo ",
    " opYpwwppYpo ",
    " opYppwppYpo ",
    " opYpppppYpo ",
    " opYppwppYpo ",
    " ooooooooooo ",
  ],
};
function texture(canvas: HTMLCanvasElement) {
  const t = new T.CanvasTexture(canvas);
  t.magFilter = t.minFilter = T.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
function iconTexture(kind: FieldItemKind) {
  const c = document.createElement("canvas");
  c.width = c.height = 24;
  const g = c.getContext("2d")!,
    rows = silhouettes[kind],
    width = Math.max(...rows.map((r) => r.length)),
    palette: Record<string, string> = {
      o: "#18271f",
      R: "#c65e4c",
      w: "#f6edcc",
      t: "#ad9365",
      b: "#4eb4ce",
      B: "#43799d",
      Y: "#ddb976",
      g: "#7eb676",
      p: "#9c6bc0",
    };
  for (let y = 0; y < rows.length; y++)
    for (let x = 0; x < rows[y].length; x++) {
      const color = palette[rows[y][x]];
      if (color) {
        g.fillStyle = color;
        g.fillRect(
          Math.floor((24 - width) / 2) + x,
          Math.floor((24 - rows.length) / 2) + y,
          1,
          1,
        );
      }
    }
  return texture(c);
}
function labelTexture(kind: FieldItemKind, caption?: string, name: string = FIELD_ITEMS[kind].name) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 48;
  const g = c.getContext("2d")!;
  g.fillStyle = "#11291fea";
  g.fillRect(1, 1, 254, 46);
  g.strokeStyle = FIELD_ITEMS[kind].color;
  g.strokeRect(1, 1, 254, 46);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#fff1cf";
  g.font = "bold 15px monospace";
  g.fillText(name, 128, 17);
  g.fillStyle = FIELD_ITEMS[kind].color;
  g.font = "11px monospace";
  g.fillText(
    caption ||
      {
        heal: "VIDA +30% · ENCOSTE",
        essence: "ESSÊNCIA +40% · ENCOSTE",
        power: "DANO +30% · 15s",
        haste: "MOVIMENTO +25% · 15s",
        ward: "DANO RECEBIDO −30% · 15s",
        magnet: "COLETA XP +75% · 15s",
        relic: "RISCO DE EMBOSCADA · ENCOSTE",
      }[kind],
    128,
    35,
  );
  return texture(c);
}
export type FieldPickup = Point & {
  kind: FieldItemKind;
  age: number;
  mesh: T.Group;
  icon: T.Sprite;
  label: T.Sprite;
};
export class FieldItems {
  items: FieldPickup[] = [];
  buffs = freshFieldBuffs();
  notice?: FieldNotice & { remaining: number };
  refill = FIELD_RULES.refillSeconds;
  readonly spots: Point[];
  private textures: Record<FieldItemKind, T.Texture>;
  private labels: Record<FieldItemKind, T.Texture>;
  private fullLabels: Record<"heal" | "essence", T.Texture>;
  private energyLabels: { ready: T.Texture; full: T.Texture };
  constructor(
    private scene: T.Scene,
    private obstacles: Obstacle[],
  ) {
    this.spots = reachableLootSpots(obstacles);
    const kinds = Object.keys(FIELD_ITEMS) as FieldItemKind[];
    this.textures = Object.fromEntries(
      kinds.map((k) => [k, iconTexture(k)]),
    ) as unknown as Record<FieldItemKind, T.Texture>;
    this.fullLabels = {
      heal: labelTexture("heal", "VIDA CHEIA · FICA NO MAPA"),
      essence: labelTexture("essence", "ESSÊNCIA CHEIA · FICA NO MAPA"),
    };
    this.energyLabels = {
      ready: labelTexture("essence", "ENERGIA +40% · ENCOSTE", "Recarga de Energia"),
      full: labelTexture("essence", "ENERGIA CHEIA · FICA NO MAPA", "Recarga de Energia"),
    };
    this.labels = Object.fromEntries(
      kinds.map((k) => [k, labelTexture(k)]),
    ) as unknown as Record<FieldItemKind, T.Texture>;
  }
  add(kind: FieldItemKind, p: Point) {
    if (this.items.length >= FIELD_RULES.maxItems) return;
    const mesh = new T.Group(),
      color = FIELD_ITEMS[kind].color;
    mesh.name = `field-item-${kind}`;
    mesh.position.set(p.x, heightAt(p.x, p.z), p.z);
    const ring = new T.Mesh(
      new T.RingGeometry(0.43, 0.51, 24),
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.07;
    mesh.add(ring);
    const icon = new T.Sprite(
      new T.SpriteMaterial({
        map: this.textures[kind],
        transparent: false,
        alphaTest: 0.4,
      }),
    );
    icon.scale.set(2.2, 2.2, 1);
    icon.position.y = 0.85;
    mesh.add(icon);
    const label = new T.Sprite(
      new T.SpriteMaterial({
        map: this.labels[kind],
        transparent: true,
        depthTest: false,
        depthWrite: false,
        alphaTest: 0.2,
      }),
    );
    label.scale.set(3.7, 0.7, 1);
    label.position.y = 2;
    label.renderOrder = 30;
    label.visible = false;
    mesh.add(label);
    this.scene.add(mesh);
    const item: FieldPickup = { ...p, kind, age: 0, mesh, icon, label };
    this.items.push(item);
    return item;
  }
  seed(player: Point, rng: () => number = Math.random) {
    this.clear();
    for (const zone of ZONES)
      for (let i = 0; i < FIELD_RULES.perZone; i++) {
        const p = pickLootSpot(zone.id, this.spots, this.items, player, rng);
        if (!p) continue;
        const kind = i === 0 ? "relic" : rollFieldSupply(rng);
        this.add(kind, p);
      }
  }
  beginFrame(dt: number) {
    tickFieldBuffs(this.buffs, dt);
    if (this.notice) {
      this.notice.remaining -= dt;
      if (this.notice.remaining <= 0) this.notice = undefined;
    }
  }
  announce(notice: FieldNotice) {
    this.notice = { ...notice, remaining: 6 };
  }
  update(
    dt: number,
    player: Player,
    collect: (kind: FieldItemKind) => FieldNotice | null,
    rng: () => number = Math.random,
  ) {
    for (const item of [...this.items]) {
      item.age += dt;
      item.icon.position.y = 0.85 + Math.sin(item.age * 2.6 + item.x) * 0.1;
      item.label.visible = distance(player, item) < 4;
      item.label.material.map =
        item.kind === "essence" && player.species === "construct"
          ? player.maxEssence - player.essence < .5 ? this.energyLabels.full : this.energyLabels.ready
          : item.kind === "heal" && player.maxHp - player.hp < 0.5
          ? this.fullLabels.heal
          : item.kind === "essence" && player.maxEssence - player.essence < 0.5
            ? this.fullLabels.essence
            : this.labels[item.kind];
      if (distance(player, item) > FIELD_RULES.pickupRadius) continue;
      const notice = collect(item.kind);
      if (!notice) continue;
      this.remove(item);
      this.announce(notice);
    }
    this.refill -= dt;
    if (this.refill <= 0) {
      this.refill = FIELD_RULES.refillSeconds;
      // Refill the least populated regions first; the map never accumulates unlimited props.
      for (const zone of [...ZONES].sort(
        (a, b) =>
          this.items.filter((p) => zoneAt(p.x, p.z).id === a.id).length -
          this.items.filter((p) => zoneAt(p.x, p.z).id === b.id).length,
      )) {
        if (
          this.items.filter((p) => zoneAt(p.x, p.z).id === zone.id).length >= 4
        )
          continue;
        const p = pickLootSpot(zone.id, this.spots, this.items, player, rng);
        if (p) this.add(rollFieldItem(rng), p);
      }
    }
  }
  private remove(item: FieldPickup) {
    this.scene.remove(item.mesh);
    item.mesh.traverse((o) => {
      if (o instanceof T.Mesh) o.geometry.dispose();
      if (o instanceof T.Mesh || o instanceof T.Sprite)
        (o.material as T.Material).dispose();
    });
    this.items = this.items.filter((i) => i !== item);
  }
  clear() {
    for (const item of [...this.items]) this.remove(item);
    this.buffs = freshFieldBuffs();
    this.notice = undefined;
    this.refill = FIELD_RULES.refillSeconds;
  }
}
