import * as THREE from 'three';
import { BLOCK, BLOCKS } from './blocks.js';
import { itemDefinition } from './inventory.js';
import { dispenserKey, isDispenserKey } from './storage.js';

export const MAX_RUNE_DISPENSERS = 256;
export const DISPENSER_OFF = Object.freeze([
  BLOCK.RUNE_DISPENSER_N_OFF, BLOCK.RUNE_DISPENSER_E_OFF, BLOCK.RUNE_DISPENSER_S_OFF,
  BLOCK.RUNE_DISPENSER_W_OFF, BLOCK.RUNE_DISPENSER_UP_OFF, BLOCK.RUNE_DISPENSER_DOWN_OFF,
]);
export const DISPENSER_ON = Object.freeze([
  BLOCK.RUNE_DISPENSER_N_ON, BLOCK.RUNE_DISPENSER_E_ON, BLOCK.RUNE_DISPENSER_S_ON,
  BLOCK.RUNE_DISPENSER_W_ON, BLOCK.RUNE_DISPENSER_UP_ON, BLOCK.RUNE_DISPENSER_DOWN_ON,
]);
export const DISPENSER_BLOCKS = Object.freeze([...DISPENSER_OFF, ...DISPENSER_ON]);

const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
export const isRuneDispenser = (id) => DISPENSER_BLOCKS.includes(Number(id));
export const dispenserDirection = (id) => BLOCKS[id]?.circuitFacing || [0, 0, -1];

export function dispenserIdForSupport(position, supportPosition, yaw = 0, powered = false) {
  let index = -1;
  if (position && supportPosition) {
    const dx = Math.floor(supportPosition.x) - Math.floor(position.x); const dy = Math.floor(supportPosition.y) - Math.floor(position.y); const dz = Math.floor(supportPosition.z) - Math.floor(position.z);
    if (dy > 0) index = 4; else if (dy < 0) index = 5; else if (dx > 0) index = 1; else if (dx < 0) index = 3; else if (dz > 0) index = 2; else if (dz < 0) index = 0;
  }
  if (index < 0) {
    const dx = -Math.sin(Number(yaw) || 0); const dz = -Math.cos(Number(yaw) || 0);
    index = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : (dz > 0 ? 2 : 0);
  }
  return (powered ? DISPENSER_ON : DISPENSER_OFF)[index];
}

export function dispenserBounds(id) {
  const [dx, dy, dz] = dispenserDirection(id); const bounds = [
    [0.03, 0.03, 0.03, 0.97, 0.97, 0.97], [0.08, 0.16, 0.08, 0.92, 0.24, 0.92], [0.08, 0.76, 0.08, 0.92, 0.84, 0.92],
  ];
  if (dx < 0) bounds.push([0, 0.25, 0.25, 0.11, 0.75, 0.75], [0, 0.39, 0.39, 0.025, 0.61, 0.61]);
  else if (dx > 0) bounds.push([0.89, 0.25, 0.25, 1, 0.75, 0.75], [0.975, 0.39, 0.39, 1, 0.61, 0.61]);
  else if (dy < 0) bounds.push([0.25, 0, 0.25, 0.75, 0.11, 0.75], [0.39, 0, 0.39, 0.61, 0.025, 0.61]);
  else if (dy > 0) bounds.push([0.25, 0.89, 0.25, 0.75, 1, 0.75], [0.39, 0.975, 0.39, 0.61, 1, 0.61]);
  else if (dz < 0) bounds.push([0.25, 0.25, 0, 0.75, 0.75, 0.11], [0.39, 0.39, 0, 0.61, 0.61, 0.025]);
  else bounds.push([0.25, 0.25, 0.89, 0.75, 0.75, 1], [0.39, 0.39, 0.975, 0.61, 0.61, 1]);
  return bounds;
}

function parseKey(key) {
  if (!isDispenserKey(key)) return null;
  const values = String(key).slice(10).split(',').map(Number);
  return values.length === 3 && values.every(Number.isFinite) ? values.map(Math.floor) : null;
}

export class RuneDispenserState {
  constructor(world, storage, drops, actions = {}, serialized = null) {
    this.world = world; this.storage = storage; this.drops = drops; this.actions = actions; this.records = new Map();
    const source = Array.isArray(serialized) ? serialized : Array.isArray(serialized?.records) ? serialized.records : [];
    for (const raw of source.slice(0, MAX_RUNE_DISPENSERS)) {
      if (!raw || ![raw.x, raw.y, raw.z].every(Number.isFinite)) continue;
      const record = { x: Math.floor(raw.x), y: Math.floor(raw.y), z: Math.floor(raw.z), pulse: Math.max(0, Math.min(1_000_000, Math.floor(Number(raw.pulse) || 0))) };
      this.records.set(keyFor(record.x, record.y, record.z), record);
    }
  }

