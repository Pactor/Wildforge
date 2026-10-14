import * as THREE from 'three';
import { BLOCK, BLOCKS } from './blocks.js';
import { itemDefinition } from './inventory.js';
import { sanitizeDisplayItem } from './keepsakeFrames.js';

export const OUTFITTER_SLOTS = Object.freeze(['head', 'chest', 'legs', 'feet', 'shield', 'regalia']);
export const MAX_OUTFITTER_STANDS = 128;
const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const emptySlots = () => Object.fromEntries(OUTFITTER_SLOTS.map((slot) => [slot, null]));

export function outfitterSlotForItem(id) {
  const definition = itemDefinition(id);
  if (definition?.category === 'armor' && OUTFITTER_SLOTS.includes(definition.slot)) return definition.slot;
  if (definition?.category === 'shield') return 'shield';
  if (definition?.category === 'cosmetic') return 'regalia';
  return null;
}

function copyItem(item) {
  return item ? { ...item, enchantments: item.enchantments.map((entry) => ({ ...entry })) } : null;
}

export class OutfitterStandState {
  constructor(serialized = null) {
    this.records = new Map();
    for (const raw of (Array.isArray(serialized) ? serialized : []).slice(0, MAX_OUTFITTER_STANDS)) {
      if (!raw || ![raw.x, raw.y, raw.z].every(Number.isFinite)) continue;
      const slots = emptySlots();
      for (const slot of OUTFITTER_SLOTS) {
        const item = sanitizeDisplayItem(raw.slots?.[slot]);
        if (item && outfitterSlotForItem(item.id) === slot) slots[slot] = item;
      }
      const record = {
        x: Math.floor(raw.x), y: Math.floor(raw.y), z: Math.floor(raw.z), slots,
        selectedSlot: Math.max(0, Math.min(OUTFITTER_SLOTS.length - 1, Math.floor(Number(raw.selectedSlot) || 0))),
      };
      this.records.set(keyFor(record.x, record.y, record.z), record);
    }
  }

  get(x, y, z) { return this.records.get(keyFor(x, y, z)) || null; }

  ensure(x, y, z) {
    const key = keyFor(x, y, z);
    let record = this.records.get(key);
    if (record) return record;
    if (this.records.size >= MAX_OUTFITTER_STANDS) return null;
    record = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), slots: emptySlots(), selectedSlot: 0 };
    this.records.set(key, record);
    return record;
  }

  equip(x, y, z, instance) {
    const item = sanitizeDisplayItem(instance);
    const slot = item && outfitterSlotForItem(item.id);
    if (!slot) return null;
    const record = this.ensure(x, y, z);
    if (!record) return null;
    const previous = copyItem(record.slots[slot]);
    record.slots[slot] = item;
    record.selectedSlot = OUTFITTER_SLOTS.indexOf(slot);
    return { slot, previous, item: copyItem(item) };
  }

  take(x, y, z, slot = null) {
    const record = this.get(x, y, z);
    if (!record) return null;
    const target = slot || OUTFITTER_SLOTS[record.selectedSlot];
    if (!OUTFITTER_SLOTS.includes(target) || !record.slots[target]) return null;
    const item = copyItem(record.slots[target]);
    record.slots[target] = null;
    return { slot: target, item };
  }

  cycle(x, y, z) {
    const record = this.ensure(x, y, z);
    if (!record) return null;
    record.selectedSlot = (record.selectedSlot + 1) % OUTFITTER_SLOTS.length;
    return OUTFITTER_SLOTS[record.selectedSlot];
  }

  drain(x, y, z) {
    const key = keyFor(x, y, z);
    const record = this.records.get(key);
    if (!record) return [];
    this.records.delete(key);
    return OUTFITTER_SLOTS.flatMap((slot) => record.slots[slot] ? [copyItem(record.slots[slot])] : []);
  }

  blockChanged(x, y, z, previous, id) {
    return previous === BLOCK.OUTFITTER_STAND && id !== BLOCK.OUTFITTER_STAND ? this.drain(x, y, z) : [];
  }

  recoverStale(world) {
    const recovered = [];
    for (const record of [...this.records.values()]) {
      const key = keyFor(record.x, record.y, record.z);
      const liveId = world.edits instanceof Map ? (world.edits.get(key) ?? BLOCK.AIR) : world.getBlock(record.x, record.y, record.z);
      if (liveId === BLOCK.OUTFITTER_STAND) continue;
      for (const item of this.drain(record.x, record.y, record.z)) recovered.push({ x: record.x, y: record.y, z: record.z, item });
    }
    return recovered;
  }

  entries() { return [...this.records.values()]; }
  serialize() {
    return this.entries().map((record) => ({
      x: record.x, y: record.y, z: record.z, selectedSlot: record.selectedSlot,
      slots: Object.fromEntries(OUTFITTER_SLOTS.map((slot) => [slot, copyItem(record.slots[slot])])),
    }));
  }
}

