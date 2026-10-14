import * as THREE from 'three';
import { BLOCK, BLOCKS } from './blocks.js';
import { isForgeFunnel } from './funnels.js';
import { itemDefinition } from './inventory.js';
import { barrelKey, chestInfo, containerKey, ejectorKey, funnelKey, isEjectorKey } from './storage.js';
import { WAYVAULT_STORAGE_KEY } from './wayvault.js';

export const MAX_FORGE_EJECTORS = 256;
export const EJECTOR_OFF = Object.freeze([
  BLOCK.FORGE_EJECTOR_N_OFF, BLOCK.FORGE_EJECTOR_E_OFF, BLOCK.FORGE_EJECTOR_S_OFF,
  BLOCK.FORGE_EJECTOR_W_OFF, BLOCK.FORGE_EJECTOR_UP_OFF, BLOCK.FORGE_EJECTOR_DOWN_OFF,
]);
export const EJECTOR_ON = Object.freeze([
  BLOCK.FORGE_EJECTOR_N_ON, BLOCK.FORGE_EJECTOR_E_ON, BLOCK.FORGE_EJECTOR_S_ON,
  BLOCK.FORGE_EJECTOR_W_ON, BLOCK.FORGE_EJECTOR_UP_ON, BLOCK.FORGE_EJECTOR_DOWN_ON,
]);
export const EJECTOR_BLOCKS = Object.freeze([...EJECTOR_OFF, ...EJECTOR_ON]);

const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
export const isForgeEjector = (id) => EJECTOR_BLOCKS.includes(Number(id));
export const ejectorDirection = (id) => BLOCKS[id]?.circuitFacing || [0, 0, -1];
export const ejectorPoweredVariant = (id, powered) => {
  let index = EJECTOR_OFF.indexOf(Number(id));
  if (index < 0) index = EJECTOR_ON.indexOf(Number(id));
  return index < 0 ? Number(id) : (powered ? EJECTOR_ON : EJECTOR_OFF)[index];
};

export function ejectorIdForSupport(position, supportPosition, yaw = 0, powered = false) {
  let index = -1;
  if (position && supportPosition) {
    const dx = Math.floor(supportPosition.x) - Math.floor(position.x);
    const dy = Math.floor(supportPosition.y) - Math.floor(position.y);
    const dz = Math.floor(supportPosition.z) - Math.floor(position.z);
    if (dy > 0) index = 4;
    else if (dy < 0) index = 5;
    else if (dx > 0) index = 1;
    else if (dx < 0) index = 3;
    else if (dz > 0) index = 2;
    else if (dz < 0) index = 0;
  }
  if (index < 0) {
    const dx = -Math.sin(Number(yaw) || 0); const dz = -Math.cos(Number(yaw) || 0);
    index = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : (dz > 0 ? 2 : 0);
  }
  return (powered ? EJECTOR_ON : EJECTOR_OFF)[index];
}

export function ejectorBounds(id) {
  const [dx, dy, dz] = ejectorDirection(id);
  const bounds = [[0.04, 0.04, 0.04, 0.96, 0.96, 0.96], [0.12, 0.12, 0.12, 0.88, 0.88, 0.88]];
  if (dx < 0) bounds.push([0, 0.28, 0.28, 0.12, 0.72, 0.72], [0, 0.4, 0.4, 0.035, 0.6, 0.6]);
  else if (dx > 0) bounds.push([0.88, 0.28, 0.28, 1, 0.72, 0.72], [0.965, 0.4, 0.4, 1, 0.6, 0.6]);
  else if (dy < 0) bounds.push([0.28, 0, 0.28, 0.72, 0.12, 0.72], [0.4, 0, 0.4, 0.6, 0.035, 0.6]);
  else if (dy > 0) bounds.push([0.28, 0.88, 0.28, 0.72, 1, 0.72], [0.4, 0.965, 0.4, 0.6, 1, 0.6]);
  else if (dz < 0) bounds.push([0.28, 0.28, 0, 0.72, 0.72, 0.12], [0.4, 0.4, 0, 0.6, 0.6, 0.035]);
  else bounds.push([0.28, 0.28, 0.88, 0.72, 0.72, 1], [0.4, 0.4, 0.965, 0.6, 0.6, 1]);
  return bounds;
}

function parseEjectorKey(key) {
  if (!isEjectorKey(key)) return null;
  const values = String(key).slice(8).split(',').map(Number);
  return values.length === 3 && values.every(Number.isFinite) ? values.map(Math.floor) : null;
}

export class ForgeEjectorState {
  constructor(world, storage, furnaces, drops, serialized = null) {
    this.world = world; this.storage = storage; this.furnaces = furnaces; this.drops = drops; this.records = new Map();
    const source = Array.isArray(serialized) ? serialized : Array.isArray(serialized?.records) ? serialized.records : [];
    for (const raw of source.slice(0, MAX_FORGE_EJECTORS)) {
      if (!raw || ![raw.x, raw.y, raw.z].every(Number.isFinite)) continue;
      const record = { x: Math.floor(raw.x), y: Math.floor(raw.y), z: Math.floor(raw.z), pulse: Math.max(0, Math.min(1_000_000, Math.floor(Number(raw.pulse) || 0))) };
      this.records.set(keyFor(record.x, record.y, record.z), record);
    }
  }

