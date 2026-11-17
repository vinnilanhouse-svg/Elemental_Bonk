import * as T from "three";
export const XP_DROP_TIME = 0.35;
export function xpProgress(xp: number, required: number) {
  return Math.max(0, Math.min(1, required > 0 ? xp / required : 0));
}
export function xpDropHeight(age: number) {
  return (
    0.28 +
    Math.sin(Math.min(1, Math.max(0, age) / XP_DROP_TIME) * Math.PI) * 0.75
  );
}
export function xpLabelTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 32;
  const g = c.getContext("2d")!;
  g.fillStyle = "#163322";
  g.fillRect(9, 3, 46, 25);
  g.strokeStyle = "#b5d59a";
  g.lineWidth = 2;
  g.strokeRect(9, 3, 46, 25);
  g.font = "bold 20px monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#eff6ce";
  g.fillText("XP", 32, 16);
  const t = new T.CanvasTexture(c);
  t.magFilter = T.NearestFilter;
  t.minFilter = T.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
export function xpFragment(value: number, label: T.Texture) {
  const mesh = new T.Mesh(
    new T.OctahedronGeometry(0.25),
    new T.MeshStandardMaterial({
      color: value >= 16 ? 0xe8cd79 : 0xc7ed91,
      emissive: 0x819b3f,
      emissiveIntensity: 0.8,
      roughness: 0.5,
    }),
  );
  const marker = new T.Sprite(
    new T.SpriteMaterial({
      map: label,
      transparent: true,
      alphaTest: 0.3,
      depthWrite: false,
    }),
  );
  marker.name = "xp-marker";
  marker.position.y = 0.6;
  marker.scale.set(1, 0.5, 1);
  mesh.add(marker);
  return mesh;
}
