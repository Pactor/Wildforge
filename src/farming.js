import { BLOCK } from './blocks.js';
import { coordinateRandom } from './noise.js';

export const CROP_TYPES = Object.freeze({
  wheat: Object.freeze({ stages: [BLOCK.WHEAT_0, BLOCK.WHEAT_1, BLOCK.WHEAT_2, BLOCK.WHEAT_3], seedItem: 'wheat_seeds' }),
  amberroot: Object.freeze({ stages: [BLOCK.AMBERROOT_0, BLOCK.AMBERROOT_1, BLOCK.AMBERROOT_2, BLOCK.AMBERROOT_3], seedItem: 'amberroot_seed' }),
  rimepod: Object.freeze({ stages: [BLOCK.RIMEPOD_0, BLOCK.RIMEPOD_1, BLOCK.RIMEPOD_2, BLOCK.RIMEPOD_3], seedItem: 'rimepod_seed', biomes: ['snowy_highlands'] }),
  emberbulb: Object.freeze({ stages: [BLOCK.EMBERBULB_0, BLOCK.EMBERBULB_1, BLOCK.EMBERBULB_2, BLOCK.EMBERBULB_3], seedItem: 'emberbulb_cutting', biomes: ['cinderreach'], substrate: BLOCK.EMBER_SOIL, weatherIndependent: true }),
});
export const CROP_STAGES = CROP_TYPES.wheat.stages;

const cropKey = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const coordinates = (key) => key.split(',').map(Number);

export function cropGrowthTime(x, y, z, stage, seed = 0, type = 'wheat') {
  const typeSalt = type === 'amberroot' ? 977 : type === 'rimepod' ? 1951 : type === 'emberbulb' ? 2927 : 0;
  const variation = 0.85 + coordinateRandom(x + stage * 13, z - stage * 7, seed + typeSalt, y + 211) * 0.3;
  return (38 + stage * 16) * variation;
}

export function cropBlock(type, stage = 0) {
  return CROP_TYPES[type]?.stages[Math.max(0, Math.min(3, Math.floor(stage)))] ?? null;
}

export function cropSeedItem(type) {
  return CROP_TYPES[type]?.seedItem ?? null;
}

export function cropPlantingAllowed(type, biomeId) {
  const definition = CROP_TYPES[type];
  if (!definition) return false;
  return !definition.biomes || definition.biomes.includes(biomeId);
}

export function cropSubstrateAllowed(type, blockId) {
  const definition = CROP_TYPES[type];
  if (!definition) return false;
  return definition.substrate == null
    ? blockId === BLOCK.FARMLAND || blockId === BLOCK.HYDRATED_FARMLAND
    : blockId === definition.substrate;
}

export class FarmingState {
  constructor(serialized = null, seed = 0) {
    this.seed = seed >>> 0;
    this.crops = new Map();
    this.soils = new Map();
    for (const entry of serialized?.crops || []) {
      const [key, crop] = entry;
      if (typeof key === 'string' && Number.isInteger(crop?.stage)) {
        const type = CROP_TYPES[crop.type] ? crop.type : 'wheat';
        this.crops.set(key, { type, stage: Math.max(0, Math.min(3, crop.stage)), elapsed: Math.max(0, Number(crop.elapsed) || 0) });
      }
    }
    for (const entry of serialized?.soils || []) {
      const [key, soil] = entry;
      if (typeof key !== 'string') continue;
      this.soils.set(key, {
        hydrated: Boolean(soil?.hydrated),
        dryElapsed: Math.max(0, Number(soil?.dryElapsed) || 0),
        checkTimer: 0,
      });
    }
    // Old saves only tracked crops; reconstruct their supporting farmland.
    for (const key of this.crops.keys()) {
      const [x, y, z] = coordinates(key);
      const soilKey = cropKey(x, y - 1, z);
      if (CROP_TYPES[this.crops.get(key)?.type]?.substrate == null && !this.soils.has(soilKey)) this.soils.set(soilKey, { hydrated: false, dryElapsed: 0, checkTimer: 0 });
    }
  }

  till(x, y, z) {
    const key = cropKey(x, y, z);
    if (this.soils.has(key)) return false;
    this.soils.set(key, { hydrated: false, dryElapsed: 0, checkTimer: 0 });
    return true;
  }

  untill(x, y, z) {
    return this.soils.delete(cropKey(x, y, z));
  }

