import { ZONES, zoneAt } from "./zones";
import type { Point } from "./logic";
const WIDTH = 120,
  HEIGHT = 112;
export class Minimap {
  private background: HTMLCanvasElement;
  constructor() {
    this.background = document.createElement("canvas");
    this.background.width = WIDTH;
    this.background.height = HEIGHT;
    const g = this.background.getContext("2d")!;
    for (let y = 0; y < HEIGHT; y += 2)
      for (let x = 0; x < WIDTH; x += 2) {
        const zone = zoneAt((x / WIDTH) * 60 - 30, (y / HEIGHT) * 56 - 28);
        g.fillStyle = zone.color;
        g.fillRect(x, y, 2, 2);
      }
    g.fillStyle = "#709b9c";
    g.fillRect(((10.5 + 30) / 60) * WIDTH - 2, 0, 5, HEIGHT);
    g.fillStyle = "#d3bd86";
    g.fillRect(((10.5 + 30) / 60) * WIDTH - 4, HEIGHT / 2 - 2, 9, 4);
    g.font = "bold 10px monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const a of ZONES) {
      g.fillStyle = "#11241a";
      const x = ((a.anchor.x + 30) / 60) * WIDTH,
        y = ((a.anchor.z + 28) / 56) * HEIGHT;
      g.fillRect(x - 5, y - 6, 10, 12);
      g.fillStyle = a.mapColor;
      g.fillText(String(a.id), x, y);
    }
  }
  draw(canvas: HTMLCanvasElement, p: Point, boss?: Point & { dead: boolean }) {
    const g = canvas.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, WIDTH, HEIGHT);
    g.drawImage(this.background, 0, 0);
    const x = ((p.x + 30) / 60) * WIDTH,
      y = ((p.z + 28) / 56) * HEIGHT;
    g.fillStyle = "#10241a";
    g.beginPath();
    g.arc(x, y, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff4cc";
    g.beginPath();
    g.arc(x, y, 2.5, 0, Math.PI * 2);
    g.fill();
    if (boss && !boss.dead) {
      const bx = ((boss.x + 30) / 60) * WIDTH,
        by = ((boss.z + 28) / 56) * HEIGHT;
      g.strokeStyle = "#f1a7ad";
      g.strokeRect(bx - 3, by - 3, 6, 6);
    }
  }
}
