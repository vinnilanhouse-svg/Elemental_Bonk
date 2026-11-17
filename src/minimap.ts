import { FIELD_ITEMS, type FieldItemKind } from "./field-loot";
import { ZONES, zoneAt } from "./zones";
import { WORLD, riverAt } from "./terrain";
import type { Point } from "./logic";
const WIDTH = 160,
  HEIGHT = 148;
export const minimapPoint = (p: Point) => ({
  x: (p.x / WORLD.width + 0.5) * WIDTH,
  y: (p.z / WORLD.depth + 0.5) * HEIGHT,
});
export class Minimap {
  private background: HTMLCanvasElement;
  constructor() {
    this.background = document.createElement("canvas");
    this.background.width = WIDTH;
    this.background.height = HEIGHT;
    const g = this.background.getContext("2d")!;
    for (let y = 0; y < HEIGHT; y += 2)
      for (let x = 0; x < WIDTH; x += 2) {
        g.fillStyle = zoneAt(
          (x / WIDTH - 0.5) * WORLD.width,
          (y / HEIGHT - 0.5) * WORLD.depth,
        ).color;
        g.fillRect(x, y, 2, 2);
      }
    for (let y = 0; y < HEIGHT; y++) {
      const z = (y / HEIGHT - 0.5) * WORLD.depth,
        r = riverAt(z);
      g.fillStyle = "#82b5bf";
      g.fillRect(
        ((r.center - r.halfWidth) / WORLD.width + 0.5) * WIDTH,
        y,
        ((r.halfWidth * 2) / WORLD.width) * WIDTH + 1,
        1,
      );
    }
    const bridge = minimapPoint({ x: riverAt(0).center, z: 0 });
    g.fillStyle = "#ffe3a2";
    g.fillRect(bridge.x - 6, bridge.y - 3, 12, 6);
    const base = minimapPoint({ x: -7, z: -10 });
    g.fillStyle = "#e1dbc4";
    g.fillRect(base.x - 2, base.y - 2, 4, 4);
    g.font = "bold 17px Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const a of ZONES) {
      const p = minimapPoint(a.anchor);
      g.fillStyle = "#10261e";
      g.fillRect(p.x - 10, p.y - 11, 20, 22);
      g.fillStyle = "#fff1c7";
      g.fillText(String(a.id), p.x, p.y);
    }
  }
  draw(
    canvas: HTMLCanvasElement,
    p: Point,
    boss?: Point & { dead: boolean },
    items: readonly (Point & { kind: FieldItemKind })[] = [],
    heading: Point = { x: 0, z: 1 },
    enemies: readonly (Point & { dead: boolean })[] = [],
  ) {
    const g = canvas.getContext("2d")!;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.imageSmoothingEnabled = false;
    g.save();
    g.scale(canvas.width / WIDTH, canvas.height / HEIGHT);
    g.drawImage(this.background, 0, 0);
    const shown = new Set<string>();
    for (const item of items) {
      const q = minimapPoint(item),
        cell = Math.floor(q.x / 5) + "," + Math.floor(q.y / 5);
      if (shown.has(cell)) continue;
      shown.add(cell);
      g.fillStyle = FIELD_ITEMS[item.kind].color;
      g.beginPath();
      g.moveTo(q.x, q.y - 2);
      g.lineTo(q.x + 2, q.y);
      g.lineTo(q.x, q.y + 2);
      g.lineTo(q.x - 2, q.y);
      g.fill();
    }
    for (const e of enemies
      .filter((e) => !e.dead && Math.hypot(e.x - p.x, e.z - p.z) < 14)
      .slice(0, 12)) {
      const q = minimapPoint(e);
      g.strokeStyle = "#ffb195";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(q.x - 1.5, q.y - 1.5);
      g.lineTo(q.x + 1.5, q.y + 1.5);
      g.moveTo(q.x + 1.5, q.y - 1.5);
      g.lineTo(q.x - 1.5, q.y + 1.5);
      g.stroke();
    }
    const at = minimapPoint(p);
    g.save();
    g.translate(at.x, at.y);
    g.rotate(Math.atan2(heading.z, heading.x) + Math.PI / 2);
    g.fillStyle = "#fff1c6";
    g.strokeStyle = "#142b22";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, -5);
    g.lineTo(3.8, 4);
    g.lineTo(0, 2);
    g.lineTo(-3.8, 4);
    g.closePath();
    g.stroke();
    g.fill();
    g.restore();
    if (boss && !boss.dead) {
      const q = minimapPoint(boss);
      g.strokeStyle = "#ffd6a1";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(q.x, q.y, 5, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#ffd6a1";
      g.fillRect(q.x - 1, q.y - 2, 2, 4);
    }
    g.restore();
  }
}
