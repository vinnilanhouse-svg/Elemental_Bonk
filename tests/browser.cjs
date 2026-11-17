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
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("http://127.0.0.1:5173/?test");
    await page.getByRole("button", { name: /Como jogar/ }).click();
    assert.ok(
      await page
        .getByText("Garras automáticas ao se aproximar", { exact: true })
        .isVisible(),
    );
    await page.getByRole("button", { name: "VOLTAR →", exact: true }).click();
    await page.getByRole("button", { name: /INICIAR MISSÃO/ }).click();
    assert.equal(await page.evaluate(() => window.__game.phase), "playing");
    for (const key of ["w", "s", "a", "d"]) {
      const before = await page.evaluate(() => ({ ...window.__game.player }));
      await page.keyboard.down(key);
      await page.evaluate(() => window.__game.update(0.05));
      await page.keyboard.up(key);
      const after = await page.evaluate(() => ({ ...window.__game.player }));
      assert.ok(Math.hypot(after.x - before.x, after.z - before.z) > 0);
    }
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => window.__game.phase), "paused");
    const t = await page.evaluate(() => window.__game.time);
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.__game.time), t);
    await page.getByRole("button", { name: /CONTINUAR OPERAÇÃO/ }).click();
    const results = await page.evaluate(() => {
      const g = window.__game;
      g.start();
      g.spawnClock = 999;
      g.spawn(0, { x: 0, z: 6 });
      for (let i = 0; i < 30; i++) g.update(0.05);
      const combat = g.player.kills > 0;
      g.start();
      g.spawnClock = 999;
      g.spawn(2, { x: 0, z: 7 });
      const e = g.enemies[0],
        z = e.z;
      g.skill("q");
      const q = e.z > z && e.slow > 0;
      g.player.essence = 100;
      g.skill("e");
      const faro = g.scent > 0;
      g.player.essence = 100;
      g.skill("r");
      const fury = g.fury > 0;
      const pz = g.player.z;
      g.skill(" ");
      const dash = g.player.z !== pz && g.cooldowns[" "] > 0;
      g.player.xp = 100;
      g.checkLevel();
      const upgrade = g.phase === "upgrade";
      g.choose(g.upgradeChoices[0].id);
      const stacked = g.phase === "upgrade" && g.player.level === 3;
      while (g.phase === "upgrade") g.choose(g.upgradeChoices[0].id);
      g.start();
      g.time = 479.99;
      g.update(0.05);
      const boss = g.bossSpawned && g.boss?.kind === 3;
      g.damage(g.boss, 99999);
      const victory = g.phase === "victory";
      g.start();
      g.invuln = 0;
      g.hurt(999);
      const defeat = g.phase === "defeat";
      g.start();
      const reset =
        g.time === 0 &&
        g.enemies.length === 0 &&
        g.projectiles.length === 0 &&
        g.effects.length === 0 &&
        g.player.hp === 120 &&
        g.cooldowns.q === 0;
      return {
        combat,
        q,
        faro,
        fury,
        dash,
        upgrade,
        stacked,
        boss,
        victory,
        defeat,
        reset,
      };
    });
    for (const [k, v] of Object.entries(results)) assert.ok(v, k);
    console.log("Browser gameplay checks:", results);
    await page.screenshot({ path: "/tmp/monstrao-desktop.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.__game.menu());
    await page.getByRole("button", { name: /INICIAR MISSÃO/ }).click();
    assert.ok(await page.locator("#joystick").isVisible());
    await page.locator('[data-action="skill:e"]').click();
    assert.ok(await page.evaluate(() => window.__game.scent > 0));
    const joy = await page.locator("#joystick").boundingBox();
    await page.mouse.move(joy.x + joy.width / 2, joy.y + joy.height / 2);
    await page.mouse.down();
    await page.mouse.move(joy.x + joy.width - 5, joy.y + joy.height / 2);
    assert.ok(await page.evaluate(() => window.__game.input.stick.x > 0.5));
    await page.mouse.up();
    assert.equal(await page.evaluate(() => window.__game.input.stick.x), 0);
    await page.screenshot({ path: "/tmp/monstrao-mobile.png" });
    assert.deepEqual(errors, []);
    console.log("Mobile joystick, skill buttons, console: passed");
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
