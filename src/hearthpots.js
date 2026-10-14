import * as THREE from 'three';
import { BLOCK, BLOCKS } from './blocks.js';

export const MAX_HEARTHPOTS = 256;
export const HEARTHPOT_PLANTS = Object.freeze([
  BLOCK.SUNPETAL, BLOCK.EMBERBELL, BLOCK.DUSKMUSHROOM, BLOCK.LUMEN_BLOOM,
  BLOCK.OAK_SAPLING, BLOCK.FROSTPINE_SAPLING, BLOCK.ASHCAP,
]);
const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;

export function isHearthpotPlant(id) { return HEARTHPOT_PLANTS.includes(Number(id)); }

export class HearthpotState {
  constructor(serialized = null) {
    this.records = new Map();
    for (const raw of (Array.isArray(serialized) ? serialized : []).slice(0, MAX_HEARTHPOTS)) {
      if (!raw || ![raw.x, raw.y, raw.z].every(Number.isFinite) || !isHearthpotPlant(raw.plant)) continue;
      const record = { x: Math.floor(raw.x), y: Math.floor(raw.y), z: Math.floor(raw.z), plant: Number(raw.plant) };
      this.records.set(keyFor(record.x, record.y, record.z), record);
    }
  }

  get(x, y, z) { return this.records.get(keyFor(x, y, z)) || null; }

  plant(x, y, z, id) {
    const key = keyFor(x, y, z);
    if (!isHearthpotPlant(id) || this.records.has(key) || this.records.size >= MAX_HEARTHPOTS) return false;
    this.records.set(key, { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), plant: Number(id) });
    return true;
  }

  take(x, y, z) {
    const key = keyFor(x, y, z); const record = this.records.get(key);
    if (!record) return null;
    this.records.delete(key); return record.plant;
  }

  blockChanged(x, y, z, previous, id) {
    return previous === BLOCK.HEARTHPOT && id !== BLOCK.HEARTHPOT ? this.take(x, y, z) : null;
  }

  recoverStale(world) {
    const recovered = [];
    for (const record of [...this.records.values()]) {
      const key = keyFor(record.x, record.y, record.z);
      const liveId = world.edits instanceof Map ? (world.edits.get(key) ?? BLOCK.AIR) : world.getBlock(record.x, record.y, record.z);
      if (liveId === BLOCK.HEARTHPOT) continue;
      const plant = this.take(record.x, record.y, record.z);
      if (plant != null) recovered.push({ x: record.x, y: record.y, z: record.z, plant });
    }
    return recovered;
  }

  entries() { return [...this.records.values()]; }
  serialize() { return this.entries().map((record) => ({ ...record })); }
}

export function detachUnsupportedHearthpot(world, supportX, supportY, supportZ) {
  const x = Math.floor(supportX); const y = Math.floor(supportY) + 1; const z = Math.floor(supportZ);
  if (world.getBlock(x, y, z) !== BLOCK.HEARTHPOT || BLOCKS[world.getBlock(x, y - 1, z)]?.solid) return null;
  world.setBlock(x, y, z, BLOCK.AIR);
  return { x, y, z, id: BLOCK.HEARTHPOT };
}

function part(group, geometry, color, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  mesh.position.set(...position); mesh.rotation.set(...rotation); group.add(mesh); return mesh;
}

function plantModel(id) {
  const group = new THREE.Group(); const definition = BLOCKS[id]; const color = definition?.color || 0x65a45a;
  group.name = `Potted ${definition?.name || 'Plant'}`;
  if ([BLOCK.DUSKMUSHROOM, BLOCK.ASHCAP].includes(id)) {
    part(group, new THREE.BoxGeometry(0.09, 0.3, 0.09), 0xd8c6a7, [0, 0.55, 0]);
    part(group, new THREE.CylinderGeometry(0.25, 0.12, 0.18, 6), color, [0, 0.75, 0]);
  } else if ([BLOCK.OAK_SAPLING, BLOCK.FROSTPINE_SAPLING].includes(id)) {
    part(group, new THREE.BoxGeometry(0.09, 0.48, 0.09), 0x765035, [0, 0.62, 0]);
    for (const [x, y, z, scale] of [[0, 0.91, 0, 0.28], [-0.16, 0.76, 0, 0.2], [0.16, 0.72, 0.03, 0.22]]) {
      part(group, new THREE.OctahedronGeometry(scale, 0), color, [x, y, z]);
    }
  } else {
    part(group, new THREE.BoxGeometry(0.07, 0.5, 0.07), 0x4f8c45, [0, 0.65, 0]);
    for (let index = 0; index < 5; index += 1) {
      const angle = index * Math.PI * 2 / 5;
      part(group, new THREE.BoxGeometry(0.2, 0.1, 0.05), color, [Math.cos(angle) * 0.13, 0.91 + Math.sin(angle) * 0.04, Math.sin(angle) * 0.13], [0, -angle, angle * 0.2]);
    }
    part(group, new THREE.BoxGeometry(0.13, 0.13, 0.1), id === BLOCK.LUMEN_BLOOM ? 0x8ffff2 : 0xe6b84e, [0, 0.91, 0]);
  }
  return group;
}

function dispose(group) {
  group.traverse((object) => { object.geometry?.dispose?.(); object.material?.dispose?.(); }); group.removeFromParent();
}

export class HearthpotRenderer {
  constructor(scene, world, state) {
    this.world = world; this.state = state; this.meshes = new Map(); this.root = new THREE.Group();
    this.root.name = 'Hearthpot Plants'; scene.add(this.root); this.sync();
  }
  sync() {
    const wanted = new Set();
    for (const record of this.state.entries()) {
      const key = keyFor(record.x, record.y, record.z);
      const liveId = this.world.edits instanceof Map ? (this.world.edits.get(key) ?? BLOCK.AIR) : this.world.getBlock(record.x, record.y, record.z);
      if (liveId !== BLOCK.HEARTHPOT) continue;
      wanted.add(key); if (this.meshes.has(key)) dispose(this.meshes.get(key));
      const model = plantModel(record.plant); model.position.set(record.x + 0.5, record.y, record.z + 0.5);
      this.root.add(model); this.meshes.set(key, model);
    }
    for (const [key, model] of [...this.meshes]) if (!wanted.has(key)) { dispose(model); this.meshes.delete(key); }
  }
}
