import * as THREE from 'three';
import { BLOCK, BLOCKS } from './blocks.js';
import { itemDefinition } from './inventory.js';

export const MAX_KEEPSAKE_FRAMES = 256;

const IDS = Object.freeze({
  n: BLOCK.KEEPSAKE_FRAME_N,
  e: BLOCK.KEEPSAKE_FRAME_E,
  s: BLOCK.KEEPSAKE_FRAME_S,
  w: BLOCK.KEEPSAKE_FRAME_W,
});
const OFFSETS = Object.freeze({
  n: Object.freeze({ x: 0, z: -1 }),
  e: Object.freeze({ x: 1, z: 0 }),
  s: Object.freeze({ x: 0, z: 1 }),
  w: Object.freeze({ x: -1, z: 0 }),
});
const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;

export function isKeepsakeFrame(id) { return Boolean(BLOCKS[id]?.keepsakeFrame); }

export function keepsakeFrameInfo(id) {
  const facing = BLOCKS[id]?.frameFacing;
  return facing ? { orientation: facing, support: OFFSETS[facing] } : null;
}

export function keepsakeFrameIdForSupport(position, support, fallbackYaw = 0) {
  if (position && support) {
    const dx = Math.floor(support.x) - Math.floor(position.x);
    const dz = Math.floor(support.z) - Math.floor(position.z);
    if (Math.abs(dx) + Math.abs(dz) === 1) return dx < 0 ? IDS.w : dx > 0 ? IDS.e : dz < 0 ? IDS.n : IDS.s;
  }
  const dx = -Math.sin(Number(fallbackYaw) || 0);
  const dz = -Math.cos(Number(fallbackYaw) || 0);
  return Math.abs(dx) > Math.abs(dz) ? IDS[dx > 0 ? 'w' : 'e'] : IDS[dz > 0 ? 'n' : 's'];
}

export function canPlaceKeepsakeFrame(world, x, y, z, id) {
  const info = keepsakeFrameInfo(id);
  if (!info || world.getBlock(x, y, z) !== BLOCK.AIR) return false;
  const support = BLOCKS[world.getBlock(x + info.support.x, y, z + info.support.z)];
  return Boolean(support?.solid && !support.transparent && !support.keepsakeFrame);
}

export function placeKeepsakeFrame(world, x, y, z, id) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  if (!canPlaceKeepsakeFrame(world, x, y, z, id)) return false;
  world.setBlock(x, y, z, id);
  return true;
}

export function detachUnsupportedKeepsakeFrames(world, supportX, supportY, supportZ) {
  const removed = [];
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const x = Math.floor(supportX) + dx;
    const y = Math.floor(supportY);
    const z = Math.floor(supportZ) + dz;
    const id = world.getBlock(x, y, z);
    const info = keepsakeFrameInfo(id);
    if (!info || x + info.support.x !== Math.floor(supportX) || z + info.support.z !== Math.floor(supportZ)) continue;
    const support = BLOCKS[world.getBlock(supportX, supportY, supportZ)];
    if (support?.solid && !support.transparent) continue;
    world.setBlock(x, y, z, BLOCK.AIR);
    removed.push({ x, y, z, id });
  }
  return removed;
}

export function sanitizeDisplayItem(raw) {
  if (!raw || itemDefinition(raw.id) == null) return null;
  const definition = itemDefinition(raw.id);
  const durability = definition.durability && Number.isFinite(raw.durability)
    ? Math.max(1, Math.min(definition.durability, Math.floor(raw.durability))) : null;
  const enchantments = definition.durability && Array.isArray(raw.enchantments)
    ? raw.enchantments.slice(0, 4).filter((entry) => typeof entry?.id === 'string' && entry.id.length <= 32 && Number.isFinite(entry.level))
      .map((entry) => ({ id: entry.id, level: Math.max(1, Math.min(3, Math.floor(entry.level))) })) : [];
  return { id: raw.id, durability, enchantments };
}

export class KeepsakeFrameState {
  constructor(serialized = null) {
    this.records = new Map();
    for (const raw of (Array.isArray(serialized) ? serialized : []).slice(0, MAX_KEEPSAKE_FRAMES)) {
      if (!raw || ![raw.x, raw.y, raw.z].every(Number.isFinite)) continue;
      const item = sanitizeDisplayItem(raw.item);
      if (!item) continue;
      const record = { x: Math.floor(raw.x), y: Math.floor(raw.y), z: Math.floor(raw.z), item, rotation: Math.max(0, Math.min(7, Math.floor(Number(raw.rotation) || 0))) };
      this.records.set(keyFor(record.x, record.y, record.z), record);
    }
  }

  get(x, y, z) { return this.records.get(keyFor(x, y, z)) || null; }

