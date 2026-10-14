import * as THREE from 'three';
import { BLOCKS } from './blocks.js';

const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;

export class PlacedLightManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.root = new THREE.Group();
    this.root.name = 'Placed Lights';
    this.scene.add(this.root);
    this.lights = new Map();
    for (const [key, id] of world.edits || []) {
      if (!BLOCKS[id]?.light) continue;
      const [x, y, z] = key.split(',').map(Number);
      this.add(x, y, z, id);
    }
  }

  add(x, y, z, id, generated = false) {
    const definition = BLOCKS[id];
    if (!definition?.light) return null;
    const key = keyFor(x, y, z);
    this.remove(x, y, z);
    const settings = definition.light;
    const light = new THREE.PointLight(settings.color, settings.intensity, settings.distance, 2);
    light.position.set(Math.floor(x) + 0.5, Math.floor(y) + (settings.height ?? 0.7), Math.floor(z) + 0.5);
    light.userData.blockId = id;
    light.userData.generated = generated;
    this.root.add(light);
    this.lights.set(key, light);
    return light;
  }

  remove(x, y, z) {
    const key = keyFor(x, y, z);
    const light = this.lights.get(key);
    if (!light) return false;
    this.root.remove(light);
    this.lights.delete(key);
    return true;
  }

  blockChanged(x, y, z, id) {
    if (BLOCKS[id]?.light) this.add(x, y, z, id);
    else this.remove(x, y, z);
  }

  setIntensity(x, y, z, multiplier = 1) {
    const light = this.lights.get(keyFor(x, y, z));
    if (!light) return false;
    const base = BLOCKS[light.userData.blockId]?.light?.intensity;
    if (!Number.isFinite(base)) return false;
    light.intensity = base * Math.max(0, Math.min(2, Number(multiplier) || 0));
    return true;
  }

  syncGenerated(positions) {
    const desired = new Set();
    for (const position of positions || []) {
      const key = keyFor(position.x, position.y, position.z);
      const id = this.world.getBlock(position.x, position.y, position.z);
      if (!BLOCKS[id]?.light) continue;
      desired.add(key);
      if (!this.lights.has(key)) this.add(position.x, position.y, position.z, id, true);
    }
    for (const [key, light] of [...this.lights]) {
      if (light.userData.generated && !desired.has(key)) this.remove(...key.split(',').map(Number));
    }
    return desired.size;
  }
}
