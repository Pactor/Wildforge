import { BLOCK, BLOCKS } from './blocks.js';
import { barrelKey, chestInfo, containerKey, funnelKey, isFunnelKey } from './storage.js';
import { WAYVAULT_STORAGE_KEY } from './wayvault.js';

export const MAX_FORGE_FUNNELS = 256;
export const FUNNEL_INTERVAL = 0.8;
export const FUNNEL_BLOCKS = Object.freeze([
  BLOCK.FORGE_FUNNEL_DOWN, BLOCK.FORGE_FUNNEL_N, BLOCK.FORGE_FUNNEL_E, BLOCK.FORGE_FUNNEL_S, BLOCK.FORGE_FUNNEL_W,
]);
export const FUNNEL_DIRECTIONS = Object.freeze({
  [BLOCK.FORGE_FUNNEL_DOWN]: Object.freeze([0, -1, 0]), [BLOCK.FORGE_FUNNEL_N]: Object.freeze([0, 0, -1]),
  [BLOCK.FORGE_FUNNEL_E]: Object.freeze([1, 0, 0]), [BLOCK.FORGE_FUNNEL_S]: Object.freeze([0, 0, 1]), [BLOCK.FORGE_FUNNEL_W]: Object.freeze([-1, 0, 0]),
});

const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const validTimer = (value) => Math.max(0, Math.min(FUNNEL_INTERVAL, Number(value) || 0));
export const isForgeFunnel = (id) => FUNNEL_BLOCKS.includes(Number(id));
export const funnelDirection = (id) => FUNNEL_DIRECTIONS[id] || FUNNEL_DIRECTIONS[BLOCK.FORGE_FUNNEL_DOWN];

export function funnelIdForSupport(position, supportPosition, yaw = 0) {
  if (position && supportPosition) {
    const dx = Math.floor(supportPosition.x) - Math.floor(position.x); const dy = Math.floor(supportPosition.y) - Math.floor(position.y); const dz = Math.floor(supportPosition.z) - Math.floor(position.z);
    if (dy < 0 || dy > 0) return BLOCK.FORGE_FUNNEL_DOWN;
    if (dx < 0) return BLOCK.FORGE_FUNNEL_W; if (dx > 0) return BLOCK.FORGE_FUNNEL_E;
    if (dz < 0) return BLOCK.FORGE_FUNNEL_N; if (dz > 0) return BLOCK.FORGE_FUNNEL_S;
  }
  const dx = -Math.sin(Number(yaw) || 0); const dz = -Math.cos(Number(yaw) || 0);
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? BLOCK.FORGE_FUNNEL_E : BLOCK.FORGE_FUNNEL_W;
  return dz > 0 ? BLOCK.FORGE_FUNNEL_S : BLOCK.FORGE_FUNNEL_N;
}

export function funnelBounds(id) {
  const [dx, dy, dz] = funnelDirection(id); const bounds = [
    [0.06, 0.7, 0.06, 0.18, 0.9, 0.94], [0.82, 0.7, 0.06, 0.94, 0.9, 0.94],
    [0.18, 0.7, 0.06, 0.82, 0.9, 0.18], [0.18, 0.7, 0.82, 0.82, 0.9, 0.94],
    [0.16, 0.38, 0.16, 0.84, 0.7, 0.84], [0.32, 0.18, 0.32, 0.68, 0.4, 0.68],
  ];
  if (dy < 0) bounds.push([0.4, 0, 0.4, 0.6, 0.2, 0.6]);
  else bounds.push(dx < 0 ? [0, 0.2, 0.4, 0.42, 0.38, 0.6] : dx > 0 ? [0.58, 0.2, 0.4, 1, 0.38, 0.6]
    : dz < 0 ? [0.4, 0.2, 0, 0.6, 0.38, 0.42] : [0.4, 0.2, 0.58, 0.6, 0.38, 1]);
  return bounds;
}

function parseFunnelKey(key) {
  if (!isFunnelKey(key)) return null;
  const values = String(key).slice(7).split(',').map(Number);
  return values.length === 3 && values.every(Number.isFinite) ? values.map(Math.floor) : null;
}

export class ForgeFunnelState {
  constructor(world, storage, furnaces, drops, serialized = null) {
    this.world = world; this.storage = storage; this.furnaces = furnaces; this.drops = drops; this.records = new Map();
    const source = Array.isArray(serialized) ? serialized : Array.isArray(serialized?.records) ? serialized.records : [];
    for (const raw of source.slice(0, MAX_FORGE_FUNNELS)) {
      if (!raw || ![raw.x, raw.y, raw.z].every(Number.isFinite)) continue;
      const record = { x: Math.floor(raw.x), y: Math.floor(raw.y), z: Math.floor(raw.z), timer: validTimer(raw.timer) };
      this.records.set(keyFor(record.x, record.y, record.z), record);
    }
  }

