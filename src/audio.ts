export class Audio {
  ctx?: AudioContext;
  volume = 0.25;
  private played = new Map<string, number>();
  start() {
    this.ctx ??= new AudioContext();
    void this.ctx.resume();
  }
  play(kind: string) {
    if (!this.ctx || !this.volume) return;
    const now = this.ctx.currentTime;
    if (now - (this.played.get(kind) ?? -1) < 0.09) return;
    this.played.set(kind, now);
    const t = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = kind === "claw" ? "sawtooth" : "sine";
    const freq: Record<string, number> = {
      claw: 180,
      hurt: 90,
      hit: 320,
      block: 420,
      miss: 140,
      collect: 780,
      level: 520,
      howl: 260,
      win: 660,
      lose: 110,
    };
    o.frequency.setValueAtTime(freq[kind] || 300, t);
    o.frequency.exponentialRampToValueAtTime(
      (freq[kind] || 300) * 1.6,
      t + 0.15,
    );
    g.gain.setValueAtTime(this.volume * 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
    o.start();
    o.stop(t + 0.26);
  }
}
