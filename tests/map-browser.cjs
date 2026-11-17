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
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://127.0.0.1:5173/?test", {
      waitUntil: "domcontentloaded",
    });
    await p.getByRole("button", { name: /JOGAR/ }).click();
    const result = await p.evaluate(async () => {
      const g = window.__game,
        { heightAt, canMove } = await import("/src/logic.ts"),
        { ZONES } = await import("/src/zones.ts");
      const r = {};
      g.spawnClock = 999;
      g.attackClock = 999;
      r.sprites =
        g.world.props.length > 100 && g.world.props.every((s) => s.isSprite);
      r.no3DPropGeometry = !g.world.scene.children.some((s) =>
        ["BoxGeometry", "ConeGeometry", "DodecahedronGeometry"].includes(
          s.geometry?.type,
        ),
      );
      const tree = g.world.prop("oak", 0, 7, 5.8);
      g.player.x = 0;
      g.player.z = 4;
      g.hero.position.set(0, 0, 4);
      g.camera.follow(0, 0, 4, 0, true);
      for (let i = 0; i < 30; i++) g.world.update(g.camera, g.hero, 0.05);
      r.fadesBehind =
        tree.material.opacity < 0.3 && tree.material.opacity >= 0.28;
      r.alphaCutoffStable =
        Math.abs(tree.material.alphaTest / tree.material.opacity - 110 / 255) <
        1e-8;
      g.player.z = 11;
      g.hero.position.set(0, 0, 11);
      g.camera.follow(0, 0, 11, 0, true);
      for (let i = 0; i < 40; i++) g.world.update(g.camera, g.hero, 0.05);
      r.restoresInFront = tree.material.opacity > 0.99;
      const coplanar = g.world.prop("bush", 0, 11, 2.5);
      for (let i = 0; i < 30; i++) g.world.update(g.camera, g.hero, 0.05);
      r.fadesAtSameDepth = coplanar.material.opacity < 0.3;
      r.agentRevealed = g.hero.renderOrder === 20 && !g.hero.material.depthTest;
      r.regionsClear = ZONES.every((z) => canMove(z.anchor, g.world.obstacles));
      const stats = [];
      for (const zone of ZONES) {
        g.start();
        g.spawnClock = 999;
        g.player.x = zone.anchor.x;
        g.player.z = zone.anchor.z;
        g.spawn(0, { x: zone.anchor.x + 2, z: zone.anchor.z });
        const e = g.enemies[0];
        if (!e) throw new Error("Region spawn missing " + zone.id);
        stats.push([e.zoneId, e.maxHp, e.damageScale, e.xpValue]);
      }
      r.scaling = stats.every(
        (s, i) =>
          s[0] === i + 1 &&
          (!i ||
            (s[1] > stats[i - 1][1] &&
              s[2] > stats[i - 1][2] &&
              s[3] >= stats[i - 1][3])),
      );
      // Flood the walkable grid with the same collision rules used by gameplay.
      const open = [{ x: 0, z: 4 }],
        seen = new Set(["0,4"]);
      while (open.length) {
        const point = open.shift();
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const next = { x: point.x + dx, z: point.z + dz },
            key = next.x + "," + next.z;
          if (seen.has(key) || !canMove(next, g.world.obstacles, 0.5)) continue;
          seen.add(key);
          open.push(next);
        }
      }
      r.connectedRegions = ZONES.every((z) =>
        seen.has(z.anchor.x + "," + z.anchor.z),
      );
      g.start();
      g.spawnClock = 999;
      g.time = 480;
      g.update(0.05);
      r.bossInFinalRegion = g.boss?.zoneId === 5;
      g.start();
      g.spawnClock = 999;
      g.player.x = -41;
      g.player.z = 39;
      g.time = 480;
      g.update(0.05);
      r.bossSpawnsWithAgentInRuins = Boolean(
        g.boss &&
        g.boss.zoneId === 5 &&
        Math.hypot(g.boss.x - g.player.x, g.boss.z - g.player.z) >= 2.5,
      );
      g.start();
      return { ...r, stats };
    });
    for (const [key, value] of Object.entries(result))
      if (key !== "stats") assert.ok(value, key);
    console.log(
      "Map sprites, alpha occlusion, connected regions and difficulty:",
      result,
    );
    assert.ok(await p.locator("#region-minimap").isVisible());
    await p.screenshot({ path: "/tmp/monstrao-five-regions-start.png" });
    for (const [id, x, z] of [
      [2, -41, -35],
      [3, 42, -34],
      [4, 42, 38],
      [5, -41, 40],
    ]) {
      await p.evaluate(
        ({ x, z }) => {
          const g = window.__game;
          g.start();
          g.spawnClock = 999;
          g.player.x = x;
          g.player.z = z;
          g.update(0.01);
          g.camera.follow(x, g.hero.position.y, z, 0, true);
          g.onUI();
        },
        { x, z },
      );
      assert.ok(
        (await p.locator("#region-danger").innerText()).includes(
          "REGIÃO " + id,
        ),
      );
      await p.screenshot({ path: "/tmp/monstrao-region-" + id + ".png" });
    }
    await p.setViewportSize({ width: 390, height: 844 });
    const joy = await p.locator("#joystick").boundingBox();
    assert.ok(joy.y > 844 * 0.6);
    assert.ok(Math.abs(joy.x + joy.width / 2 - 195) < 1);
    assert.ok(joy.y + joy.height < 844);
    await p.screenshot({ path: "/tmp/monstrao-bottom-joystick.png" });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Region HUD/minimap, mobile joystick bottom-center, screenshots and console: passed",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
