import {
  BLOCK,
  BLOCKS,
  isSnowLayer,
  snowLayerBlock,
  snowLayerLevel,
} from './blocks.js';
import { WORLD_HEIGHT, WORLD_MIN_Y } from './worldBounds.js';

const keyOf = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;

export function exposedSnowPosition(world, x, z) {
  x = Math.floor(x); z = Math.floor(z);
  for (let y = WORLD_HEIGHT - 1; y > WORLD_MIN_Y; y -= 1) {
    const id = world.getBlock(x, y, z);
    if (id === BLOCK.AIR) continue;
    if (isSnowLayer(id)) return { x, y, z, id, existing: true };
    if (id === BLOCK.SNOW) return null;
    const definition = BLOCKS[id];
    if (!definition?.solid) return null;
    const fullTop = (definition.collisionHeight ?? 1) >= 1 && !definition.model && !definition.door
      && !definition.bed && !definition.trapdoor && !definition.gate;
    if (!fullTop || world.getBlock(x, y + 1, z) !== BLOCK.AIR) return null;
    return { x, y: y + 1, z, id: BLOCK.AIR, existing: false };
  }
  return null;
}

export class SnowAccumulationState {
  constructor(world, seed = 1, serialized = null) {
    this.world = world;
    this.randomState = (serialized?.randomState ?? ((Number(seed) || 1) ^ 0x27d4eb2d)) >>> 0 || 1;
    this.accumulationTimer = Number.isFinite(Number(serialized?.accumulationTimer))
      ? Number(serialized.accumulationTimer)
      : 0;
    this.meltTimer = Number.isFinite(Number(serialized?.meltTimer))
      ? Number(serialized.meltTimer)
      : 0;
    this.records = new Map();
    for (const record of serialized?.records || []) {
      if (!record || ![record.x, record.y, record.z].every(Number.isFinite) || this.records.size >= 512) continue;
      const normalized = { x: Math.floor(record.x), y: Math.floor(record.y), z: Math.floor(record.z) };
      this.records.set(keyOf(normalized.x, normalized.y, normalized.z), normalized);
    }
  }

  random() {
    let value = this.randomState;
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    this.randomState = value >>> 0;
    return this.randomState / 4294967296;
  }

  accumulateAt(x, z) {
    const position = exposedSnowPosition(this.world, x, z);
    if (!position) return null;
    const level = snowLayerLevel(position.id);
    const next = level >= 4 ? BLOCK.SNOW : snowLayerBlock(level + 1);
    this.world.setBlock(position.x, position.y, position.z, next);
    const record = { x: position.x, y: position.y, z: position.z };
    this.records.set(keyOf(record.x, record.y, record.z), record);
    return { ...record, previous: position.id, id: next };
  }

  meltAt(record) {
    const key = keyOf(record.x, record.y, record.z);
    const id = this.world.getBlock(record.x, record.y, record.z);
    if (id !== BLOCK.SNOW && !isSnowLayer(id)) {
      this.records.delete(key);
      return null;
    }
    const next = id === BLOCK.SNOW ? BLOCK.SNOW_LAYER_4
      : snowLayerLevel(id) <= 1 ? BLOCK.AIR
        : snowLayerBlock(snowLayerLevel(id) - 1);
    this.world.setBlock(record.x, record.y, record.z, next);
    if (next === BLOCK.AIR) this.records.delete(key);
    return { ...record, previous: id, id: next };
  }

  update(dt, context = {}) {
    dt = Math.max(0, Math.min(0.25, Number(dt) || 0));
    this.accumulationTimer -= dt;
    this.meltTimer -= dt;
    const changes = [];
    const player = context.playerPosition;
    if (player && context.weatherKind !== 'clear' && context.biomeAt?.(player.x, player.z) === 'snowy_highlands' && this.accumulationTimer <= 0) {
      this.accumulationTimer = context.weatherKind === 'storm' ? 0.42 : 0.72;
      const attempts = context.weatherKind === 'storm' ? 3 : 2;
      for (let index = 0; index < attempts; index += 1) {
        const x = Math.floor(player.x + (this.random() - 0.5) * 28);
        const z = Math.floor(player.z + (this.random() - 0.5) * 28);
        if (context.biomeAt(x, z) !== 'snowy_highlands') continue;
        const change = this.accumulateAt(x, z);
        if (change) changes.push(change);
      }
    }
    if (this.records.size && context.weatherKind === 'clear' && (Number(context.daylight) || 0) > 0.56 && this.meltTimer <= 0) {
      const records = [...this.records.values()];
      const record = records[Math.floor(this.random() * records.length)];
      const cold = context.biomeAt?.(record.x, record.z) === 'snowy_highlands';
      this.meltTimer = cold ? 4.8 : 1.4;
      const change = this.meltAt(record);
      if (change) changes.push(change);
    }
    return changes;
  }

  serialize() {
    return {
      randomState: this.randomState,
      accumulationTimer: this.accumulationTimer,
      meltTimer: this.meltTimer,
      records: [...this.records.values()],
    };
  }
}
