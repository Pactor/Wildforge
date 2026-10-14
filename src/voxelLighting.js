import { BLOCKS, isWaterBlock } from './blocks.js';

export const MAX_LIGHT = 15;
const DIRECTIONS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

export function lightPasses(id) {
  const definition = BLOCKS[id];
  return !definition?.solid || Boolean(definition.transparent || definition.lightPasses);
}

export function emittedLightLevel(id) {
  const light = BLOCKS[id]?.light;
  if (!light) return 0;
  return Math.max(1, Math.min(MAX_LIGHT, Math.round(Number(light.distance) || Number(light.intensity) * 6 || 1)));
}

export class VoxelLightField {
  constructor(world, minX, minZ, width, depth, height, margin = 8, minY = 0) {
    this.world = world;
    this.minX = Math.floor(minX) - margin;
    this.minZ = Math.floor(minZ) - margin;
    this.width = Math.max(1, Math.floor(width) + margin * 2);
    this.depth = Math.max(1, Math.floor(depth) + margin * 2);
    this.height = Math.max(1, Math.floor(height));
    this.minY = Math.floor(minY);
    this.sky = new Uint8Array(this.width * this.depth * this.height);
    this.block = new Uint8Array(this.sky.length);
    this.passable = new Uint8Array(this.sky.length);
    this.water = new Uint8Array(this.sky.length);
    this.build();
  }

  indexLocal(lx, y, lz) {
    const ly = y - this.minY;
    if (lx < 0 || lx >= this.width || lz < 0 || lz >= this.depth || ly < 0 || ly >= this.height) return -1;
    return lx + this.width * (lz + this.depth * ly);
  }

  index(x, y, z) {
    return this.indexLocal(Math.floor(x) - this.minX, Math.floor(y), Math.floor(z) - this.minZ);
  }

  propagate(values, queue) {
    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      const level = values[current];
      if (level <= 1) continue;
      const ly = Math.floor(current / (this.width * this.depth));
      const y = ly + this.minY;
      const layerIndex = current - ly * this.width * this.depth;
      const lz = Math.floor(layerIndex / this.width);
      const lx = layerIndex - lz * this.width;
      for (const [dx, dy, dz] of DIRECTIONS) {
        const ny = y + dy;
        const next = this.indexLocal(lx + dx, ny, lz + dz);
        if (next < 0) continue;
        if (!this.passable[next]) continue;
        const attenuation = this.water[next] ? 2 : 1;
        const nextLevel = Math.max(0, level - attenuation);
        if (nextLevel <= values[next]) continue;
        values[next] = nextLevel;
        queue.push(next);
      }
    }
  }

  build() {
    const blockQueue = [];
    for (let lz = 0; lz < this.depth; lz += 1) {
      for (let lx = 0; lx < this.width; lx += 1) {
        let direct = MAX_LIGHT;
        for (let y = this.minY + this.height - 1; y >= this.minY; y -= 1) {
          const index = this.indexLocal(lx, y, lz);
          const id = this.world.getBlock(this.minX + lx, y, this.minZ + lz);
          const passes = lightPasses(id);
          this.passable[index] = passes ? 1 : 0;
          this.water[index] = isWaterBlock(id) ? 1 : 0;
          if (direct && passes) {
            if (isWaterBlock(id)) direct = Math.max(0, direct - 1);
            this.sky[index] = direct;
          } else direct = 0;
          const emitted = emittedLightLevel(id);
          if (emitted > 0) {
            this.block[index] = emitted;
            blockQueue.push(index);
          }
        }
      }
    }
    const skyQueue = [];
    for (let index = 0; index < this.sky.length; index += 1) {
      const level = this.sky[index];
      if (level <= 1) continue;
      const ly = Math.floor(index / (this.width * this.depth));
      const y = ly + this.minY;
      const layerIndex = index - ly * this.width * this.depth;
      const lz = Math.floor(layerIndex / this.width);
      const lx = layerIndex - lz * this.width;
      if (DIRECTIONS.some(([dx, dy, dz]) => {
        const next = this.indexLocal(lx + dx, y + dy, lz + dz);
        return next >= 0 && this.passable[next] && this.sky[next] < level - 1;
      })) skyQueue.push(index);
    }
    this.propagate(this.sky, skyQueue);
    this.propagate(this.block, blockQueue);
  }

  skyLevelAt(x, y, z) {
    const index = this.index(x, y, z);
    return index < 0 ? 0 : this.sky[index];
  }

  blockLevelAt(x, y, z) {
    const index = this.index(x, y, z);
    return index < 0 ? 0 : this.block[index];
  }

  levelAt(x, y, z) {
    return Math.max(this.skyLevelAt(x, y, z), this.blockLevelAt(x, y, z));
  }

  brightnessAt(x, y, z) {
    return 0.18 + this.levelAt(x, y, z) / MAX_LIGHT * 0.82;
  }
}
