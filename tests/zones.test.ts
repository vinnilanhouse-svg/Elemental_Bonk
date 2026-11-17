import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { readFileSync } from "node:fs";
import { ZONES, zoneAt, zoneStats } from "../src/zones";
import { fadeOpacity, OCCLUDED_OPACITY } from "../src/occlusion";
import { opaqueAtUV } from "../src/scenery-sprites";
import base from "../src/scenery-frames.json";
import extra from "../src/zone-scenery-frames.json";
test("five distinct regions have increasing combat and XP multipliers", () => {
  assert.equal(ZONES.length, 5);
  for (let i = 0; i < 5; i++) {
    const z = ZONES[i];
    assert.equal(zoneAt(z.anchor.x, z.anchor.z).id, z.id);
    assert.equal(zoneStats(0, z.anchor).zoneId, z.id);
    if (i) {
      assert.ok(z.hp > ZONES[i - 1].hp);
      assert.ok(z.damage > ZONES[i - 1].damage);
      assert.ok(z.xp > ZONES[i - 1].xp);
    }
  }
  assert.equal(zoneAt(0, 4).id, 1);
  assert.equal(zoneAt(-7, -10).id, 1);
});
test("scenery atlases contain 24 measured props and all production files", () => {
  assert.equal(base.frames.length + extra.frames.length, 24);
  for (const m of [base, extra]) {
    const png = readFileSync(new URL("../public" + m.url, import.meta.url));
    assert.equal(png.readUInt32BE(16), m.size[0]);
    assert.equal(png.readUInt32BE(20), m.size[1]);
    for (const f of m.frames) {
      const [x, y, w, h] = f.rect;
      assert.ok(
        x >= 0 &&
          y >= 0 &&
          w > 0 &&
          h > 0 &&
          x + w <= m.size[0] &&
          y + h <= m.size[1],
      );
    }
  }
});
test("occlusion fade is smooth, never fully invisible, and reversible", () => {
  let alpha = 1;
  for (let i = 0; i < 60; i++) alpha = fadeOpacity(alpha, true, 1 / 60);
  assert.ok(alpha >= OCCLUDED_OPACITY && alpha < 0.281);
  for (let i = 0; i < 60; i++) alpha = fadeOpacity(alpha, false, 1 / 60);
  assert.ok(alpha > 0.999);
  assert.equal(fadeOpacity(1, true, 0), 1);
});
test("alpha sampling ignores transparent sprite corners and arch openings", () => {
  const texture = new T.Texture();
  texture.flipY = false;
  texture.updateMatrix();
  const alpha = new Uint8ClampedArray(4 * 4 * 4);
  alpha[(2 * 4 + 1) * 4 + 3] = 255;
  const asset = {
    texture,
    width: 4,
    height: 4,
    alpha,
    alphaWidth: 4,
    alphaHeight: 4,
  };
  assert.equal(opaqueAtUV(asset, texture, new T.Vector2(0.375, 0.625)), true);
  assert.equal(opaqueAtUV(asset, texture, new T.Vector2(0.875, 0.125)), false);
  texture.dispose();
});
