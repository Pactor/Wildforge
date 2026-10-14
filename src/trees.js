import { BLOCK, BLOCKS } from './blocks.js';
import { coordinateRandom } from './noise.js';
import { WORLD_HEIGHT, WORLD_MIN_Y } from './worldBounds.js';

const MAX_SAPLINGS = 4096;
const MAX_PERSISTENT_LEAVES = 8192;
const MAX_DECAY_QUEUE = 4096;
const LEAF_DISTANCE = 6;

const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const positionFor = (key) => key.split(',').map(Number);

export const TREE_TYPES = Object.freeze({
  oak: Object.freeze({ sapling: BLOCK.OAK_SAPLING, log: BLOCK.WOOD, leaves: BLOCK.LEAVES }),
  frostpine: Object.freeze({ sapling: BLOCK.FROSTPINE_SAPLING, log: BLOCK.FROSTPINE_LOG, leaves: BLOCK.FROSTPINE_NEEDLES }),
});

export function saplingTypeFor(id) {
  return BLOCKS[id]?.saplingType ?? null;
}

export function treeSubstrateAllowed(type, id, biomeId = null) {
  if (!TREE_TYPES[type]) return false;
  if (type === 'frostpine') return (id === BLOCK.SNOWY_GRASS || id === BLOCK.DIRT) && (biomeId == null || biomeId === 'snowy_highlands');
  return (id === BLOCK.GRASS || id === BLOCK.DIRT) && (biomeId == null || biomeId !== 'cinderreach');
}

export function saplingGrowthTime(x, y, z, seed = 0, type = 'oak') {
  const salt = type === 'frostpine' ? 6317 : 4211;
  return 150 + coordinateRandom(x, z, (seed >>> 0) + salt, y) * 90;
}

function addPart(parts, x, y, z, id, priority = 0) {
  const key = keyFor(x, y, z);
  const existing = parts.get(key);
  if (!existing || priority >= existing.priority) parts.set(key, { x, y, z, id, priority });
}

export function treePlan(type, x, y, z, seed = 0) {
  const definition = TREE_TYPES[type];
  if (!definition) return [];
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  const variation = coordinateRandom(x, z, (seed >>> 0) + (type === 'frostpine' ? 8191 : 7213), y);
  const height = type === 'frostpine' ? 7 + Math.floor(variation * 3) : 4 + Math.floor(variation * 3);
  const parts = new Map();
  for (let dy = 0; dy < height; dy += 1) addPart(parts, x, y + dy, z, definition.log, 2);

  if (type === 'frostpine') {
    for (let level = 2; level < height; level += 2) {
      const radius = level < height - 3 ? 3 : level < height - 1 ? 2 : 1;
      for (let dz = -radius; dz <= radius; dz += 1) for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) + Math.abs(dz) > radius + 1) continue;
        addPart(parts, x + dx, y + level, z + dz, definition.leaves, 1);
      }
    }
    addPart(parts, x, y + height, z, definition.leaves, 1);
  } else {
    for (let dy = height - 3; dy <= height; dy += 1) {
      const radius = dy === height ? 1 : 2;
      for (let dz = -radius; dz <= radius; dz += 1) for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) === radius && Math.abs(dz) === radius && ((dx + dz + x + z + dy) & 1)) continue;
        addPart(parts, x + dx, y + dy, z + dz, definition.leaves, 1);
      }
    }
  }
  return [...parts.values()].map(({ priority, ...part }) => part);
}

export function leafSupported(world, x, y, z, leafId, maxDistance = LEAF_DISTANCE) {
  const logId = leafId === BLOCK.FROSTPINE_NEEDLES ? BLOCK.FROSTPINE_LOG : BLOCK.WOOD;
  const start = keyFor(x, y, z);
  const queue = [[Math.floor(x), Math.floor(y), Math.floor(z), 0]];
  const visited = new Set([start]);
  const neighbors = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  while (queue.length) {
    const [cx, cy, cz, distance] = queue.shift();
    for (const [dx, dy, dz] of neighbors) {
      const nx = cx + dx; const ny = cy + dy; const nz = cz + dz;
      const id = world.getBlock(nx, ny, nz);
      if (id === logId) return true;
      if (distance + 1 >= maxDistance || id !== leafId) continue;
      const key = keyFor(nx, ny, nz);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push([nx, ny, nz, distance + 1]);
    }
  }
  return false;
}