export function detachUnsupportedOutfitterStand(world, supportX, supportY, supportZ) {
  const x = Math.floor(supportX); const y = Math.floor(supportY) + 1; const z = Math.floor(supportZ);
  if (world.getBlock(x, y, z) !== BLOCK.OUTFITTER_STAND) return null;
  if (BLOCKS[world.getBlock(x, y - 1, z)]?.solid) return null;
  world.setBlock(x, y, z, BLOCK.AIR);
  return { x, y, z, id: BLOCK.OUTFITTER_STAND };
}

function part(group, size, position, color, materialOptions = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshLambertMaterial({ color, flatShading: true, ...materialOptions }));
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function rune(group, y) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 4, 16), new THREE.MeshBasicMaterial({ color: 0xa68aff }));
  mesh.position.set(0, y, -0.27); mesh.rotation.x = Math.PI / 2; group.add(mesh);
}

function equippedModel(record) {
  const group = new THREE.Group();
  group.name = 'Outfitter Stand Equipment';
  const color = (slot) => itemDefinition(record.slots[slot]?.id)?.color || 0xb4936b;
  if (record.slots.regalia) {
    const definition = itemDefinition(record.slots.regalia.id);
    part(group, [0.62, 0.82, 0.06], [0, 0.92, 0.23], definition.cosmetic?.primary || color('regalia'));
    part(group, [0.5, 0.12, 0.065], [0, 0.86, 0.2], definition.cosmetic?.secondary || 0xead893);
  }
  if (record.slots.legs) {
    part(group, [0.22, 0.58, 0.28], [-0.16, 0.54, 0], color('legs'));
    part(group, [0.22, 0.58, 0.28], [0.16, 0.54, 0], color('legs'));
  }
  if (record.slots.feet) {
    part(group, [0.27, 0.22, 0.39], [-0.16, 0.2, -0.045], color('feet'));
    part(group, [0.27, 0.22, 0.39], [0.16, 0.2, -0.045], color('feet'));
  }
  if (record.slots.chest) {
    part(group, [0.68, 0.58, 0.4], [0, 1.05, 0], color('chest'));
    part(group, [0.23, 0.54, 0.28], [-0.43, 1.02, 0], color('chest'));
    part(group, [0.23, 0.54, 0.28], [0.43, 1.02, 0], color('chest'));
  }
  if (record.slots.head) part(group, [0.52, 0.46, 0.5], [0, 1.58, 0], color('head'));
  if (record.slots.shield) {
    part(group, [0.52, 0.7, 0.1], [-0.53, 0.85, -0.22], color('shield'));
    part(group, [0.08, 0.72, 0.13], [-0.53, 0.85, -0.25], 0xc2c8c5);
  }
  for (const [index, slot] of OUTFITTER_SLOTS.entries()) if (record.slots[slot]?.enchantments?.length) rune(group, 0.33 + index * 0.22);
  return group;
}

function dispose(group) {
  group.traverse((object) => { object.geometry?.dispose?.(); object.material?.dispose?.(); });
  group.removeFromParent();
}

export class OutfitterStandRenderer {
  constructor(scene, world, state) {
    this.world = world; this.state = state; this.meshes = new Map(); this.root = new THREE.Group();
    this.root.name = 'Outfitter Stand Displays'; scene.add(this.root); this.sync();
  }

  sync() {
    const wanted = new Set();
    for (const record of this.state.entries()) {
      const key = keyFor(record.x, record.y, record.z);
      const liveId = this.world.edits instanceof Map ? (this.world.edits.get(key) ?? BLOCK.AIR) : this.world.getBlock(record.x, record.y, record.z);
      if (liveId !== BLOCK.OUTFITTER_STAND) continue;
      wanted.add(key);
      if (this.meshes.has(key)) dispose(this.meshes.get(key));
      const model = equippedModel(record);
      model.position.set(record.x + 0.5, record.y, record.z + 0.5);
      this.root.add(model); this.meshes.set(key, model);
    }
    for (const [key, model] of [...this.meshes]) if (!wanted.has(key)) { dispose(model); this.meshes.delete(key); }
  }
}
