import { BLOCK, BLOCKS, isWaterBlock } from './blocks.js';
import { coordinateRandom } from './noise.js';
import { WORLD_HEIGHT, WORLD_MIN_Y } from './worldBounds.js';

const MAX_FIRES = 256;
const NEIGHBORS = Object.freeze([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]);
const WOODEN_BUILDING_BLOCKS = new Set([
  BLOCK.WOOD, BLOCK.PLANKS, BLOCK.LEAVES, BLOCK.WOOD_SLAB, BLOCK.OAK_FENCE,
  BLOCK.OAK_STAIR_N, BLOCK.OAK_STAIR_E, BLOCK.OAK_STAIR_S, BLOCK.OAK_STAIR_W,
  BLOCK.FROSTPINE_LOG, BLOCK.FROSTPINE_NEEDLES,
  BLOCK.LADDER_N, BLOCK.LADDER_E, BLOCK.LADDER_S, BLOCK.LADDER_W,
]);
const NATURAL_PLANTS = new Set([
  BLOCK.WINDGRASS, BLOCK.SUNPETAL, BLOCK.EMBERBELL, BLOCK.DUSKMUSHROOM,
  BLOCK.TIDEGRASS, BLOCK.GLOWKELP, BLOCK.LUMEN_BLOOM, BLOCK.ASHCAP,
  BLOCK.OAK_SAPLING, BLOCK.FROSTPINE_SAPLING,
]);

const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const positionFor = (key) => key.split(',').map(Number);

export function flammability(id) {
  if (id === BLOCK.LEAVES || id === BLOCK.FROSTPINE_NEEDLES) return 1;
  if (NATURAL_PLANTS.has(id) || BLOCKS[id]?.crop) return 0.95;
  if (id === BLOCK.WOOD || id === BLOCK.FROSTPINE_LOG) return 0.62;
  if (WOODEN_BUILDING_BLOCKS.has(id)) return 0.72;
  return 0;
}

export function isFlammable(id) {
  return flammability(id) > 0;
}

export function adjacentFuel(world, x, y, z, preferred = null) {
  if (preferred && Math.abs(preferred.x - x) + Math.abs(preferred.y - y) + Math.abs(preferred.z - z) === 1
    && isFlammable(world.getBlock(preferred.x, preferred.y, preferred.z))) {
    return { x: Math.floor(preferred.x), y: Math.floor(preferred.y), z: Math.floor(preferred.z) };
  }
  for (const [dx, dy, dz] of NEIGHBORS) {
    const id = world.getBlock(x + dx, y + dy, z + dz);
    if (isFlammable(id)) return { x: x + dx, y: y + dy, z: z + dz };
  }
  return null;
}

export function canIgnite(world, x, y, z, preferredFuel = null) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  return y > WORLD_MIN_Y && y < WORLD_HEIGHT && world.getBlock(x, y, z) === BLOCK.AIR && Boolean(adjacentFuel(world, x, y, z, preferredFuel));
}

function hasWaterNeighbor(world, x, y, z) {
  return NEIGHBORS.some(([dx, dy, dz]) => isWaterBlock(world.getBlock(x + dx, y + dy, z + dz)));
}

export function fireAtActor(world, position, height = 1.8) {
  if (!position) return null;
  const x = Math.floor(position.x);
  const z = Math.floor(position.z);
  const minY = Math.floor(position.y);
  const maxY = Math.floor(position.y + Math.max(0.2, Number(height) || 1.8));
  for (let y = minY; y <= maxY; y += 1) {
    if (world.getBlock(x, y, z) === BLOCK.EMBERFIRE) return { x, y, z };
  }
  return null;
}