export class TreeLifecycle {
  constructor(world, seed = 0, serialized = null, options = {}) {
    this.world = world;
    this.seed = seed >>> 0;
    this.saplings = new Map();
    this.persistentLeaves = new Set();
    this.decayQueue = new Set();
    this.decayTimer = 0;
    this.onGrow = options.onGrow || null;
    this.onDecay = options.onDecay || null;
    this.onDrop = options.onDrop || null;
    this.canOccupy = options.canOccupy || (() => true);
    for (const entry of serialized?.saplings || []) {
      if (this.saplings.size >= MAX_SAPLINGS || !Array.isArray(entry) || typeof entry[0] !== 'string') break;
      const [x, y, z] = positionFor(entry[0]);
      const type = TREE_TYPES[entry[1]?.type] ? entry[1].type : null;
      if (!type || ![x, y, z].every(Number.isInteger) || y <= WORLD_MIN_Y || y >= WORLD_HEIGHT) continue;
      this.saplings.set(keyFor(x, y, z), { type, elapsed: Math.max(0, Math.min(86400, Number(entry[1]?.elapsed) || 0)) });
    }
    for (const key of serialized?.persistentLeaves || []) {
      if (this.persistentLeaves.size >= MAX_PERSISTENT_LEAVES) break;
      if (typeof key === 'string' && positionFor(key).every(Number.isInteger)) this.persistentLeaves.add(key);
    }
  }

  restore() {
    for (const [key, sapling] of [...this.saplings]) {
      const [x, y, z] = positionFor(key);
      const biomeId = this.world.biomeAt?.(x, z)?.id ?? null;
      if (!treeSubstrateAllowed(sapling.type, this.world.getBlock(x, y - 1, z), biomeId)) {
        this.saplings.delete(key);
        continue;
      }
      this.world.setBlock(x, y, z, TREE_TYPES[sapling.type].sapling);
    }
  }

  plant(x, y, z, type) {
    if (!TREE_TYPES[type] || this.saplings.size >= MAX_SAPLINGS) return false;
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    const biomeId = this.world.biomeAt?.(x, z)?.id ?? null;
    if (this.world.getBlock(x, y, z) !== BLOCK.AIR || !treeSubstrateAllowed(type, this.world.getBlock(x, y - 1, z), biomeId)) return false;
    const key = keyFor(x, y, z);
    this.saplings.set(key, { type, elapsed: 0 });
    this.world.setBlock(x, y, z, TREE_TYPES[type].sapling);
    return true;
  }

  removeSapling(x, y, z) {
    return this.saplings.delete(keyFor(x, y, z));
  }

  markPersistentLeaf(x, y, z) {
    if (this.persistentLeaves.size >= MAX_PERSISTENT_LEAVES) return false;
    this.persistentLeaves.add(keyFor(x, y, z));
    return true;
  }

  canGrow(type, x, y, z, plan = treePlan(type, x, y, z, this.seed)) {
    const biomeId = this.world.biomeAt?.(x, z)?.id ?? null;
    if (!treeSubstrateAllowed(type, this.world.getBlock(x, y - 1, z), biomeId)) return false;
    for (const part of plan) {
      if (part.y <= WORLD_MIN_Y || part.y >= WORLD_HEIGHT) return false;
      const current = this.world.getBlock(part.x, part.y, part.z);
      const replaceable = current === BLOCK.AIR || current === TREE_TYPES[type].sapling || current === TREE_TYPES[type].leaves;
      if (!replaceable || !this.canOccupy(part, type)) return false;
    }
    return true;
  }