  insert(x, y, z, instance) {
    const key = keyFor(x, y, z);
    const item = sanitizeDisplayItem(instance);
    if (!item || this.records.has(key) || this.records.size >= MAX_KEEPSAKE_FRAMES) return null;
    const record = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), item, rotation: 0 };
    this.records.set(key, record);
    return record;
  }

  take(x, y, z) {
    const key = keyFor(x, y, z);
    const record = this.records.get(key);
    if (!record) return null;
    this.records.delete(key);
    return { ...record.item, enchantments: record.item.enchantments.map((entry) => ({ ...entry })) };
  }

  rotate(x, y, z) {
    const record = this.get(x, y, z);
    if (!record) return null;
    record.rotation = (record.rotation + 1) % 8;
    return record.rotation;
  }

  blockChanged(x, y, z, previous, id) {
    if (!isKeepsakeFrame(previous) || isKeepsakeFrame(id)) return null;
    return this.take(x, y, z);
  }

  recoverStale(world) {
    const recovered = [];
    if (!world || typeof world.getBlock !== 'function') return recovered;
    for (const record of [...this.records.values()]) {
      const key = keyFor(record.x, record.y, record.z);
      const liveId = world.edits instanceof Map ? (world.edits.get(key) ?? BLOCK.AIR) : world.getBlock(record.x, record.y, record.z);
      if (isKeepsakeFrame(liveId)) continue;
      const item = this.take(record.x, record.y, record.z);
      if (item) recovered.push({ x: record.x, y: record.y, z: record.z, item });
    }
    return recovered;
  }

  entries() { return [...this.records.values()]; }
  serialize() {
    return this.entries().map((record) => ({ x: record.x, y: record.y, z: record.z, rotation: record.rotation, item: { ...record.item, enchantments: record.item.enchantments.map((entry) => ({ ...entry })) } }));
  }
}

function disposeGroup(group) {
  group.traverse((object) => {
    object.geometry?.dispose?.();
    object.material?.dispose?.();
  });
  group.removeFromParent();
}

function addPart(group, geometry, color, position) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function itemModel(item) {
  const definition = itemDefinition(item.id);
  const group = new THREE.Group();
  group.name = `Displayed ${definition.name}`;
  const color = definition.color || 0xd8d1bd;
  if (definition.category === 'tool' || definition.category === 'weapon') {
    const shaft = addPart(group, new THREE.BoxGeometry(0.08, 0.42, 0.06), 0x765137, [0, -0.03, 0]);
    shaft.rotation.z = -0.42;
    const head = addPart(group, new THREE.BoxGeometry(definition.category === 'weapon' ? 0.1 : 0.3, 0.22, 0.07), color, [0.1, 0.16, 0]);
    head.rotation.z = -0.42;
  } else if (Number.isInteger(Number(item.id))) {
    addPart(group, new THREE.BoxGeometry(0.32, 0.32, 0.12), color, [0, 0, 0]);
  } else if (definition.category === 'food') {
    addPart(group, new THREE.DodecahedronGeometry(0.2, 0), color, [0, 0, 0]);
  } else {
    const plaque = addPart(group, new THREE.BoxGeometry(0.3, 0.3, 0.07), color, [0, 0, 0]);
    plaque.rotation.z = Math.PI / 4;
  }
  if (item.enchantments.length) addPart(group, new THREE.TorusGeometry(0.24, 0.025, 4, 16), 0x9c7be8, [0, 0, -0.02]);
  return group;
}

export class KeepsakeFrameRenderer {
  constructor(scene, world, state) {
    this.world = world;
    this.state = state;
    this.root = new THREE.Group();
    this.root.name = 'Keepsake Frame Displays';
    this.meshes = new Map();
    scene.add(this.root);
    this.sync();
  }

  sync() {
    const wanted = new Set();
    for (const record of this.state.entries()) {
      const key = keyFor(record.x, record.y, record.z);
      const liveId = this.world.edits instanceof Map ? (this.world.edits.get(key) ?? BLOCK.AIR) : this.world.getBlock(record.x, record.y, record.z);
      const info = keepsakeFrameInfo(liveId);
      if (!info) continue;
      wanted.add(key);
      if (this.meshes.has(key)) disposeGroup(this.meshes.get(key));
      const display = itemModel(record.item);
      display.position.set(record.x + 0.5, record.y + 0.5, record.z + 0.5);
      if (info.orientation === 'n') display.position.z = record.z + 0.13;
      if (info.orientation === 's') { display.position.z = record.z + 0.87; display.rotation.y = Math.PI; }
      if (info.orientation === 'w') { display.position.x = record.x + 0.13; display.rotation.y = Math.PI / 2; }
      if (info.orientation === 'e') { display.position.x = record.x + 0.87; display.rotation.y = -Math.PI / 2; }
      display.rotateZ(record.rotation * Math.PI / 4);
      this.root.add(display);
      this.meshes.set(key, display);
    }
    for (const [key, display] of [...this.meshes]) {
      if (wanted.has(key)) continue;
      disposeGroup(display);
      this.meshes.delete(key);
    }
  }
}