  ensure(x, y, z) {
    const key = keyFor(x, y, z); if (this.records.has(key)) return this.records.get(key);
    if (this.records.size >= MAX_RUNE_DISPENSERS) return null;
    const record = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), pulse: 0 }; this.records.set(key, record); return record;
  }

  context(x, y, z, id) {
    const direction = dispenserDirection(id); const front = [x + direction[0], y + direction[1], z + direction[2]];
    return { x, y, z, id, direction, front, origin: new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5) };
  }

  activate(x, y, z) {
    const id = this.world.getBlock(x, y, z); if (!isRuneDispenser(id)) return null;
    const record = this.ensure(x, y, z); if (!record) return null;
    const key = dispenserKey(x, y, z); const source = this.storage.get(key); const entries = this.storage.entries(key);
    if (!entries.length) return { type: 'empty', x, y, z };
    const itemId = entries[record.pulse % entries.length][0]; record.pulse = (record.pulse + 1) % 1_000_001; const context = this.context(x, y, z, id);
    if (itemId === 'arrow' && this.actions.shootArrow?.(context) && source.remove(itemId, 1)) return { type: 'arrow', id: itemId, x, y, z, target: context.front };
    if ((itemId === 'water_pail' || itemId === 'lava_pail') && this.actions.pourFluid?.(itemId === 'lava_pail' ? 'lava' : 'water', context) && source.remove(itemId, 1)) {
      source.add('forged_pail', 1); return { type: 'fluid', id: itemId, x, y, z, target: context.front };
    }
    if (String(itemId) === String(BLOCK.BLAST_KEG) && this.actions.primeKeg?.(context) && source.remove(itemId, 1)) return { type: 'keg', id: itemId, x, y, z, target: context.front };
    if (itemId === 'spark_striker' && this.actions.ignite?.(context)) {
      const wear = source.damage(itemId, 1); if (wear) return { type: 'ignite', id: itemId, broke: wear.broke, x, y, z, target: context.front };
    }
    let item;
    if (itemDefinition(itemId)?.durability) item = source.takeInstance(itemId);
    else if (source.remove(itemId, 1)) item = { id: itemId, count: 1 };
    if (!item) return null;
    const [dx, dy, dz] = context.direction; const position = context.origin.clone().add(new THREE.Vector3(dx, dy, dz).multiplyScalar(0.58)); const velocity = [dx * 5.2, dy * 5.2 + (dy === 0 ? 0.7 : 0), dz * 5.2];
    const spawned = this.drops?.spawn?.(item.id, 1, position, item.durability, item.enchantments, { velocity, baseY: position.y, age: 0 });
    if (!spawned) {
      if (item.durability != null) source.addInstance(item.id, item.durability, item.enchantments); else source.add(item.id, 1);
      return null;
    }
    return { type: 'drop', id: item.id, x, y, z, target: context.front };
  }

  blockChanged(x, y, z, previous, id) {
    if (isRuneDispenser(id)) { this.ensure(x, y, z); return []; }
    if (!isRuneDispenser(previous)) return [];
    this.records.delete(keyFor(x, y, z)); return this.storage.drainItems(dispenserKey(x, y, z));
  }

  restore() {
    for (const [key, id] of this.world?.edits || []) if (isRuneDispenser(id)) this.ensure(...key.split(',').map(Number));
    const recovered = [];
    for (const record of [...this.records.values()]) {
      const key = keyFor(record.x, record.y, record.z); const liveId = this.world?.edits instanceof Map ? (this.world.edits.get(key) ?? BLOCK.AIR) : this.world.getBlock(record.x, record.y, record.z);
      if (isRuneDispenser(liveId)) continue;
      for (const item of this.storage.drainItems(dispenserKey(record.x, record.y, record.z))) recovered.push({ ...item, x: record.x, y: record.y, z: record.z });
      this.records.delete(key);
    }
    for (const key of [...this.storage.containers.keys()]) {
      const position = parseKey(key); if (!position || this.records.has(keyFor(...position))) continue;
      for (const item of this.storage.drainItems(key)) recovered.push({ ...item, x: position[0], y: position[1], z: position[2] });
    }
    return recovered;
  }

  entries() { return [...this.records.values()]; }
  serialize() { return { records: this.entries().map((record) => ({ ...record })) }; }
}
