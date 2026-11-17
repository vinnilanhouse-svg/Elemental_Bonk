const { chromium } = require("playwright");
const assert = require("node:assert/strict");
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
  const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("http://127.0.0.1:5173/?test", {
      waitUntil: "domcontentloaded",
    });
    await page.locator('[data-action="agent:saci"]').click();
    assert.equal(
      await page
        .locator('[data-action="agent:saci"]')
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.screenshot({ path: "/tmp/monstrao-saci-menu.png" });
    await page.locator('[data-action="start"]').click();
    assert.equal(await page.locator(".skill").count(), 2);
    assert.ok(
      await page.getByText("Rajada Travessa", { exact: true }).isVisible(),
    );
    assert.equal(await page.locator('[data-action^="skill:"]').count(), 0);
    const checks = await page.evaluate(async () => {
      const g = window.__game,
        { REWARDS, makeChoice, applyChoice } =
          await import("/src/progression.ts"),
        { canMove } = await import("/src/logic.ts");
      const reset = (species) => {
        g.menu();
        g.selectSpecies(species);
        g.start();
        g.spawnClock = 999;
        g.invuln = 999;
        g.attackClock = 999;
      };
      const enemy = (z = 7, kind = 2) => {
        g.spawn(kind, { x: 0, z });
        const e = g.enemies.at(-1);
        if (!e) throw Error("spawn failed");
        e.speed = 0;
        e.hp = e.maxHp = 10000;
        e.cooldown = 999;
        return e;
      };
      const learn = (id) => {
        const r = REWARDS.find((r) => r.id === id);
        applyChoice(
          g.player,
          makeChoice(r, g.player, () => 0),
        );
      };
      const step = (seconds) => {
        for (let t = 0; t < seconds; t += 0.05) g.update(0.05);
      };
      const out = {};
      reset("saci");
      const a = enemy(8);
      g.attackClock = 0;
      step(0.8);
      out.rangedBasic = a.hp < 10000;
      reset("saci");
      learn("saci-wind");
      const b = enemy(7);
      b.windup = 1;
      b.facing = { x: 0, z: -1 };
      g.update(0.05);
      out.coneInterrupt =
        b.hp < 10000 && b.windup === 0 && b.z > 7 && g.cooldowns.q > 0;
      reset("saci");
      learn("saci-blink");
      enemy();
      g.update(0.05);
      out.noIdleTeleport =
        g.player.x === 0 && g.player.z === 4 && g.cooldowns.e === 0;
      g.input.keys.add("d");
      g.update(0.05);
      out.blink =
        g.player.x > 1 &&
        canMove(g.player, g.world.obstacles) &&
        g.cooldowns.e > 0;
      g.input.keys.clear();
      reset("saci");
      learn("saci-tornado");
      const c = enemy(7);
      g.update(0.05);
      step(0.6);
      out.tornado =
        c.hp < 10000 && c.disoriented > 0 && g.vortices.length === 1;
      const life = g.vortices[0].life;
      g.pause();
      g.update(0.05);
      out.pause = g.vortices[0].life === life;
      g.resume();
      step(5);
      out.expire = g.vortices.length === 0;
      reset("saci");
      learn("saci-trap");
      const d = enemy(6),
        d2 = enemy(6.2);
      g.update(0.05);
      d.z = 4.7;
      d2.z = 4.9;
      step(0.4);
      out.trapFirst =
        [d, d2].filter((e) => e.rooted > 0).length === 1 &&
        g.traps.length === 0;
      reset("saci");
      learn("saci-mobility");
      enemy();
      g.input.keys.add("d");
      g.update(0.05);
      out.sus = g.player.mobilityTime > 0 && g.cooldowns.mobility > 0;
      g.input.keys.clear();
      reset("gorgon");
      learn("gorgon-poison");
      const e = enemy(6);
      g.update(0.05);
      const hp = e.hp;
      step(0.5);
      out.poison = e.poisonTime > 0 && e.hp < hp;
      reset("gorgon");
      learn("gorgon-gaze");
      const f = enemy(8);
      g.update(0.05);
      out.channel = !!g.gaze && f.petrified === 0;
      step(1.3);
      out.petrify = f.petrified > 0 && f.windup === 0;
      reset("gorgon");
      learn("gorgon-gaze");
      enemy(8);
      g.update(0.05);
      g.invuln = 0;
      g.hurt(1);
      step(0.2);
      out.cancelGaze = !g.gaze;
      reset("gorgon");
      learn("gorgon-medusa");
      const boss = enemy(7, 3);
      g.update(0.05);
      out.bossSlow = boss.slow > 0 && boss.petrified === 0;
      reset("gorgon");
      learn("gorgon-skin");
      g.invuln = 0;
      const before = g.player.hp;
      g.hurt(25, "slashing");
      out.skin = before - g.player.hp < 10 && g.cooldowns.defense > 0;
      g.invuln = 0;
      const before2 = g.player.hp;
      g.hurt(25, "slashing");
      out.skinCooldown = before2 - g.player.hp === 20;
      reset("saci");
      learn("saci-tornado");
      enemy();
      g.update(0.05);
      g.start();
      out.reset =
        !g.vortices.length &&
        !g.traps.length &&
        !g.bolts.length &&
        !g.gaze &&
        g.player.skills.r === 0 &&
        g.player.skills[" "] === 1;
      g.pause();
      return out;
    });
    console.log(checks);
    for (const [k, v] of Object.entries(checks)) assert.ok(v, k);
    // An actual species-specific level choice updates the visible HUD.
    await page.evaluate(async () => {
      const g = window.__game,
        { REWARDS, makeChoice } = await import("/src/progression.ts");
      g.start();
      g.spawnClock = 999;
      g.player.level = 2;
      g.upgradeChoices = ["saci-wind", "saci-trap", "saci-tornado"].map((id) =>
        makeChoice(
          REWARDS.find((r) => r.id === id),
          g.player,
          () => 0,
        ),
      );
      g.phase = "upgrade";
      g.onUI();
    });
    await page.locator('[data-action="upgrade:saci-trap"]').click();
    assert.ok(
      await page.getByText("Armadilha Natural", { exact: true }).isVisible(),
    );
    assert.equal(
      await page.getByText("Dia do Saci", { exact: true }).count(),
      0,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      const g = window.__game;
      g.menu();
      g.selectSpecies("saci");
    });
    await page.locator('[data-action="agent:gorgon"]').click();
    assert.ok(await page.locator('[data-action="start"]').isVisible());
    await page.screenshot({ path: "/tmp/monstrao-species-mobile-menu.png" });
    await page.locator('[data-action="start"]').click();
    await page.evaluate(() => window.__game.pause());
    await page.screenshot({ path: "/tmp/monstrao-gorgon-mobile.png" });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Species selection, automatic powers, status effects, upgrades and mobile: passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
