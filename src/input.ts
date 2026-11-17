import { normalize } from "./logic";
export class Input {
  keys = new Set<string>();
  stick = { x: 0, z: 0 };
  onAction: (key: string) => void = () => {};
  constructor() {
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))
        e.preventDefault();
      if (!e.repeat) this.onAction(k);
      this.keys.add(k);
    });
    window.addEventListener("keyup", (e) =>
      this.keys.delete(e.key.toLowerCase()),
    );
    window.addEventListener("blur", () => this.keys.clear());
  }
  direction() {
    let x =
        Number(this.keys.has("d") || this.keys.has("arrowright")) -
        Number(this.keys.has("a") || this.keys.has("arrowleft")) +
        this.stick.x,
      z =
        Number(this.keys.has("s") || this.keys.has("arrowdown")) -
        Number(this.keys.has("w") || this.keys.has("arrowup")) +
        this.stick.z;
    return normalize(x, z);
  }
}
