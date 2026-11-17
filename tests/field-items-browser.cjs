const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("http://127.0.0.1:5173/?test", {
      waitUntil: "domcontentloaded",
    });
    await page.locator('[data-action="start"]').click();
    const results = await page.evaluate(async () => {
      const g = window.__game,
        { zoneAt } = await import("/src/zones.ts"),
        { canMove, distance } = await import("/src/logic.ts"),
        { FIELD_RULES } = await import("/src/field-loot.ts");
      const out = {},
        reset = () => {
          g.start();
          g.spawnClock = 999;
          g.attackClock = 999;
          g.fieldItems.clear();
          g.invuln = 999;
        },
        put = (kind) =>
          g.fieldItems.add(kind, { x: g.player.x, z: g.player.z }),
        step = (seconds) => {
          for (let t = 0; t < seconds; t += 0.05) g.update(0.05);
        },
        withRoll = (roll, fn) => {
          const old = Math.random;
          let first = true,
            seed = 1234;
          Math.random = () => {
            if (first) {
              first = false;
              return roll;
            }
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 2 ** 32;
          };
          try {
            return fn();
          } finally {
            Math.random = old;
          }
        };
      g.start();
      const first = g.fieldItems.items.map((i) => [i.kind, i.x, i.z]);
      out.initial =
        first.length === 15 &&
        [1, 2, 3, 4, 5].every(
          (zone) =>
            g.fieldItems.items.filter((i) => zoneAt(i.x, i.z).id === zone)
              .length === 3,
        );
      out.reachable = g.fieldItems.items.every(
        (i) =>
          canMove(i, g.world.obstacles, 0.85) &&
          g.fieldItems.spots.some((s) => s.x === i.x && s.z === i.z) &&
          distance(g.player, i) >= 4.5,
      );
      out.separated = g.fieldItems.items.every((i, n) =>
        g.fieldItems.items
          .slice(0, n)
          .every((j) => distance(i, j) >= FIELD_RULES.minSpacing),
      );
      g.start();
      out.randomEachRun =
        JSON.stringify(first) !==
        JSON.stringify(g.fieldItems.items.map((i) => [i.kind, i.x, i.z]));
      reset();
      const full = put("heal");
      g.update(0.05);
      out.fullPreserved = g.fieldItems.items.includes(full);
      g.player.hp = 40;
      g.update(0.05);
      out.heal = g.player.hp === 76 && !g.fieldItems.items.length;
      g.update(0.05);
      out.once = g.player.hp === 76;
      reset();
      g.player.essence = 10;
      put("essence");
      g.update(0.05);
      out.essence = g.player.essence > 50 && g.player.essence < 51;
      reset();
      const p = g.player;
      put("power");
      g.update(0.05);
      g.spawn(2, { x: 0, z: 7 });
      const e = g.enemies[0];
      e.hp = 1000;
      e.speed = 0;
      e.cooldown = 999;
      g.damage(e, 10);
      out.damage = Math.abs(e.hp - 987) < 1e-6 && p.damage === 22;
      g.pause();
      const frozen = JSON.stringify({
        buffs: g.fieldItems.buffs,
        age: g.fieldItems.items.map((i) => i.age),
        refill: g.fieldItems.refill,
        notice: g.fieldItems.notice,
      });
      g.update(10);
      out.pause =
        frozen ===
        JSON.stringify({
          buffs: g.fieldItems.buffs,
          age: g.fieldItems.items.map((i) => i.age),
          refill: g.fieldItems.refill,
          notice: g.fieldItems.notice,
        });
      g.resume();
      step(15.1);
      const hp = e.hp;
      g.damage(e, 10);
      out.expire =
        g.fieldItems.buffs.power === 0 &&
        Math.abs(e.hp - hp + 10) < 1e-6 &&
        p.damage === 22;
      reset();
      const base = g.collectionRadius();
      put("magnet");
      g.update(0.05);
      out.magnet = Math.abs(g.collectionRadius() - base * 1.75) < 1e-6;
      reset();
      put("ward");
      g.update(0.05);
      g.invuln = 0;
      const hp0 = g.player.hp;
      g.hurt(10);
      out.ward = Math.abs(g.player.hp - hp0 + 7) < 1e-6;
      reset();
      put("haste");
      g.update(0.05);
      g.input.keys.add("d");
      g.update(0.05);
      g.input.keys.clear();
      out.haste = Math.abs(g.player.x - 0.3125) < 1e-6 && g.player.speed === 5;
      reset();
      put("relic");
      withRoll(0.12, () => g.update(0.05));
      out.ambush =
        g.enemies.length >= 1 &&
        g.enemies.length <= 6 &&
        g.enemies.every((e) => distance(g.player, e) > 6) &&
        g.fieldItems.notice.tone === "danger" &&
        g.fieldItems.items.length === 0;
      reset();
      put("relic");
      withRoll(0.4, () => g.update(0.05));
      out.cache =
        g.gems.length === 5 &&
        g.player.xp === 0 &&
        g.fieldItems.notice.title === "Chuva de fragmentos";
      step(1.5);
      out.cacheCollected = g.player.xp > 0 || g.phase === "upgrade";
      reset();
      g.player.hp = 50;
      g.player.essence = 10;
      put("relic");
      withRoll(0.7, () => g.update(0.05));
      out.blessing =
        g.player.hp === 86 &&
        g.player.essence > 50 &&
        g.fieldItems.buffs.ward > 0;
      reset();
      g.spawn(2, { x: 0, z: 7 });
      const calm = g.enemies[0];
      calm.windup = 1;
      put("relic");
      withRoll(0.99, () => g.update(0.05));
      out.calm =
        calm.windup === 0 &&
        calm.slow > 4 &&
        calm.cooldown > 4 &&
        g.fieldItems.buffs.haste > 0;
      reset();
      for (let i = 0; i < 48; i++) g.spawn(0, { x: 0, z: 12 });
      put("relic");
      withRoll(0.1, () => g.update(0.05));
      out.populationCap =
        g.enemies.length === 48 &&
        g.gems.length === 5 &&
        g.fieldItems.notice.title === "Chuva de fragmentos";
      reset();
      g.start();
      const oldItems = [...g.fieldItems.items],
        old = [...oldItems.map((i) => i.mesh)];
      g.fieldItems.buffs.power = 15;
      g.fieldItems.announce({ title: "test", text: "test", tone: "good" });
      g.start();
      out.restart =
        old.every((mesh) => !g.world.scene.children.includes(mesh)) &&
        g.fieldItems.items.length === 15 &&
        g.fieldItems.buffs.power === 0 &&
        !g.fieldItems.notice;
      g.fieldItems.refill = 0.01;
      g.update(0.05);
      out.refill = g.fieldItems.items.length === 20;
      for (let i = 0; i < 10; i++) {
        g.fieldItems.refill = 0.01;
        g.update(0.05);
      }
      out.bounded = g.fieldItems.items.length <= 20;
      g.pause();
      return out;
    });
    console.log("Field pickups, buffs and events:", results);
    for (const [k, v] of Object.entries(results)) assert.ok(v, k);
    // Render a real collection notice and ticking buff chips in desktop and mobile HUDs.
    await page.evaluate(() => {
      const g = window.__game;
      g.start();
      g.spawnClock = 999;
      g.fieldItems.clear();
      g.fieldItems.add("power", { x: 0, z: 4 });
      g.update(0.05);
      g.fieldItems.add("relic", { x: 2.2, z: 5 });
      g.fieldItems.update(0.01, g.player, () => null);
      g.fieldItems.buffs.magnet = 12;
      g.onUI();
    });
    assert.ok(await page.locator("#field-notice").isVisible());
    assert.match(await page.locator("#field-buffs").innerText(), /Poder/);
    assert.match(await page.locator("#field-buffs").innerText(), /Magnetismo/);
    await page.screenshot({ path: "/tmp/monstrao-field-items-desktop.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/monstrao-field-items-mobile.png" });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const status = await page.locator(".field-status").boundingBox(),
      joy = await page.locator("#joystick").boundingBox();
    assert.ok(status.y + status.height < joy.y);
    assert.ok(await page.locator("#joystick").isVisible());
    await page.keyboard.press("Escape");
    const frozen = await page.evaluate(() =>
      JSON.stringify(window.__game.fieldItems.buffs),
    );
    await page.waitForTimeout(150);
    assert.equal(
      await page.evaluate(() => JSON.stringify(window.__game.fieldItems.buffs)),
      frozen,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Visible item markers, buff HUD, pause and mobile joystick layout: passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
