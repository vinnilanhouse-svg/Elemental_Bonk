import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as T from "three";
import metadata from "../src/enemy-frames.json";
import {
  enemyFrame,
  enemyDirection,
  ENEMY_DEATH_DURATION,
} from "../src/enemy-animation-state";
import { EnemyAnimator } from "../src/enemy-animation";
import { xpProgress, xpDropHeight, XP_DROP_TIME } from "../src/xp";

test("all four unique original atlases have 36 bounded crops, foot pivots, and production assets", () => {
  assert.equal(new Set(metadata.map((a) => a.url)).size, 4);
  for (const a of metadata) {
    const png = readFileSync(new URL("../public" + a.url, import.meta.url));
    assert.equal(png.readUInt32BE(16), a.size[0]);
    assert.equal(png.readUInt32BE(20), a.size[1]);
    assert.equal(a.frames.length, 36);
    for (const f of a.frames) {
      const [x, y, w, h] = f.rect,
        [px, py] = f.pivot;
      assert.ok(
        x >= 0 &&
          y >= 0 &&
          w > 0 &&
          h > 0 &&
          x + w <= a.size[0] &&
          y + h <= a.size[1],
      );
      assert.ok(px >= 0 && px <= w && py >= 0 && py <= h);
      assert.ok(f.duration > 0);
    }
  }
});
test("locomotion, telegraph, impact, hurt, special and death select the intended distinct poses", () => {
  for (let dir = 0; dir < 4; dir++) {
    assert.equal(enemyFrame("idle", dir, 0), dir * 6);
    assert.equal(enemyFrame("walk", dir, 0.14), dir * 6 + 2);
    assert.equal(enemyFrame("windup", dir, 10), dir * 6 + 4);
    assert.equal(enemyFrame("attack", dir, 0.1), dir * 6 + 5);
  }
  assert.equal(enemyFrame("hurt", 0, 0.09), 24);
  assert.equal(enemyFrame("hurt", 2, 0.09), 12);
  assert.equal(enemyFrame("cast", 0, 0.2), 29);
  assert.equal(enemyFrame("death", 0, 0), 30);
  assert.equal(enemyFrame("death", 0, ENEMY_DEATH_DURATION), 35);
  assert.equal(enemyFrame("death", 0, 99), 35);
  assert.equal(enemyDirection(0, 1), 0);
  assert.equal(enemyDirection(0, -1), 1);
  assert.equal(enemyDirection(-1, 0), 2);
  assert.equal(enemyDirection(1, 0), 3);
});
test("enemies animate independently, preserve pixel scale and pivots, and dispose without disposing the shared source", () => {
  const a = metadata[0],
    base = new T.Texture(),
    asset = {
      name: a.id,
      kind: a.kind,
      height: a.worldHeight,
      width: a.size[0],
      sourceHeight: a.size[1],
      referenceHeight: a.referenceHeight,
      frames: a.frames,
      texture: base,
    };
  const first = new EnemyAnimator(new T.Sprite(new T.SpriteMaterial()), asset),
    second = new EnemyAnimator(new T.Sprite(new T.SpriteMaterial()), asset);
  assert.notEqual(first.texture, second.texture);
  assert.equal(first.texture.source, second.texture.source);
  first.set("walk");
  first.update(0.15);
  second.direction = 3;
  second.set("windup");
  assert.equal(first.frame, 2);
  assert.equal(second.frame, 22);
  const f = a.frames[first.frame];
  assert.equal(
    first.sprite.scale.y / f.rect[3],
    asset.height / asset.referenceHeight,
  );
  assert.equal(first.sprite.center.y, 1 - f.pivot[1] / f.rect[3]);
  let baseDisposed = false;
  base.addEventListener("dispose", () => {
    baseDisposed = true;
  });
  first.dispose();
  first.dispose();
  assert.equal(first.disposed, true);
  assert.equal(baseDisposed, false);
  assert.equal(second.disposed, false);
  second.dispose();
  base.dispose();
});
test("XP drop rises then settles, while the progress meter clamps and resets for the new level", () => {
  assert.ok(xpDropHeight(XP_DROP_TIME / 2) > xpDropHeight(0));
  assert.equal(xpDropHeight(XP_DROP_TIME), xpDropHeight(10));
  assert.equal(xpProgress(0, 19), 0);
  assert.ok(xpProgress(10, 19) > 0.5);
  assert.equal(xpProgress(19, 19), 1);
  assert.equal(xpProgress(30, 19), 1);
  assert.equal(xpProgress(0, 26), 0);
});