  ensure(x, y, z) {
    const key = keyFor(x, y, z); if (this.records.has(key)) return this.records.get(key);
    if (this.records.size >= MAX_FORGE_FUNNELS) return null;
    const record = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), timer: FUNNEL_INTERVAL };
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
    return null;
  }

  moveOne(sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return null;
    const entry = this.storage.entries(sourceKey).find(([id]) => this.storage.spaceFor(targetKey, id) > 0);
    if (!entry || !this.storage.deposit(targetKey, this.storage.get(sourceKey), entry[0], 1)) return null;
    return entry[0];
  }

  collectDrop(record, targetKey) {
    if (!this.drops?.items) return null;
    const item = this.drops.items.find((candidate) => {
      const position = candidate.mesh?.position;
      return position && position.x >= record.x && position.x <= record.x + 1 && position.z >= record.z && position.z <= record.z + 1
        && position.y >= record.y + 0.72 && position.y <= record.y + 1.72 && this.storage.spaceFor(targetKey, candidate.id) > 0;
    });
    if (!item) return null;
    const target = this.storage.get(targetKey);
    if (item.durability != null) target.addInstance(item.id, item.durability, item.enchantments);
    else target.add(item.id, 1);
    item.count -= 1; if (item.count <= 0) this.drops.remove(item);
    return item.id;
  }

  pullFromAbove(record, targetKey) {
    const x = record.x; const y = record.y + 1; const z = record.z; const id = this.world.getBlock(x, y, z);
    if (id === BLOCK.FURNACE || BLOCKS[id]?.furnaceMode) {
      const furnace = this.furnaces.get(containerKey(x, y, z)); const output = furnace.output;
      if (!output || this.storage.spaceFor(targetKey, output.id) <= 0) return null;
      return this.furnaces.withdraw(containerKey(x, y, z), this.storage.get(targetKey), 'output', 1) ? output.id : null;
    }
    return this.moveOne(this.containerAt(x, y, z), targetKey);
  }

  pushOutput(record, sourceKey) {
    const id = this.world.getBlock(record.x, record.y, record.z); const [dx, dy, dz] = funnelDirection(id);
    const x = record.x + dx; const y = record.y + dy; const z = record.z + dz; const targetId = this.world.getBlock(x, y, z);
    if (targetId === BLOCK.FURNACE || BLOCKS[targetId]?.furnaceMode) {
      const key = containerKey(x, y, z); const source = this.storage.get(sourceKey);
      const entry = this.storage.entries(sourceKey).find(([itemId]) => dy < 0 ? this.furnaces.acceptsInput(itemId, key) : this.furnaces.acceptsFuel(itemId));
      if (!entry) return null;
      return this.furnaces.deposit(key, source, dy < 0 ? 'input' : 'fuel', entry[0], 1) ? entry[0] : null;
    }
    return this.moveOne(sourceKey, this.containerAt(x, y, z));
  }

  tick(record) {
    if (!isForgeFunnel(this.world.getBlock(record.x, record.y, record.z))) return [];
    const key = funnelKey(record.x, record.y, record.z); const events = [];
    const collected = this.collectDrop(record, key); if (collected) events.push({ type: 'collect', id: collected, ...record });
    else {
      const pulled = this.pullFromAbove(record, key); if (pulled) events.push({ type: 'pull', id: pulled, ...record });
    }
    const pushed = this.pushOutput(record, key); if (pushed) events.push({ type: 'push', id: pushed, ...record });
    return events;
  }

  update(dt, playerPosition = null) {
    dt = Math.max(0, Math.min(1, Number(dt) || 0)); if (!dt) return [];
    const events = [];
    for (const record of this.records.values()) {
      if (playerPosition && Math.hypot(playerPosition.x - record.x, playerPosition.z - record.z) > 96) continue;
      record.timer -= dt; let guard = 0;
      while (record.timer <= 1e-6 && guard < 2) { events.push(...this.tick(record)); record.timer += FUNNEL_INTERVAL; guard += 1; }
    }
    return events;
  }

  blockChanged(x, y, z, previous, id) {
    if (isForgeFunnel(id)) { this.ensure(x, y, z); return []; }
    if (!isForgeFunnel(previous)) return [];
    this.records.delete(keyFor(x, y, z)); return this.storage.drainItems(funnelKey(x, y, z));
  }

  restore() {
    for (const [key, id] of this.world?.edits || []) if (isForgeFunnel(id)) this.ensure(...key.split(',').map(Number));
    const recovered = [];
    for (const record of [...this.records.values()]) {
      const key = keyFor(record.x, record.y, record.z); const liveId = this.world?.edits instanceof Map ? (this.world.edits.get(key) ?? BLOCK.AIR) : this.world.getBlock(record.x, record.y, record.z);
      if (isForgeFunnel(liveId)) continue;
      for (const item of this.storage.drainItems(funnelKey(record.x, record.y, record.z))) recovered.push({ ...item, x: record.x, y: record.y, z: record.z });
      this.records.delete(key);
    }
    for (const key of [...this.storage.containers.keys()]) {
      const position = parseFunnelKey(key); if (!position || this.records.has(keyFor(...position))) continue;
      for (const item of this.storage.drainItems(key)) recovered.push({ ...item, x: position[0], y: position[1], z: position[2] });
    }
    return recovered;
  }

  entries() { return [...this.records.values()]; }
  serialize() { return { records: this.entries().map((record) => ({ ...record })) }; }
}