export class FireState {
  constructor(world, seed = 0, serialized = null, options = {}) {
    this.world = world;
    this.seed = seed >>> 0;
    this.fires = new Map();
    this.onIgnite = options.onIgnite || null;
    this.onExtinguish = options.onExtinguish || null;
    this.onBurn = options.onBurn || null;
    this.onExplosive = options.onExplosive || null;
    this.onFlicker = options.onFlicker || null;
    for (const entry of serialized?.fires || []) {
      if (this.fires.size >= MAX_FIRES || !Array.isArray(entry) || typeof entry[0] !== 'string') break;
      const [x, y, z] = positionFor(entry[0]);
      const record = entry[1];
      const fuel = Array.isArray(record?.fuel) && record.fuel.length === 3 ? record.fuel.map(Math.floor) : null;
      if (![x, y, z].every(Number.isInteger) || y <= WORLD_MIN_Y || y >= WORLD_HEIGHT || !fuel?.every(Number.isInteger)) continue;
      if (Math.abs(fuel[0] - x) + Math.abs(fuel[1] - y) + Math.abs(fuel[2] - z) !== 1) continue;
      this.fires.set(keyFor(x, y, z), {
        fuel: { x: fuel[0], y: fuel[1], z: fuel[2] },
        life: Math.max(0.1, Math.min(90, Number(record.life) || 20)),
        burnTimer: Math.max(0.05, Math.min(30, Number(record.burnTimer) || 6)),
        spreadTimer: Math.max(0.05, Math.min(15, Number(record.spreadTimer) || 2)),
        rainExposure: Math.max(0, Math.min(5, Number(record.rainExposure) || 0)),
        spreadCount: Math.max(0, Math.min(10000, Math.floor(Number(record.spreadCount) || 0))),
      });
    }
  }

  timing(x, y, z) {
    return {
      life: 18 + coordinateRandom(x, z, this.seed + 10531, y) * 24,
      burnTimer: 5 + coordinateRandom(x, z, this.seed + 10559, y) * 7,
      spreadTimer: 1.6 + coordinateRandom(x, z, this.seed + 10589, y) * 2.4,
    };
  }

  restore() {
    for (const [key, record] of [...this.fires]) {
      const [x, y, z] = positionFor(key);
      const current = this.world.getBlock(x, y, z);
      const fuel = adjacentFuel(this.world, x, y, z, record.fuel);
      if ((current !== BLOCK.AIR && current !== BLOCK.EMBERFIRE) || !fuel) {
        this.fires.delete(key);
        continue;
      }
      record.fuel = fuel;
      if (current !== BLOCK.EMBERFIRE) {
        this.world.setBlock(x, y, z, BLOCK.EMBERFIRE);
        this.onIgnite?.({ x, y, z, natural: true });
      }
    }
  }

