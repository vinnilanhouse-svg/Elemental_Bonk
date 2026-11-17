import * as T from "three";
export class Camera extends T.PerspectiveCamera {
  zoomDistance = 20;
  constructor() {
    super(43, innerWidth / innerHeight, 0.1, 140);
  }
  follow(x: number, y: number, z: number, dt: number, snap = false) {
    const target = new T.Vector3(
      x,
      y + this.zoomDistance,
      z + this.zoomDistance * 0.78,
    );
    this.position.lerp(target, snap ? 1 : 1 - Math.exp(-dt * 5));
    this.lookAt(
      this.position.x,
      this.position.y - this.zoomDistance,
      this.position.z - this.zoomDistance * 0.78,
    );
  }
  resize() {
    this.aspect = innerWidth / innerHeight;
    this.updateProjectionMatrix();
  }
}
