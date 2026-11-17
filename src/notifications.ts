export type NoticeCategory =
  "operation" | "region" | "pickup" | "buff" | "danger" | "boss";
export type Notice = {
  id: string;
  title: string;
  text: string;
  category: NoticeCategory;
  remaining: number;
  priority: number;
};
const priorities: Record<NoticeCategory, number> = {
  operation: 10,
  pickup: 20,
  buff: 30,
  region: 50,
  danger: 80,
  boss: 100,
};
export class Notifications {
  active?: Notice;
  queue: Notice[] = [];
  private recent = new Map<string, number>();
  private clock = 0;
  push(
    id: string,
    title: string,
    text: string,
    category: NoticeCategory = "operation",
    duration = 3.5,
  ) {
    if (
      this.active?.id === id ||
      this.queue.some((n) => n.id === id) ||
      this.clock - (this.recent.get(id) ?? -100) < 6
    )
      return;
    const n = {
      id,
      title,
      text,
      category,
      remaining: duration,
      priority: priorities[category],
    };
    this.recent.set(id, this.clock);
    if (!this.active || n.priority > this.active.priority) {
      if (this.active && this.active.category === "boss")
        this.queue.push(this.active);
      this.active = n;
    } else {
      this.queue.push(n);
      this.queue.sort((a, b) => b.priority - a.priority);
      this.queue = this.queue.slice(0, 5);
    }
  }
  tick(dt: number) {
    this.clock += dt;
    if (this.active) {
      this.active.remaining -= dt;
      if (this.active.remaining <= 0) this.active = this.queue.shift();
    }
    for (const [key, time] of this.recent)
      if (this.clock - time > 20) this.recent.delete(key);
  }
  clear() {
    this.active = undefined;
    this.queue = [];
    this.recent.clear();
    this.clock = 0;
  }
}
