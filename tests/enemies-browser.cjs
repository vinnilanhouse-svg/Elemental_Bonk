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
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      }),
      errors = [],
      loaded = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (/\/enemies\/.*\.png/.test(r.url())) loaded.push(r.status());
    });
    await page.goto("http://127.0.0.1:5173/?test");
    await page.getByRole("button", { name: /INICIAR MISSÃO/ }).click();
    assert.deepEqual(loaded.sort(), [200, 200, 200, 200]);
    const checks = await page.evaluate(() => {
      const g = window.__game;
      const reset = () => {
        g.start();
        g.spawnClock = 999;
        g.attackClock = 999;
      };
      const ticks = (n) => {
        for (let i = 0; i < n; i++) g.update(0.05);
      };
      const result = {};
      reset();
      g.spawn(0, { x: 5, z: 4 });
      const root = g.enemies[0];
      g.damage(root, 999);
      result.deathRetained =
        g.corpses.length === 1 &&
        root.anim.state === "death" &&
        root.mesh.parent === g.world.scene;
      result.dropMarked =
        g.gems[0].mesh.children.some((c) => c.name === "xp-marker") &&
        g.gems[0].value === 5 &&
        g.player.xp === 0;
      const y0 = g.gems[0].mesh.position.y;
      ticks(3);
      result.dropBounces = g.gems[0].mesh.position.y > y0;
      const corpseTime = root.anim.time;
      g.pause();
      g.update(0.05);
      result.deathPauses = root.anim.time === corpseTime;
      g.resume();
      ticks(15);
      result.deathDisposed =
        root.anim.disposed &&
        root.mesh.parent === null &&
        g.corpses.length === 0;
      result.xpStaysOutside = g.player.xp === 0 && g.gems.length === 1;
      g.player.x = 3;
      ticks(12);
      result.collectsWithFeedback =
        g.player.xp === 5 && g.gems.length === 0 && g.lastXP === 5;
      reset();
      g.player.invuln = 0;
      g.spawn(0, { x: 0, z: 6 });
      const crawler = g.enemies[0];
      crawler.z = 5.6;
      crawler.cooldown = 0;
      crawler.speed = 0;
      g.update(0.05);
      result.rootTelegraph =
        crawler.anim.state === "windup" && g.player.hp === 120;
      ticks(5);
      result.rootImpact =
        crawler.anim.state === "attack" && g.player.hp === 110;
      reset();
      g.spawn(1, { x: 0, z: 10 });
      const specter = g.enemies[0];
      specter.cooldown = 0;
      specter.speed = 0;
      g.update(0.05);
      result.specterPrepares =
        specter.anim.state === "windup" && g.projectiles.length === 0;
      ticks(8);
      result.specterShoots =
        specter.anim.state === "attack" && g.projectiles.length === 1;
      reset();
      g.spawn(2, { x: 0, z: 6 });
      const brute = g.enemies[0];
      brute.cooldown = 0;
      brute.speed = 0;
      g.update(0.05);
      result.brutePrepares =
        brute.anim.state === "windup" && brute.windup > 0.7;
      ticks(17);
      result.bruteSlams = brute.anim.state === "attack";
      reset();
      g.spawn(3, { x: 0, z: -3 });
      const boss = g.boss;
      boss.speed = 0;
      const attack = () => {
        boss.cooldown = 0;
        boss.action = 0;
        g.update(0.05);
        for (let i = 0; i < 30 && boss.windup > 0; i++) g.update(0.05);
      };
      attack();
      result.bossSlams =
        boss.attackMode === "slam" && boss.anim.state === "attack";
      attack();
      result.bossVolleys =
        boss.attackMode === "volley" &&
        boss.anim.state === "cast" &&
        g.projectiles.length === 12;
      attack();
      result.bossSummons =
        boss.attackMode === "summon" &&
        boss.anim.state === "cast" &&
        g.enemies.filter((e) => e.kind === 0).length === 2;
      result.bossOwnAtlas =
        boss.anim.asset.name === "boss" &&
        boss.anim.asset.texture !== g.enemyAssets[2].texture;
      reset();
      for (let i = 0; i < 48; i++) g.spawn(0, { x: 0, z: 14 });
      g.time = 479.99;
      g.update(0.05);
      result.bossAtPopulationLimit = Boolean(g.boss && g.boss.kind === 3);
      reset();
      result.restartCleansBodies =
        g.corpses.length === 0 && g.enemies.length === 0 && g.gems.length === 0;
      g.pause();
      return result;
    });
    for (const [key, v] of Object.entries(checks)) assert.ok(v, key);
    console.log("Enemy sprites, AI poses, death lifetime and XP drop:", checks);
    // Visible HUD progress before and after a genuine level choice.
    await page.evaluate(() => {
      const g = window.__game;
      g.start();
      g.spawnClock = 999;
      g.player.xp = 10;
      g.onUI();
    });
    assert.equal(
      await page.locator("#xp-meter").getAttribute("aria-valuenow"),
      "10",
    );
    assert.equal(
      await page.locator("#xp-meter").getAttribute("aria-valuemax"),
      "19",
    );
    const before = await page.locator("#xpbar").getAttribute("style");
    assert.ok(before.includes("52.631"));
    assert.ok(await page.locator("#xp-count").isVisible());
    await page.screenshot({ path: "/tmp/monstrao-xp-bar.png" });
    await page.evaluate(() => {
      const g = window.__game;
      g.player.xp = 19;
      g.checkLevel();
    });
    await page.locator(".upgrades button").first().click();
    assert.equal(
      await page.locator("#xp-meter").getAttribute("aria-valuemax"),
      "26",
    );
    assert.equal(
      await page.locator("#xp-meter").getAttribute("aria-valuenow"),
      "0",
    );
    assert.equal(await page.locator("#xp-level").innerText(), "NÍVEL 2");
    await page.evaluate(() => {
      const g = window.__game;
      g.start();
      g.spawnClock = 999;
      g.player.invuln = 999;
      g.attackClock = 999;
      for (const [kind, x, z] of [
        [0, -3, 1],
        [1, 3, 0],
        [2, -4, -1],
        [3, 4, -2],
      ]) {
        g.spawn(kind, { x, z });
        g.enemies[g.enemies.length - 1].speed = 0;
      }
      g.update(0.05);
    });
    await page.screenshot({ path: "/tmp/monstrao-new-enemies.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.locator("#xp-meter").isVisible());
    const rect = await page.locator(".xp-panel").boundingBox();
    assert.ok(
      rect.x >= 0 && rect.x + rect.width <= 390 && rect.y + rect.height <= 844,
    );
    await page.screenshot({ path: "/tmp/monstrao-enemies-mobile.png" });
    assert.deepEqual(errors, []);
    console.log(
      "XP bar fill, level reset, desktop/mobile rendering and console: passed",
    );
    const failure = await browser.newPage();
    await failure.route("**/enemies/boss.png", (route) =>
      route.fulfill({ status: 404, body: "missing" }),
    );
    await failure.goto("http://127.0.0.1:5173/");
    await failure.getByRole("button", { name: "TENTAR NOVAMENTE" }).waitFor();
    await failure.waitForTimeout(1000);
    assert.equal(
      await failure.getByRole("heading").innerText(),
      "Falha ao carregar os sprites",
    );
    await failure.unroute("**/enemies/boss.png");
    await failure.getByRole("button", { name: "TENTAR NOVAMENTE" }).click();
    await failure.getByRole("button", { name: /INICIAR MISSÃO/ }).waitFor();
    await failure.close();
    console.log(
      "Missing atlas: persistent error message and successful reload retry.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