  ensure(x, y, z) {
    const key = keyFor(x, y, z); if (this.records.has(key)) return this.records.get(key);
    if (this.records.size >= MAX_FORGE_EJECTORS) return null;
    const record = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), pulse: 0 };
    this.records.set(key, record); return record;
  }

  containerAt(x, y, z) {
    const id = this.world.getBlock(x, y, z);
    if (id === BLOCK.CHEST) {
      const info = chestInfo(this.world, x, y, z);
      for (const member of info.members) {
        const loot = this.world.generatedContainerLoot?.(member.x, member.y, member.z);
        if (loot) this.storage.seedGenerated(containerKey(member.x, member.y, member.z), loot.items, loot.key);
      }
      return this.storage.prepare(info);
    }
    if (BLOCKS[id]?.storageContainer === 'barrel') return barrelKey(x, y, z);
    if (BLOCKS[id]?.wayvault) return WAYVAULT_STORAGE_KEY;
    if (isForgeFunnel(id)) return funnelKey(x, y, z);
    if (isForgeEjector(id)) return ejectorKey(x, y, z);
    return null;
  }

  activate(x, y, z) {
    const id = this.world.getBlock(x, y, z); if (!isForgeEjector(id)) return null;
    const record = this.ensure(x, y, z); if (!record) return null;
    const sourceKey = ejectorKey(x, y, z); const source = this.storage.get(sourceKey); const entries = this.storage.entries(sourceKey);
    if (!entries.length) return { type: 'empty', x, y, z };
    const entry = entries[record.pulse % entries.length]; record.pulse = (record.pulse + 1) % 1_000_001;
    const itemId = entry[0]; const [dx, dy, dz] = ejectorDirection(id); const tx = x + dx; const ty = y + dy; const tz = z + dz;
    const targetId = this.world.getBlock(tx, ty, tz); const targetKey = this.containerAt(tx, ty, tz);
    if (targetKey && this.storage.deposit(targetKey, source, itemId, 1)) return { type: 'transfer', id: itemId, x, y, z, target: [tx, ty, tz] };
    if (targetId === BLOCK.FURNACE || BLOCKS[targetId]?.furnaceMode) {
      const slot = dy === 0 ? 'fuel' : 'input';
      if (this.furnaces.deposit(containerKey(tx, ty, tz), source, slot, itemId, 1)) return { type: 'transfer', id: itemId, x, y, z, target: [tx, ty, tz] };
    }
    let item;
    if (itemDefinition(itemId)?.durability) item = source.takeInstance(itemId);
    else if (source.remove(itemId, 1)) item = { id: itemId, count: 1 };
    if (!item) return null;
    const position = new THREE.Vector3(x + 0.5 + dx * 0.58, y + 0.5 + dy * 0.58, z + 0.5 + dz * 0.58);
    const velocity = [dx * 4.2, dy * 4.2 + (dy === 0 ? 0.85 : 0), dz * 4.2];
    const spawned = this.drops?.spawn?.(item.id, 1, position, item.durability, item.enchantments, { velocity, baseY: position.y, age: 0 });
    if (!spawned) {
      if (item.durability != null) source.addInstance(item.id, item.durability, item.enchantments);
      else source.add(item.id, 1);
      return null;
    }
    return { type: 'eject', id: item.id, x, y, z, target: [tx, ty, tz] };
  }

  blockChanged(x, y, z, previous, id) {
    if (isForgeEjector(id)) { this.ensure(x, y, z); return []; }
    if (!isForgeEjector(previous)) return [];
    this.records.delete(keyFor(x, y, z)); return this.storage.drainItems(ejectorKey(x, y, z));
  }

  restore() {
    for (const [key, id] of this.world?.edits || []) if (isForgeEjector(id)) this.ensure(...key.split(',').map(Number));
    const recovered = [];
    for (const record of [...this.records.values()]) {
      const key = keyFor(record.x, record.y, record.z);
      const liveId = this.world?.edits instanceof Map ? (this.world.edits.get(key) ?? BLOCK.AIR) : this.world.getBlock(record.x, record.y, record.z);
      if (isForgeEjector(liveId)) continue;
      for (const item of this.storage.drainItems(ejectorKey(record.x, record.y, record.z))) recovered.push({ ...item, x: record.x, y: record.y, z: record.z });
      this.records.delete(key);
    }
    for (const key of [...this.storage.containers.keys()]) {
      const position = parseEjectorKey(key); if (!position || this.records.has(keyFor(...position))) continue;
      for (const item of this.storage.drainItems(key)) recovered.push({ ...item, x: position[0], y: position[1], z: position[2] });
    }
    return recovered;
  }

  entries() { return [...this.records.values()]; }
  serialize() { return { records: this.entries().map((record) => ({ ...record })) }; }
}