  ignite(x, y, z, options = {}) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    const key = keyFor(x, y, z);
    if (this.fires.has(key)) return this.fires.get(key);
    if (this.fires.size >= MAX_FIRES || !canIgnite(this.world, x, y, z, options.fuel)) return null;
    const fuel = adjacentFuel(this.world, x, y, z, options.fuel);
    const timing = this.timing(x, y, z);
    const record = {
      fuel,
      life: Math.max(0.1, Math.min(90, Number(options.life) || timing.life)),
      burnTimer: Math.max(0.05, Math.min(30, Number(options.burnTimer) || timing.burnTimer)),
      spreadTimer: Math.max(0.05, Math.min(15, Number(options.spreadTimer) || timing.spreadTimer)),
      rainExposure: 0,
      spreadCount: 0,
    };
    this.fires.set(key, record);
    this.world.setBlock(x, y, z, BLOCK.EMBERFIRE);
    this.onIgnite?.({ x, y, z, natural: Boolean(options.natural) });
    return record;
  }

  extinguish(x, y, z, reason = 'unsupported') {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    const key = keyFor(x, y, z);
    if (!this.fires.delete(key) && this.world.getBlock(x, y, z) !== BLOCK.EMBERFIRE) return false;
    if (this.world.getBlock(x, y, z) === BLOCK.EMBERFIRE) this.world.setBlock(x, y, z, BLOCK.AIR);
    this.onExtinguish?.({ x, y, z, reason });
    return true;
  }

  blockChanged(x, y, z, previous, id) {
    const key = keyFor(x, y, z);
    if (previous === BLOCK.EMBERFIRE && id !== BLOCK.EMBERFIRE) this.fires.delete(key);
    if (id === BLOCK.EMBERFIRE && !this.fires.has(key) && this.fires.size < MAX_FIRES) {
      const fuel = adjacentFuel(this.world, x, y, z);
      if (fuel) this.fires.set(key, { fuel, ...this.timing(x, y, z), rainExposure: 0, spreadCount: 0 });
    }
    if (isFlammable(previous) && !isFlammable(id)) {
      for (const record of this.fires.values()) {
        if (record.fuel.x === x && record.fuel.y === y && record.fuel.z === z) record.fuel = null;
      }
    }
  }

  trySpread(x, y, z, record, multiplier = 1) {
    if (this.fires.size >= MAX_FIRES) return false;
    const candidates = [];
    for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) for (let dx = -1; dx <= 1; dx += 1) {
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 2) continue;
      const nx = x + dx; const ny = y + dy; const nz = z + dz;
      if (canIgnite(this.world, nx, ny, nz)) candidates.push({ x: nx, y: ny, z: nz });
    }
    if (!candidates.length) return false;
    const roll = coordinateRandom(x + record.spreadCount * 17, z - record.spreadCount * 11, this.seed + 10613, y);
    record.spreadCount += 1;
    const candidate = candidates[Math.floor(roll * candidates.length) % candidates.length];
    const fuel = adjacentFuel(this.world, candidate.x, candidate.y, candidate.z);
    const chance = Math.min(0.9, flammability(this.world.getBlock(fuel.x, fuel.y, fuel.z)) * 0.48 * Math.max(0.25, Math.min(2, multiplier)));
    if (coordinateRandom(candidate.x, candidate.z, this.seed + 10639 + record.spreadCount, candidate.y) > chance) return false;
    return Boolean(this.ignite(candidate.x, candidate.y, candidate.z, { fuel, natural: true }));
  }

  update(dt, options = {}) {
    dt = Math.max(0, Math.min(1, Number(dt) || 0));
    for (const [key, record] of [...this.fires]) {
      const [x, y, z] = positionFor(key);
      if (this.world.getBlock(x, y, z) !== BLOCK.EMBERFIRE) {
        this.fires.delete(key);
        continue;
      }
      this.onFlicker?.(x, y, z, 0.82 + coordinateRandom(x, z, this.seed + 10711 + Math.floor(record.life * 12), y) * 0.36);
      for (const [dx, dy, dz] of NEIGHBORS) {
        if (this.world.getBlock(x + dx, y + dy, z + dz) === BLOCK.BLAST_KEG) this.onExplosive?.(x + dx, y + dy, z + dz);
      }
      if (hasWaterNeighbor(this.world, x, y, z)) {
        this.extinguish(x, y, z, 'water');
        continue;
      }
      if (options.raining && options.isExposed?.(x, y, z)) record.rainExposure += dt;
      else record.rainExposure = Math.max(0, record.rainExposure - dt * 2);
      if (record.rainExposure >= 1.5) {
        this.extinguish(x, y, z, 'rain');
        continue;
      }
      record.life -= dt;
      if (record.life <= 0) {
        this.extinguish(x, y, z, 'spent');
        continue;
      }
      if (!record.fuel || !isFlammable(this.world.getBlock(record.fuel.x, record.fuel.y, record.fuel.z))) {
        record.fuel = adjacentFuel(this.world, x, y, z);
        if (!record.fuel) {
          this.extinguish(x, y, z, 'unsupported');
          continue;
        }
      }
      record.spreadTimer -= dt;
      if (record.spreadTimer <= 0) {
        record.spreadTimer += this.timing(x + record.spreadCount, y, z).spreadTimer;
        this.trySpread(x, y, z, record, options.spreadMultiplier);
      }
      record.burnTimer -= dt;
      if (record.burnTimer <= 0) {
        const fuel = { ...record.fuel };
        const fuelId = this.world.getBlock(fuel.x, fuel.y, fuel.z);
        if (isFlammable(fuelId)) {
          this.world.setBlock(fuel.x, fuel.y, fuel.z, BLOCK.AIR);
          this.onBurn?.({ ...fuel, id: fuelId });
          this.ignite(fuel.x, fuel.y, fuel.z, { natural: true });
        }
        record.fuel = adjacentFuel(this.world, x, y, z);
        record.burnTimer += this.timing(x, y + record.spreadCount, z).burnTimer;
      }
    }
    return this.fires.size;
  }

  serialize() {
    return {
      fires: [...this.fires.entries()].slice(0, MAX_FIRES).map(([key, record]) => [key, {
        fuel: record.fuel ? [record.fuel.x, record.fuel.y, record.fuel.z] : null,
        life: record.life,
        burnTimer: record.burnTimer,
        spreadTimer: record.spreadTimer,
        rainExposure: record.rainExposure,
        spreadCount: record.spreadCount,
      }]),
    };
  }
}
