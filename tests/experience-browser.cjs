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
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
    errors = [];
  p.setDefaultTimeout(60000);
  p.on("pageerror", (e) => errors.push(e.message));
  try {
    await p.goto("http://127.0.0.1:5173/?test", {
      waitUntil: "domcontentloaded",
    });
    await p.locator('[data-action="start"]').waitFor();
    const layouts = [];
    for (const [width, height] of [
      [1440, 900],
      [1280, 600],
      [390, 844],
      [320, 568],
      [740, 390],
    ]) {
      await p.setViewportSize({ width, height });
      const box = await p.locator('[data-action="start"]').boundingBox();
      layouts.push({ width, height, start: box });
      assert.ok(
        box.y >= 0 && box.y + box.height <= height,
        "play stays on screen " + width + "x" + height,
      );
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await p.screenshot({ path: `/tmp/gms-clearing-${width}-${height}.png` });
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    await p.locator('[data-action="agent:gorgon"]').click();
    assert.equal(
      await p
        .locator('[data-action="agent:gorgon"]')
        .getAttribute("aria-pressed"),
      "true",
    );
    await p.locator('[data-action="region:1"]').click();
    assert.match(await p.locator(".region-preview").innerText(), /Bosque/i);
    await p.locator('[data-action="collection"]').click();
    assert.equal(await p.locator(".collection-grid article").count(), 8);
    await p.locator('[data-action="back"]').click();
    await p.locator('[data-action="start"]').click();
    const checks = await p.evaluate(async () => {
      const g = window.__game,
        { freshPlayer, heightAt } = await import("/src/logic.ts"),
        { applyChoice, makeChoice, REWARDS } =
          await import("/src/progression.ts"),
        { CFG } = await import("/src/config.ts");
      const reset = (species = "wolf") => {
          g.menu();
          g.selectSpecies(species);
          g.start();
          g.fieldItems.clear();
          g.spawnClock = 999;
          g.attackClock = 999;
          g.invuln = 999;
        },
        spawn = (kind, x, z) => {
          g.spawn(kind, { x, z });
          const e = g.enemies.at(-1);
          if (!e) throw Error("fixture spawn missing");
          e.speed = 0;
          e.cooldown = 999;
          e.hp = e.maxHp = 1000;
          return e;
        },
        out = {};
      reset();
      const blocked = spawn(0, 0, 7);
      const wall = { x: 0, z: 5.5, r: 0.65 };
      g.world.obstacles.push(wall);
      g.attackClock = 0;
      g.player.skills.q = 1;
      g.update(0.05);
      out.noBlockedCast =
        g.cooldowns.q === 0 && g.attackAnim === 0 && blocked.hp === 1000;
      g.world.obstacles.pop();
      g.update(0.05);
      out.visibleCast = g.cooldowns.q > 0;
      reset();
      const a = spawn(0, 0, 6);
      const b = spawn(0, 1, 6);
      g.attackClock = 0;
      g.update(0.05);
      const target = g.attackTarget;
      for (let i = 0; i < 4; i++) g.update(0.05);
      out.targetStable = g.attackTarget === target;
      out.impactOnce = a.hp === 978 || b.hp === 978;
      reset();
      g.invuln = 0;
      g.hurt(10, "blunt", { x: 0, z: 8 });
      out.source = g.damageDirectionTime > 0 && g.damageOrigin.z === 8;
      const hp = g.player.hp;
      g.hurt(10, "blunt", { x: 0, z: 8 });
      out.interval = g.player.hp === hp;
      out.textBound = g.combatText.slots.length === 24;
      reset();
      g.fieldItems.add("relic", { x: 0, z: 4 });
      let seed = 42,
        first = true;
      const old = Math.random;
      Math.random = () => {
        if (first) {
          first = false;
          return 0.1;
        }
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 2 ** 32;
      };
      try {
        g.update(0.05);
        out.ambushWarned =
          g.ambushes.length > 0 &&
          g.enemies.length === 0 &&
          g.notifications.active.category === "danger";
        for (let i = 0; i < 25; i++) g.update(0.05);
        out.ambushDelayed =
          g.enemies.length > 0 &&
          g.enemies.every((e) => Math.hypot(e.x, e.z - 4) > 5);
      } finally {
        Math.random = old;
      }
      reset();
      g.player.skills.q = 1;
      g.player.xp = 100;
      g.checkLevel();
      const state = JSON.stringify({
        p: g.player,
        time: g.time,
        buffs: g.fieldItems.buffs,
        notices: g.notifications.active,
      });
      g.update(1);
      out.realPause =
        state ===
        JSON.stringify({
          p: g.player,
          time: g.time,
          buffs: g.fieldItems.buffs,
          notices: g.notifications.active,
        });
      while (g.phase === "upgrade") g.choose(g.upgradeChoices[0].id);
      out.stackedLevels = g.player.level === 4;
      reset();
      g.player.skills.q = 1;
      g.fieldItems.buffs.power = 15;
      g.notifications.push("boss", "Chefe nas Ruínas", "", "boss");
      g.pause();
      g.update(10);
      out.frozenBuffs = g.fieldItems.buffs.power === 15;
      g.start();
      out.restart =
        g.player.hp === 120 &&
        g.player.level === 1 &&
        g.player.skills.q === 0 &&
        !g.notifications.queue.length &&
        !g.ambushes.length;
      // A full timer simulation verifies the real spawn schedule, followed by deterministic boss/result checks.
      reset("saci");
      g.spawnClock = 1;
      let levels = 0;
      for (let i = 0; i < 480 * 30 + 2 && g.phase !== "victory"; i++) {
        while (g.phase === "upgrade") {
          g.choose(g.upgradeChoices[0].id);
          levels++;
        }
        g.update(1 / 30);
        if (g.bossSpawned) break;
      }
      out.fullTimer = g.time >= 480 && g.boss?.zoneId === 5;
      while (g.phase === "upgrade") g.choose(g.upgradeChoices[0].id);
      const wins = g.save.wins;
      g.damage(g.boss, 999999);
      out.victory = g.phase === "victory" && g.save.wins === wins + 1;
      g.start();
      g.invuln = 0;
      g.hurt(999999);
      out.defeat = g.phase === "defeat";
      g.start();
      g.pause();
      return out;
    });
    console.log("Experience integration:", checks);
    for (const [k, v] of Object.entries(checks)) assert.ok(v, k);
    await p.locator('[data-action="resume"]').click();
    await p.evaluate(() => {
      const g = window.__game;
      g.start();
      g.spawnClock = 999;
      g.fieldItems.clear();
      g.player.skills.q = 1;
      g.cooldowns.q = 5;
      g.notifications.push(
        "danger",
        "Emboscada!",
        "Criaturas chegando. Afaste-se dos sinais.",
        "danger",
      );
      g.hurt(10, "blunt", { x: 0, z: 8 });
      g.onUI();
    });
    assert.ok(await p.locator("#damage-direction").isVisible());
    await p.locator("#skill-0").focus();
    assert.ok(await p.locator("#skill-0 .skill-tooltip").isVisible());
    await p.screenshot({ path: "/tmp/gms-compact-hud-desktop.png" });
    await p.keyboard.press("Escape");
    assert.ok(await p.locator(".loadout").isVisible());
    assert.match(await p.locator(".loadout").innerText(), /nível|NV\.|Sopro/);
    await p.locator('[data-action="resume"]').click();
    for (const [width, height] of [
      [390, 844],
      [320, 568],
      [740, 390],
    ]) {
      await p.setViewportSize({ width, height });
      await p.evaluate(() => {
        const g = window.__game;
        for (const k of ["q", "e", "r", " "]) g.player.skills[k] = 1;
        g.onUI();
      });
      const joy = await p.locator("#joystick").boundingBox(),
        skills = await p.locator(".skills").boundingBox(),
        xp = await p.locator(".xp-panel").boundingBox();
      assert.ok(Math.abs(joy.x + joy.width / 2 - width / 2) < 1);
      assert.ok(joy.y > height * 0.5);
      assert.ok(
        skills.x + skills.width <= joy.x ||
          skills.y + skills.height <= joy.y ||
          skills.x >= joy.x + joy.width,
        "skill icons avoid joystick",
      );
      assert.ok(xp.y + xp.height <= height);
      await p.screenshot({ path: `/tmp/gms-hud-${width}-${height}.png` });
    }
    await p.keyboard.press("Escape");
    await p.locator("#reduced-effects").check();
    await p.locator("#shake").uncheck();
    await p.locator('[data-action="menu"]').click();
    await p.reload({ waitUntil: "domcontentloaded" });
    await p.locator('[data-action="settings"]').click();
    await p.locator("#volume").focus();
    const volume = Number(await p.locator("#volume").inputValue());
    await p.keyboard.press("ArrowRight");
    assert.ok(Number(await p.locator("#volume").inputValue()) > volume);
    await p.locator("#shake").focus();
    await p.keyboard.press("Space");
    assert.equal(await p.locator("#shake").isChecked(), true);
    await p.keyboard.press("Space");
    assert.ok(await p.locator("#reduced-effects").isChecked());
    assert.equal(await p.locator("#shake").isChecked(), false);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "reports/experience-validation.json",
      JSON.stringify({ checks, layouts, errors }, null, 2),
    );
    console.log(
      "Menu layouts, keyboard focus, mobile controls and preference reload: passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