  grow(type, x, y, z) {
    const plan = treePlan(type, x, y, z, this.seed);
    if (!this.canGrow(type, x, y, z, plan)) return false;
    this.saplings.delete(keyFor(x, y, z));
    this.world.setBlocks(plan);
    this.onGrow?.({ type, x, y, z, plan });
    return true;
  }

  scheduleLeavesAround(x, y, z, radius = LEAF_DISTANCE) {
    for (let dy = -radius; dy <= radius; dy += 1) for (let dz = -radius; dz <= radius; dz += 1) for (let dx = -radius; dx <= radius; dx += 1) {
      if (this.decayQueue.size >= MAX_DECAY_QUEUE) return;
      const id = this.world.getBlock(x + dx, y + dy, z + dz);
      if (id === BLOCK.LEAVES || id === BLOCK.FROSTPINE_NEEDLES) this.decayQueue.add(keyFor(x + dx, y + dy, z + dz));
    }
  }

  blockChanged(x, y, z, previous, id) {
    const previousType = saplingTypeFor(previous);
    const type = saplingTypeFor(id);
    const key = keyFor(x, y, z);
    if (previousType && id !== previous) this.saplings.delete(key);
    if (type && !this.saplings.has(key) && this.saplings.size < MAX_SAPLINGS) this.saplings.set(key, { type, elapsed: 0 });
    if ((previous === BLOCK.WOOD || previous === BLOCK.FROSTPINE_LOG) && id !== previous) this.scheduleLeavesAround(x, y, z);
    if ((previous === BLOCK.LEAVES || previous === BLOCK.FROSTPINE_NEEDLES) && id !== previous) this.persistentLeaves.delete(key);

    const aboveId = this.world.getBlock(x, y + 1, z);
    const aboveType = saplingTypeFor(aboveId);
    if (aboveType) {
      const biomeId = this.world.biomeAt?.(x, z)?.id ?? null;
      if (!treeSubstrateAllowed(aboveType, id, biomeId)) {
        this.world.setBlock(x, y + 1, z, BLOCK.AIR);
        this.saplings.delete(keyFor(x, y + 1, z));
        this.onDrop?.(aboveId, x, y + 1, z);
      }
    }
  }

  update(dt, options = {}) {
    dt = Math.max(0, Math.min(300, Number(dt) || 0));
    for (const [key, sapling] of [...this.saplings]) {
      const [x, y, z] = positionFor(key);
      if (this.world.getBlock(x, y, z) !== TREE_TYPES[sapling.type].sapling) {
        this.saplings.delete(key);
        continue;
      }
      if (options.hasLight && !options.hasLight(x, y, z)) continue;
      sapling.elapsed += dt * Math.max(0.25, Math.min(2, Number(options.growthMultiplier) || 1));
      if (sapling.elapsed >= saplingGrowthTime(x, y, z, this.seed, sapling.type)) this.grow(sapling.type, x, y, z);
    }

    this.decayTimer -= dt;
    if (this.decayTimer > 0 || !this.decayQueue.size) return;
    this.decayTimer = 0.12;
    let processed = 0;
    for (const key of [...this.decayQueue]) {
      if (processed >= 16) break;
      this.decayQueue.delete(key);
      processed += 1;
      if (this.persistentLeaves.has(key)) continue;
      const [x, y, z] = positionFor(key);
      const id = this.world.getBlock(x, y, z);
      if ((id !== BLOCK.LEAVES && id !== BLOCK.FROSTPINE_NEEDLES) || leafSupported(this.world, x, y, z, id)) continue;
      this.world.setBlock(x, y, z, BLOCK.AIR);
      this.onDecay?.(id, x, y, z);
    }
  }

  serialize() {
    return {
      saplings: [...this.saplings.entries()].map(([key, value]) => [key, { type: value.type, elapsed: value.elapsed }]),
      persistentLeaves: [...this.persistentLeaves],
    };
  }
}
