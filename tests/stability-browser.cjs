const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const page = await b.newPage({ viewport: { width: 1440, height: 900 } }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5173/?test");
    await page.getByRole("button", { name: /JOGAR/ }).click();
    assert.equal(await page.locator(".skill").count(), 1);
    assert.equal(await page.locator(".skill.locked").count(), 0);
    const result = await page.evaluate(() => {
      const g = window.__game;
      g.start();
      g.spawnClock = 999;
      g.attackClock = 999;
      g.player.skills[" "] = 1;
      g.player.skillPower[" "] = 0.2;
      const initial = { x: g.player.x, z: g.player.z },
        random = Math.random;
      try {
        Math.random = () => 0;
        g.hurt(20);
        const avoided =
          g.player.hp === 120 &&
          g.hurtTime === 0 &&
          g.evadeFeedback > 0 &&
          g.invuln === 0;
        Math.random = () => 0.99;
        g.hurt(20);
        const failedRoll = g.player.hp === 100;
        const noTeleport = g.player.x === initial.x && g.player.z === initial.z;
        g.invuln = 0;
        g.hurtTime = 0;
        g.input.keys.add("d");
        for (let i = 0; i < 10; i++) g.update(0.05);
        g.input.keys.clear();
        const followsInput =
          Math.abs(g.player.x - initial.x - 2.5) < 1e-6 &&
          g.player.z === initial.z;
        g.start();
        g.spawnClock = 999;
        g.spawn(2, { x: 1, z: 6 });
        const enemy = g.enemies[0];
        enemy.speed = 0;
        enemy.cooldown = 0;
        g.update(0.05);
        const windup = g.feedback.signals.some(
          (s) => s.team === "enemy" && s.phase === "windup",
        );
        for (let i = 0; i < 4; i++) g.update(0.05);
        const playerStrike = g.feedback.signals.some(
          (s) => s.team === "player" && s.phase === "impact",
        );
        const opaque =
          g.hero.material.transparent === false &&
          enemy.mesh.material.transparent === false;
        g.pause();
        const signals = g.feedback.signals.map((s) => s.life);
        g.update(0.1);
        const paused =
          JSON.stringify(signals) ===
          JSON.stringify(g.feedback.signals.map((s) => s.life));
        g.start();
        g.spawn(0, { x: 0, z: 14 });
        g.enemies[0].cooldown = 999;
        g.attackClock = 999;
        g.invuln = 999;
        let monotonic = true,
          lastZ = g.enemies[0].z;
        for (let i = 0; i < 100; i++) {
          g.update(0.05);
          const z = g.enemies[0].z;
          if (z > lastZ + 0.001) monotonic = false;
          lastZ = z;
        }
        const navigationSteady = monotonic;
        g.start();
        const reset =
          g.feedback.signals.length === 0 && g.offerHistory.length === 0;
        return {
          avoided,
          failedRoll,
          noTeleport,
          followsInput,
          windup,
          playerStrike,
          opaque,
          paused,
          reset,
          navigationSteady,
        };
      } finally {
        Math.random = random;
      }
    });
    for (const [k, v] of Object.entries(result)) assert.ok(v, k);
    console.log("Stability and combat regression:", result);
    await page.evaluate(() => {
      const g = window.__game;
      g.start();
      g.spawnClock = 999;
      g.player.xp = 19;
      g.checkLevel();
    });
    assert.equal(
      await page.locator(".upgrades button .loot-icon svg").count(),
      3,
    );
    await page.screenshot({ path: "/tmp/monstrao-upgrade-icons-desktop.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".upgrades button").last().scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/monstrao-upgrade-icons-mobile.png" });
    await page.locator(".upgrades button").first().click();
    assert.equal(await page.evaluate(() => window.__game.phase), "playing");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const g = window.__game;
      g.start();
      g.spawnClock = 999;
      g.invuln = 999;
      g.spawn(2, { x: 1, z: 6 });
      g.enemies[0].speed = 0;
      g.enemies[0].cooldown = 0;
      for (let i = 0; i < 5; i++) g.update(0.05);
    });
    await page.screenshot({ path: "/tmp/monstrao-attack-cues.png" });
    assert.deepEqual(errors, []);
    console.log(
      "Hidden unlearned skills, level choice icons, attack cues and desktop/mobile layout: passed",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
