const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const p = await browser.newPage({ viewport: { width: 960, height: 640 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  try {
    await p.goto("http://127.0.0.1:5173/?test", {
      waitUntil: "domcontentloaded",
    });
    await p.locator('[data-action="start"]').click();
    const metrics = await p.evaluate(async () => {
      const g = window.__game,
        { canMove } = await import("/src/logic.ts"),
        { nextWaypoint } = await import("/src/navigation.ts");
      const frameRates = [30, 60, 144].map((hz) => {
        g.start();
        g.fieldItems.clear();
        g.spawnClock = 999;
        g.attackClock = 999;
        g.cooldowns.q = 7;
        g.fieldItems.buffs.power = 10;
        g.input.stick = { x: 0, z: 1 };
        for (let i = 0; i < hz * 2; i++) g.update(1 / hz);
        g.input.stick = { x: 0, z: 0 };
        return {
          hz,
          z: g.player.z,
          time: g.time,
          cooldown: g.cooldowns.q,
          buff: g.fieldItems.buffs.power,
        };
      });
      const setup = () => {
        g.start();
        g.fieldItems.clear();
        g.spawnClock = 999;
        g.invuln = 999;
        g.player.maxHp = g.player.hp = 9999;
        g.player.maxEssence = g.player.essence = 9999;
        for (const k of ["q", "e", "r", " "]) {
          g.player.skills[k] = 5;
          g.player.skillPower[k] = 1;
        }
        for (let i = 0; i < 160 && g.enemies.length < 48; i++) {
          const a = i * 2.399,
            r = 5 + (i % 8),
            point = { x: Math.cos(a) * r, z: 4 + Math.sin(a) * r };
          if (!canMove(point, g.world.obstacles, 0.8)) continue;
          g.spawn(i % 3, point);
          const e = g.enemies.at(-1);
          e.hp = e.maxHp = 10000;
        }
        g.onUI();
      };
      setup();
      const timings = [],
        peaks = { enemies: 0, projectiles: 0, effects: 0, text: 0 };
      for (let i = 0; i < 600; i++) {
        const start = performance.now();
        g.update(1 / 60);
        timings.push(performance.now() - start);
        for (const k of ["enemies", "projectiles", "effects"])
          peaks[k] = Math.max(peaks[k], g[k].length);
        peaks.text = Math.max(
          peaks.text,
          g.combatText.slots.filter((s) => s.life > 0).length,
        );
      }
      g.renderer.render(g.world.scene, g.camera);
      g.start();
      g.fieldItems.clear();
      g.renderer.render(g.world.scene, g.camera);
      const baseline = {
        ...g.renderer.info.memory,
        children: g.world.scene.children.length,
        programs: g.renderer.info.programs.length,
      };
      const repeats = [];
      for (let i = 0; i < 8; i++) {
        setup();
        for (let j = 0; j < 90; j++) g.update(1 / 60);
        g.renderer.render(g.world.scene, g.camera);
        g.start();
        g.fieldItems.clear();
        g.renderer.render(g.world.scene, g.camera);
        repeats.push({
          ...g.renderer.info.memory,
          children: g.world.scene.children.length,
          programs: g.renderer.info.programs.length,
        });
      }
      setup();
      const intervals = [];
      let last = performance.now();
      await new Promise((resolve) => {
        let n = 0;
        const frame = (now) => {
          intervals.push(now - last);
          last = now;
          if (++n >= 45) resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      g.pause();
      timings.sort((a, b) => a - b);
      intervals.sort((a, b) => a - b);
      return {
        frameRates,
        environment:
          "Headless Chromium with SwiftShader software GPU; viewport 960x640; not physical-device FPS.",
        simulationMedianMs: timings[Math.floor(timings.length * 0.5)],
        simulationP95Ms: timings[Math.floor(timings.length * 0.95)],
        frameMedianMs: intervals[Math.floor(intervals.length * 0.5)],
        frameP95Ms: intervals[Math.floor(intervals.length * 0.95)],
        peaks,
        baseline,
        repeats,
        drawCalls: g.renderer.info.render.calls,
        triangles: g.renderer.info.render.triangles,
      };
    });
    console.log("Stress and resource lifecycle:", metrics);
    for (const f of metrics.frameRates) {
      assert.ok(Math.abs(f.z - 14) < 1e-6);
      assert.ok(Math.abs(f.time - 2) < 1e-6);
      assert.ok(Math.abs(f.cooldown - 5) < 1e-6);
      assert.ok(Math.abs(f.buff - 8) < 1e-6);
    }
    assert.equal(metrics.peaks.enemies, 48);
    assert.ok(metrics.peaks.projectiles <= 100);
    assert.ok(metrics.peaks.effects <= 90);
    assert.ok(metrics.peaks.text <= 24);
    const last = metrics.repeats.at(-1);
    assert.ok(
      last.geometries <= metrics.baseline.geometries + 4,
      "no growing geometry count",
    );
    assert.ok(
      last.textures <= metrics.baseline.textures + 3,
      "no growing texture count",
    );
    assert.equal(last.children, metrics.baseline.children);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "reports/performance.json",
      JSON.stringify({ ...metrics, errors }, null, 2),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
