import * as T from "three";
import baseManifest from "./scenery-frames.json";
import zoneManifest from "./zone-scenery-frames.json";
const manifests = [baseManifest, zoneManifest];
export type PropKind = string;
export type SceneryAsset = {
  texture: T.Texture;
  width: number;
  height: number;
  alpha: Uint8ClampedArray;
  alphaWidth: number;
  alphaHeight: number;
};
export async function loadSceneryAssets(
  progress: () => void = () => {},
): Promise<SceneryAsset[]> {
  return Promise.all(
    manifests.map(async (manifest) => {
      const texture = await new T.TextureLoader().loadAsync(manifest.url);
      texture.colorSpace = T.SRGBColorSpace;
      texture.minFilter = T.NearestFilter;
      texture.magFilter = T.NearestFilter;
      texture.generateMipmaps = false;
      const image = texture.image as HTMLImageElement,
        canvas = document.createElement("canvas");
      canvas.width = Math.ceil(image.width / 3);
      canvas.height = Math.ceil(image.height / 3);
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      progress();
      return {
        texture,
        width: image.width,
        height: image.height,
        alpha: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        alphaWidth: canvas.width,
        alphaHeight: canvas.height,
      };
    }),
  );
}
export function propSprite(
  assets: SceneryAsset[],
  kind: PropKind,
  width: number,
) {
  const atlas = manifests.findIndex((m) => m.frames.some((f) => f.id === kind)),
    asset = assets[atlas];
  const frame = manifests[atlas]?.frames.find((f) => f.id === kind);
  if (!frame) throw new Error(`Objeto desconhecido: ${kind}`);
  const [x, y, w, h] = frame.rect,
    texture = asset.texture.clone();
  texture.repeat.set(w / asset.width, h / asset.height);
  texture.offset.set(x / asset.width, 1 - (y + h) / asset.height);
  texture.updateMatrix();
  texture.needsUpdate = true;
  const sprite = new T.Sprite(
    new T.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 110 / 255,
      depthWrite: true,
    }),
  );
  sprite.center.set(0.5, 0);
  sprite.scale.set(width, (width * h) / w, 1);
  sprite.name = `scenery:${kind}`;
  sprite.userData.atlas = atlas;
  return sprite;
}
export function opaqueAtUV(
  asset: SceneryAsset,
  texture: T.Texture,
  uv: T.Vector2,
) {
  const source = texture.transformUv(uv.clone()),
    x = Math.max(
      0,
      Math.min(asset.alphaWidth - 1, Math.floor(source.x * asset.alphaWidth)),
    ),
    y = Math.max(
      0,
      Math.min(asset.alphaHeight - 1, Math.floor(source.y * asset.alphaHeight)),
    );
  return asset.alpha[(y * asset.alphaWidth + x) * 4 + 3] >= 110;
}
