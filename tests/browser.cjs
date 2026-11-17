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
    assert.equal(await page.locator(".skill.locked").count(), 4);
    assert.equal(await page.locator('[data-action^="skill:"]').count(), 0);
    for (const key of ["w", "s", "a", "d"]) {
      const before = await page.evaluate(() => ({ ...window.__game.player }));
      await page.keyboard.down(key);
      await page.evaluate(() => window.__game.update(0.05));
      await page.keyboard.up(key);
      const after = await page.evaluate(() => ({ ...window.__game.player }));
      assert.ok(Math.hypot(after.x - before.x, after.z - before.z) > 0);
    }
    await page.keyboard.press("q");
    await page.keyboard.press("e");
    await page.keyboard.press("r");
    await page.keyboard.press("Space");
    assert.ok(
      await page.evaluate(() =>
        Object.values(window.__game.cooldowns).every((v) => v === 0),
      ),
    );
    await page.keyboard.press("Escape");
    const t = await page.evaluate(() => window.__game.time);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__game.time), t);
    await page.getByRole("button", { name: /CONTINUAR OPERAÇÃO/ }).click();
    // Real XP pickup opens the first level, then choose the card through the actual UI.
    await page.evaluate(() => {
      const g = window.__game;
      g.start();
      g.spawnClock = 999;
      g.player.xp = 14;
      g.spawn(0, { x: 0, z: 6 });
      g.damage(g.enemies[0], 999);
      const rng = Math.random;
      Math.random = () => 0.75;
      try {
        for (let i = 0; i < 20 && g.phase === "playing"; i++) g.update(0.05);
      } finally {
        Math.random = rng;
      }
    });
    assert.equal(await page.evaluate(() => window.__game.phase), "upgrade");
    assert.equal(await page.locator(".upgrades button").count(), 3);
    assert.ok(await page.locator(".loot-rarity").first().isVisible());
    assert.ok(await page.locator(".loot-quality").first().isVisible());
    await page.screenshot({ path: "/tmp/monstrao-upgrades-desktop.png" });
    await page.locator('[data-action="upgrade:sopro"]').click();
    assert.equal(await page.evaluate(() => window.__game.player.skills.q), 1);
    assert.equal(await page.locator(".skill.locked").count(), 3);
    await page.keyboard.press("q");
    assert.equal(await page.evaluate(() => window.__game.cooldowns.q), 0);
    const results = await page.evaluate(async () => {
      const { makeChoice, REWARDS } = await import("/src/progression.ts");
      const { SKILLS, ENEMY_XP } = await import("/src/config.ts");
      const g = window.__game;
      const reset = () => {
        g.start();
        g.spawnClock = 999;
        g.invuln = 999;
      };
      reset();
      g.spawn(0, { x: 0, z: 6 });
      g.enemies[0].speed = 0;
      for (let i = 0; i < 40 && g.phase === "playing"; i++) g.update(0.05);
      const combat = g.player.kills === 1;
      reset();
      g.attackClock = 999;
      g.spawn(2, { x: 0, z: 6 });
      g.enemies[0].speed = 0;
      g.enemies[0].cooldown = 999;
      g.enemies[0].hp = 1000;
      g.player.attack = 20;
      g.attackClock = 0;
      for (let i = 0; i < 10; i++) g.update(0.05);
      const fastClaws = g.enemies[0].hp < 1000;
      let drops = true;
      for (let kind = 0; kind < 4; kind++) {
        reset();
        g.spawn(kind, { x: 0, z: 9 });
        g.damage(g.enemies[0], 99999);
        drops &&= g.gems[0].value === ENEMY_XP[kind] && g.player.xp === 0;
      }
      reset();
      g.spawn(0, { x: 5, z: 4 });
      g.damage(g.enemies[0], 999);
      for (let i = 0; i < 10; i++) g.update(0.05);
      const outside = g.player.xp === 0 && g.gems.length === 1;
      g.player.x = 3;
      for (let i = 0; i < 20; i++) g.update(0.05);
      const pickup = g.player.xp === 5 && g.gems.length === 0;
      const automatic = {};
      for (const [id, key, range] of [
        ["sopro", "q", 3],
        ["faro", "e", 5],
        ["furia", "r", 3],
        ["esquiva", " ", 2.2],
      ]) {
        reset();
        const choice = makeChoice(
          REWARDS.find((r) => r.id === id),
          g.player,
          () => 0,
        );
        g.player.skills[key] = 1;
        g.player.skillPower[key] = choice.value;
        g.attackClock = 999;
        g.spawn(2, { x: 0, z: 20 });
        const enemy = g.enemies[0];
        enemy.hp = 10000;
        enemy.maxHp = 10000;
        enemy.speed = 0;
        enemy.cooldown = 999;
        g.update(0.05);
        const noDistantCast = g.cooldowns[key] === 0;
        enemy.z = 4 + range;
        g.update(0.05);
        const damage = 10000 - enemy.hp,
          expected = SKILLS[key].damage * (1 + choice.value),
          cooldown = g.cooldowns[key];
        for (let i = 0; i < 5; i++) g.update(0.05);
        const once =
          enemy.hp === 10000 - damage &&
          g.cooldowns[key] < cooldown &&
          g.cooldowns[key] > 0;
        g.pause();
        const paused = JSON.stringify({
          cd: g.cooldowns,
          time: g.time,
          ess: g.player.essence,
        });
        g.update(0.05);
        const frozen =
          paused ===
          JSON.stringify({
            cd: g.cooldowns,
            time: g.time,
            ess: g.player.essence,
          });
        g.resume();
        g.player.x = 0;
        g.player.z = 4;
        enemy.x = 0;
        enemy.z = 4 + range;
        g.cooldowns[key] = 0.01;
        g.player.essence = 100;
        g.update(0.02);
        automatic[id] =
          noDistantCast &&
          Math.abs(damage - expected) < 0.001 &&
          once &&
          frozen &&
          Math.abs(10000 - enemy.hp - expected * 2) < 0.001;
      }
      reset();
      g.player.xp = 100;
      g.checkLevel();
      const upgrade = g.phase === "upgrade" && g.upgradeChoices.length === 3;
      g.choose(g.upgradeChoices[0].id);
      const stacked = g.phase === "upgrade" && g.player.level === 3;
      while (g.phase === "upgrade") g.choose(g.upgradeChoices[0].id);
      const inventory = g.inventory.length === 3;
      reset();
      g.time = 479.99;
      g.update(0.05);
      const boss = g.bossSpawned && g.boss?.kind === 3;
      g.damage(g.boss, 99999);
      const victory = g.phase === "victory";
      reset();
      g.invuln = 0;
      g.hurt(999);
      const defeat = g.phase === "defeat";
      reset();
      const clean =
        g.enemies.length === 0 &&
        g.projectiles.length === 0 &&
        g.gems.length === 0 &&
        g.effects.length === 0 &&
        g.inventory.length === 0 &&
        Object.values(g.player.skills).every((v) => v === 0) &&
        g.player.hp === 120;
      g.pause();
      return {
        combat,
        fastClaws,
        drops,
        outside,
        pickup,
        ...automatic,
        upgrade,
        stacked,
        inventory,
        boss,
        victory,
        defeat,
        clean,
      };
    });
    for (const [k, v] of Object.entries(results)) assert.ok(v, k);
    console.log("Gameplay checks:", results);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      const g = window.__game;
      g.start();
      g.spawnClock = 999;
    });
    assert.ok(await page.locator("#joystick").isVisible());
    const joy = await page.locator("#joystick").boundingBox();
    await page.mouse.move(joy.x + joy.width / 2, joy.y + joy.height / 2);
    await page.mouse.down();
    await page.mouse.move(joy.x + joy.width - 5, joy.y + joy.height / 2);
    assert.ok(await page.evaluate(() => window.__game.input.stick.x > 0.5));
    await page.mouse.up();
    assert.equal(await page.evaluate(() => window.__game.input.stick.x), 0);
    await page.screenshot({ path: "/tmp/monstrao-auto-mobile.png" });
    await page.evaluate(() => {
      const g = window.__game;
      g.player.xp = 19;
      g.checkLevel();
    });
    assert.equal(await page.locator(".upgrades button").count(), 3);
    await page.locator(".upgrades button").last().scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/monstrao-upgrades-mobile.png" });
    await page.locator(".upgrades button").last().click();
    assert.equal(await page.evaluate(() => window.__game.phase), "playing");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Desktop/mobile upgrade UI, automatic loadout, keyboard, joystick and console: passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
