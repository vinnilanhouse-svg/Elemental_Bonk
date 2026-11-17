const { chromium } = require("playwright");
const fs = require("fs");
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }),
    errors = [];
  p.setDefaultTimeout(60000);
  p.on("pageerror", (e) => errors.push(e.message));
  try {
    await p.goto("http://127.0.0.1:5173/?test", {
      waitUntil: "domcontentloaded",
    });
    await p.locator('[data-action="start"]').waitFor();
    await p.screenshot({ path: "/tmp/gms-after-menu.png" });
    const report = await p.evaluate(async () => {
      const g = window.__game,
        { zoneAt } = await import("/src/zones.ts");
      let seed = 2718;
      const random = Math.random;
      Math.random = () => {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 2 ** 32;
      };
      const results = {};
      for (const species of ["wolf", "gorgon", "saci"]) {
        seed = 2718;
        g.menu();
        g.selectSpecies(species);
        g.start();
        let firstLevel = null,
          damageHits = 0,
          lastHp = g.player.hp;
        const begin = performance.now();
        for (let i = 0; i < 3600 && g.phase !== "defeat"; i++) {
          while (g.phase === "upgrade") {
            if (firstLevel === null) firstLevel = g.time;
            const choice =
              g.upgradeChoices.find((u) => u.skill && u.unlock) ||
              g.upgradeChoices.find((u) => u.stat === "damage") ||
              g.upgradeChoices[0];
            g.choose(choice.id);
          }
          if (g.phase !== "playing") break;
          const angle = g.time * 0.27,
            target = { x: 3 * Math.cos(angle), z: 4 + 3 * Math.sin(angle) },
            dx = target.x - g.player.x,
            dz = target.z - g.player.z,
            n = Math.hypot(dx, dz);
          g.input.stick = { x: dx / n, z: dz / n };
          g.update(1 / 60);
          if (g.player.hp < lastHp) damageHits++;
          lastHp = g.player.hp;
        }
        results[species] = {
          time: g.time,
          level: g.player.level,
          kills: g.player.kills,
          hp: g.player.hp,
          firstLevel,
          damageHits,
          phase: g.phase,
          simulationMs: performance.now() - begin,
        };
      }
      g.menu();
      g.selectSpecies("saci");
      g.start();
      g.input.stick = { x: 0, z: 1 };
      let crossed = null;
      for (let i = 0; i < 600; i++) {
        g.update(1 / 60);
        if (zoneAt(g.player.x, g.player.z).id !== 1) {
          crossed = g.time;
          break;
        }
      }
      results.southBoundarySeconds = crossed;
      g.pause();
      Math.random = random;
      return results;
    });
    fs.writeFileSync(
      process.argv[2] || "reports/opener-current.json",
      JSON.stringify(
        {
          scenario:
            "Seed 2718; scripted circle radius 3 around spawn, automatic upgrade choices; 60 simulated seconds, not a human balance review.",
          results: report,
          errors,
        },
        null,
        2,
      ),
    );
    console.log(report, errors);
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