  plant(x, y, z, type = 'wheat', options = {}) {
    const key = cropKey(x, y, z);
    if (this.crops.has(key) || !CROP_TYPES[type]
      || (options.biomeId != null && !cropPlantingAllowed(type, options.biomeId))
      || (options.substrateId != null && !cropSubstrateAllowed(type, options.substrateId))) return false;
    this.crops.set(key, { type, stage: 0, elapsed: 0 });
    const soilKey = cropKey(x, y - 1, z);
    if (CROP_TYPES[type].substrate == null && !this.soils.has(soilKey)) this.soils.set(soilKey, { hydrated: false, dryElapsed: 0, checkTimer: 0 });
    return true;
  }

  remove(x, y, z) {
    return this.crops.delete(cropKey(x, y, z));
  }

  fertilize(x, y, z, stages = 1) {
    const crop = this.crops.get(cropKey(x, y, z));
    if (!crop) return null;
    const definition = CROP_TYPES[crop.type] || CROP_TYPES.wheat;
    if (crop.stage >= definition.stages.length - 1) return null;
    crop.stage = Math.min(definition.stages.length - 1, crop.stage + Math.max(1, Math.floor(stages)));
    crop.elapsed = 0;
    return { type: crop.type, stage: crop.stage, block: definition.stages[crop.stage] };
  }

  update(dt, onGrow, options = {}) {
    dt = Math.max(0, Math.min(Number(dt) || 0, 300));
    const isHydrated = options.isHydrated || (() => false);
    for (const [key, soil] of [...this.soils]) {
      const [x, y, z] = coordinates(key);
      soil.checkTimer -= dt;
      if (soil.checkTimer <= 0) {
        soil.checkTimer = 2;
        const hydrated = Boolean(isHydrated(x, y, z));
        if (hydrated !== soil.hydrated) {
          soil.hydrated = hydrated;
          options.onSoilChange?.(x, y, z, hydrated);
        }
      }
      if (soil.hydrated) soil.dryElapsed = 0;
      else soil.dryElapsed += dt;
      if (!soil.hydrated && soil.dryElapsed >= 120 && !this.crops.has(cropKey(x, y + 1, z))) {
        this.soils.delete(key);
        options.onDry?.(x, y, z);
      }
    }

    for (const [key, crop] of this.crops) {
      const definition = CROP_TYPES[crop.type] || CROP_TYPES.wheat;
      if (crop.stage >= definition.stages.length - 1) continue;
      const [x, y, z] = coordinates(key);
      if (options.hasLight && !options.hasLight(x, y, z)) continue;
      if (options.biomeAt) {
        const biome = options.biomeAt(x, z);
        const biomeId = typeof biome === 'string' ? biome : biome?.id;
        if (!cropPlantingAllowed(crop.type, biomeId)) continue;
      }
      if (definition.substrate != null && options.blockAt && !cropSubstrateAllowed(crop.type, options.blockAt(x, y - 1, z))) continue;
      const soil = this.soils.get(cropKey(x, y - 1, z));
      const environmentMultiplier = definition.weatherIndependent ? 1 : Math.max(0.25, Math.min(2, Number(options.growthMultiplier) || 1));
      const soilMultiplier = definition.substrate != null ? 1 : soil?.hydrated ? 1 : 0.45;
      crop.elapsed += dt * soilMultiplier * environmentMultiplier;
      const growthTime = cropGrowthTime(x, y, z, crop.stage, this.seed, crop.type);
      if (crop.elapsed < growthTime) continue;
      crop.elapsed -= growthTime;
      crop.stage += 1;
      onGrow?.(x, y, z, definition.stages[crop.stage], crop.stage, crop.type);
    }
  }

  entries() {
    return [...this.crops.entries()].map(([key, crop]) => {
      const [x, y, z] = coordinates(key);
      return { x, y, z, type: crop.type, stage: crop.stage, block: cropBlock(crop.type, crop.stage) };
    });
  }

  soilEntries() {
    return [...this.soils.entries()].map(([key, soil]) => {
      const [x, y, z] = coordinates(key);
      return { x, y, z, hydrated: soil.hydrated, block: soil.hydrated ? BLOCK.HYDRATED_FARMLAND : BLOCK.FARMLAND };
    });
  }

  serialize() {
    return {
      crops: [...this.crops.entries()],
      soils: [...this.soils.entries()].map(([key, soil]) => [key, { hydrated: soil.hydrated, dryElapsed: soil.dryElapsed }]),
    };
  }
}
