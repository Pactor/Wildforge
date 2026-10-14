import { BLOCK, BLOCKS } from './blocks.js';
import { wayfarerSchedule } from './trading.js';

const TIER_BLOCKS = Object.freeze([
  BLOCK.CHARTER_POST_DORMANT,
  BLOCK.CHARTER_POST_CAMP,
  BLOCK.CHARTER_POST_STEAD,
  BLOCK.CHARTER_POST_FORGE,
]);

export const OUTPOST_TIERS = Object.freeze([
  { tier: 0, name: 'Dormant Charter' },
  { tier: 1, name: 'Trail Camp' },
  { tier: 2, name: 'Hearth Stead' },
  { tier: 3, name: 'Forge Outpost' },
]);

const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
export const isCharterPost = (id) => Boolean(BLOCKS[id]?.outpostPost);

function facilityKind(id) {
  const definition = BLOCKS[id];
  if (definition?.bed) return 'bed';
  if (id === BLOCK.CHEST) return 'chest';
  if (id === BLOCK.CRAFTING_TABLE) return 'table';
  if (id === BLOCK.FURNACE || definition?.furnaceMode) return 'furnace';
  if (definition?.campfire) return 'hearthfire';
  if ([BLOCK.FARMLAND, BLOCK.HYDRATED_FARMLAND].includes(id)) return 'farmland';
  if (definition?.model === 'forgeRail') return 'rail';
  if (definition?.circuitRole === 'freightStation') return 'freight';
  if (id === BLOCK.RUNEFORGE) return 'runeforge';
  return null;
}

export class OutpostState {
  constructor(world, serialized = null) {
    this.world = world;
    this.outposts = new Map();
    for (const record of serialized?.outposts || []) {
      if (!record || ![record.x, record.y, record.z].every(Number.isFinite)) continue;
      const tier = Math.max(1, Math.min(3, Math.floor(Number(record.tier) || 1)));
      const key = keyFor(record.x, record.y, record.z);
      this.outposts.set(key, { key, x: Math.floor(record.x), y: Math.floor(record.y), z: Math.floor(record.z), tier });
      this.world.setBlock(record.x, record.y, record.z, TIER_BLOCKS[tier]);
    }
  }

  entries() {
    return [...this.outposts.values()].map((record) => ({ ...record }));
  }

  recordAt(x, y, z) {
    return this.outposts.get(keyFor(x, y, z)) || null;
  }

  facilities(x, y, z, radius = 8) {
    const found = new Map();
    const counts = new Map();
    for (let oy = -2; oy <= 4; oy += 1) for (let oz = -radius; oz <= radius; oz += 1) for (let ox = -radius; ox <= radius; ox += 1) {
      const px = Math.floor(x) + ox;
      const py = Math.floor(y) + oy;
      const pz = Math.floor(z) + oz;
      const kind = facilityKind(this.world.getBlock(px, py, pz));
      if (!kind) continue;
      counts.set(kind, (counts.get(kind) || 0) + 1);
      if (!found.has(kind)) found.set(kind, { x: px + 0.5, y: py + 1, z: pz + 0.5 });
    }
    const bed = found.get('bed');
    let shelteredBed = false;
    if (bed) {
      const bx = Math.floor(bed.x);
      const by = Math.floor(bed.y);
      const bz = Math.floor(bed.z);
      for (let above = by + 1; above <= by + 4; above += 1) {
        const definition = BLOCKS[this.world.getBlock(bx, above, bz)];
        if (definition?.solid && !definition.transparent) shelteredBed = true;
      }
    }
    return { found, counts, shelteredBed };
  }

  inspect(x, y, z, reputation = 0) {
    const id = this.world.getBlock(x, y, z);
    if (!isCharterPost(id)) return null;
    const record = this.recordAt(x, y, z);
    const tier = record?.tier ?? BLOCKS[id].outpostTier ?? 0;
    const nextTier = Math.min(3, tier + 1);
    const facilities = this.facilities(x, y, z);
    const missing = [];
    if (tier === 0) {
      if (this.outposts.size >= 6) missing.push('outpost limit reached');
      if (this.entries().some((other) => Math.hypot(other.x - x, other.z - z) < 24)) missing.push('another outpost is too close');
      if (!facilities.found.has('bed')) missing.push('Moss Bed');
      if (!facilities.shelteredBed) missing.push('roofed bed');
      if (!facilities.found.has('chest')) missing.push('Chest');
      if (!facilities.found.has('table')) missing.push('Crafting Table');
    } else if (tier === 1) {
      if (!facilities.found.has('furnace')) missing.push('Furnace');
      if (!facilities.found.has('hearthfire')) missing.push('Hearthfire');
      if ((facilities.counts.get('farmland') || 0) < 4) missing.push('4 Farmland');
      if (reputation < 8) missing.push('8 reputation');
    } else if (tier === 2) {
      if (!facilities.found.has('rail')) missing.push('Forge Rail');
      if (!facilities.found.has('freight')) missing.push('Freight Station');
      if (!facilities.found.has('runeforge')) missing.push('Runeforge');
      if (reputation < 24) missing.push('24 reputation');
    }
    return { record, tier, nextTier, tierName: OUTPOST_TIERS[tier].name, nextName: OUTPOST_TIERS[nextTier].name, facilities, missing, ready: tier < 3 && missing.length === 0, maximum: tier >= 3 };
  }

  advance(x, y, z, reputation = 0) {
    const status = this.inspect(x, y, z, reputation);
    if (!status || !status.ready) return status;
    const key = keyFor(x, y, z);
    const record = status.record || { key, x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), tier: 0 };
    record.tier = status.nextTier;
    this.outposts.set(key, record);
    this.world.setBlock(record.x, record.y, record.z, TIER_BLOCKS[record.tier]);
    return { ...status, record: { ...record }, advanced: true, tier: record.tier, tierName: OUTPOST_TIERS[record.tier].name };
  }

  removeAt(x, y, z) {
    const key = keyFor(x, y, z);
    const record = this.outposts.get(key) || null;
    this.outposts.delete(key);
    return record;
  }

  features(record) {
    if (!record) return null;
    const facilities = this.facilities(record.x, record.y, record.z);
    const point = (kind, fallback) => facilities.found.get(kind) || fallback;
    const center = { x: record.x + 0.5, y: record.y + 1, z: record.z + 0.5 };
    return {
      home: point('bed', center),
      trader: { x: record.x + 2.5, y: record.y + 1, z: record.z + 0.5 },
      workshop: point('furnace', center),
      railYard: point('rail', center),
      garden: point('farmland', center),
      lantern: center,
    };
  }

  schedule(key, worldTime, seed, traderKey = `outpost:${key}`) {
    const record = this.outposts.get(key);
    return record ? wayfarerSchedule(seed, traderKey, worldTime, this.features(record)) : null;
  }

  serialize() {
    return { outposts: this.entries() };
  }
}
