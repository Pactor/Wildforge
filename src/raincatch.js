import { BLOCK, BLOCKS } from './blocks.js';

export const MAX_RAINCATCH_BASINS = 256;
export const RAINCATCH_BASINS = Object.freeze([
  BLOCK.RAINCATCH_BASIN_0, BLOCK.RAINCATCH_BASIN_1, BLOCK.RAINCATCH_BASIN_2, BLOCK.RAINCATCH_BASIN_3,
]);
const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;

export function isRaincatchBasin(id) { return RAINCATCH_BASINS.includes(Number(id)); }
export function raincatchLevel(id) { return isRaincatchBasin(id) ? RAINCATCH_BASINS.indexOf(Number(id)) : null; }
export function raincatchBlock(level) { return RAINCATCH_BASINS[Math.max(0, Math.min(3, Math.floor(Number(level) || 0)))]; }

const WASHED_ITEMS = new Map([
  [BLOCK.MOSSWEAVE_SUN, BLOCK.MOSSWEAVE_NATURAL], [BLOCK.MOSSWEAVE_EMBER, BLOCK.MOSSWEAVE_NATURAL],
  [BLOCK.MOSSWEAVE_FROST, BLOCK.MOSSWEAVE_NATURAL], [BLOCK.MOSSWEAVE_HOLLOW, BLOCK.MOSSWEAVE_NATURAL],
  [BLOCK.MOSSWEAVE_CARPET_SUN, BLOCK.MOSSWEAVE_CARPET_NATURAL], [BLOCK.MOSSWEAVE_CARPET_EMBER, BLOCK.MOSSWEAVE_CARPET_NATURAL],
  [BLOCK.MOSSWEAVE_CARPET_FROST, BLOCK.MOSSWEAVE_CARPET_NATURAL], [BLOCK.MOSSWEAVE_CARPET_HOLLOW, BLOCK.MOSSWEAVE_CARPET_NATURAL],
  [BLOCK.TRAIL_BANNER_SUN, BLOCK.TRAIL_BANNER_NATURAL], [BLOCK.TRAIL_BANNER_EMBER, BLOCK.TRAIL_BANNER_NATURAL],
  [BLOCK.TRAIL_BANNER_FROST, BLOCK.TRAIL_BANNER_NATURAL], [BLOCK.TRAIL_BANNER_HOLLOW, BLOCK.TRAIL_BANNER_NATURAL],
]);
export function raincatchWashedItem(id) { return WASHED_ITEMS.get(Number(id)) ?? null; }

export class RaincatchState {
  constructor(serialized = null) {
    this.records = new Map();
    const source = Array.isArray(serialized) ? serialized : Array.isArray(serialized?.records) ? serialized.records : [];
    for (const raw of source.slice(0, MAX_RAINCATCH_BASINS)) {
      if (!raw || ![raw.x, raw.y, raw.z].every(Number.isFinite)) continue;
      const record = {
        x: Math.floor(raw.x), y: Math.floor(raw.y), z: Math.floor(raw.z),
        progress: Math.max(0, Math.min(0.999999, Number(raw.progress) || 0)),
      };
      this.records.set(keyFor(record.x, record.y, record.z), record);
    }
  }

  get(x, y, z) { return this.records.get(keyFor(x, y, z)) || null; }
  ensure(x, y, z) {
    const key = keyFor(x, y, z); const existing = this.records.get(key);
    if (existing) return existing;
    if (this.records.size >= MAX_RAINCATCH_BASINS) return null;
    const record = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), progress: 0 };
    this.records.set(key, record); return record;
  }
  blockChanged(x, y, z, previous, id) {
    const key = keyFor(x, y, z);
    if (isRaincatchBasin(previous) && !isRaincatchBasin(id)) return this.records.delete(key);
    if (isRaincatchBasin(id)) return this.ensure(x, y, z);
    return null;
  }
  restoreFromEdits(world) {
    if (!(world?.edits instanceof Map)) return 0;
    let restored = 0;
    for (const [key, id] of world.edits) {
      if (!isRaincatchBasin(id) || this.records.has(key) || this.records.size >= MAX_RAINCATCH_BASINS) continue;
      const coordinates = key.split(',').map(Number);
      if (coordinates.length !== 3 || !coordinates.every(Number.isFinite)) continue;
      this.ensure(...coordinates); restored += 1;
    }
    return restored;
  }
  recoverStale(world) {
    let removed = 0;
    for (const record of [...this.records.values()]) {
      const key = keyFor(record.x, record.y, record.z);
      const id = world.edits instanceof Map ? (world.edits.get(key) ?? BLOCK.AIR) : world.getBlock(record.x, record.y, record.z);
      if (!isRaincatchBasin(id)) { this.records.delete(key); removed += 1; }
    }
    return removed;
  }
  update(dt, world, options = {}) {
    const kind = options.weatherKind;
    if (kind !== 'rain' && kind !== 'storm') return [];
    const secondsPerLevel = kind === 'storm' ? 18 : 32;
    const changes = [];
    for (const record of [...this.records.values()]) {
      const recordKey = keyFor(record.x, record.y, record.z);
      const id = world.edits instanceof Map ? (world.edits.get(recordKey) ?? BLOCK.AIR) : world.getBlock(record.x, record.y, record.z);
      const level = raincatchLevel(id);
      if (level == null) { this.records.delete(keyFor(record.x, record.y, record.z)); continue; }
      if (level >= 3 || options.isActive?.(record.x, record.z) === false || options.isRaining?.(record.x, record.z) === false || options.isExposed?.(record.x, record.y, record.z) === false) continue;
      record.progress += Math.max(0, Number(dt) || 0) / secondsPerLevel;
      if (record.progress < 1) continue;
      record.progress -= 1;
      const next = raincatchBlock(level + 1); world.setBlock(record.x, record.y, record.z, next);
      const change = { x: record.x, y: record.y, z: record.z, level: level + 1, id: next };
      changes.push(change); options.onFill?.(change);
    }
    return changes;
  }
  entries() { return [...this.records.values()]; }
  serialize() { return { records: this.entries().map((record) => ({ ...record })) }; }
}

export function fillRaincatchFromPail(world, x, y, z) {
  const level = raincatchLevel(world.getBlock(x, y, z)); if (level == null || level >= 3) return null;
  world.setBlock(x, y, z, BLOCK.RAINCATCH_BASIN_3); return { previous: level, level: 3 };
}

export function collectRaincatchPail(world, x, y, z) {
  const level = raincatchLevel(world.getBlock(x, y, z)); if (level !== 3) return null;
  world.setBlock(x, y, z, BLOCK.RAINCATCH_BASIN_0); return { previous: 3, level: 0 };
}

export function washRaincatchItem(world, x, y, z, itemId) {
  const level = raincatchLevel(world.getBlock(x, y, z)); const result = raincatchWashedItem(itemId);
  if (level == null || level <= 0 || result == null) return null;
  world.setBlock(x, y, z, raincatchBlock(level - 1)); return { input: Number(itemId), output: result, previous: level, level: level - 1 };
}

export function detachUnsupportedRaincatch(world, supportX, supportY, supportZ) {
  const x = Math.floor(supportX); const y = Math.floor(supportY) + 1; const z = Math.floor(supportZ);
  if (!isRaincatchBasin(world.getBlock(x, y, z)) || BLOCKS[world.getBlock(x, y - 1, z)]?.solid) return null;
  world.setBlock(x, y, z, BLOCK.AIR); return { x, y, z, id: BLOCK.RAINCATCH_BASIN_0 };
}
