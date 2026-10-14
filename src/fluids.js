import {
  BLOCK,
  BLOCKS,
  fluidBlock,
  fluidKind,
  fluidLevel,
  isLiquidBlock,
  isWaterBlock,
} from './blocks.js';
import { WORLD_HEIGHT, WORLD_MIN_Y } from './worldBounds.js';

const DIRECTIONS = Object.freeze([
  [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0],
]);
const HORIZONTAL = DIRECTIONS.slice(0, 4);
const keyOf = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const positionFromKey = (key) => key.split(',').map(Number);

function sameFluid(id, kind) {
  return fluidKind(id) === kind;
}

function desiredFlowLevel(world, x, y, z, kind) {
  const above = world.getBlock(x, y + 1, z);
  if (sameFluid(above, kind)) return 1;
  let best = Infinity;
  for (const [dx, , dz] of HORIZONTAL) {
    const neighbor = world.getBlock(x + dx, y, z + dz);
    if (sameFluid(neighbor, kind)) best = Math.min(best, fluidLevel(neighbor));
  }
  return best < 7 ? best + 1 : null;
}

export function fluidCurrentAt(world, x, y, z) {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  const id = world.getBlock(x, y, z);
  if (!isWaterBlock(id)) return { x: 0, z: 0, strength: 0 };
  const level = fluidLevel(id);
  let flowX = 0;
  let flowZ = 0;
  let total = 0;
  for (const [dx, , dz] of HORIZONTAL) {
    const neighbor = world.getBlock(x + dx, y, z + dz);
    let weight = 0;
    if (isWaterBlock(neighbor)) weight = Math.max(0, fluidLevel(neighbor) - level);
    else if (neighbor === BLOCK.AIR && !BLOCKS[world.getBlock(x + dx, y - 1, z + dz)]?.solid) weight = 8 - level;
    if (weight <= 0) continue;
    flowX += dx * weight;
    flowZ += dz * weight;
    total += weight;
  }
  const length = Math.hypot(flowX, flowZ);
  if (length <= 0) return { x: 0, z: 0, strength: 0 };
  return { x: flowX / length, z: flowZ / length, strength: Math.min(1, 0.18 + total / 12) };
}

export class FluidSystem {
  constructor(world, serialized = null) {
    this.world = world;
    this.active = new Map();
    this.accumulator = Math.max(0, Math.min(0.22, Number(serialized?.accumulator) || 0));
    this.tick = Math.max(0, Math.floor(Number(serialized?.tick) || 0));
    for (const record of serialized?.active || []) {
      if (!Array.isArray(record) || record.length !== 3 || !record.every(Number.isFinite)) continue;
      this.wake(record[0], record[1], record[2], false);
    }
  }

  wake(x, y, z, includeNeighbors = true) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (y < WORLD_MIN_Y || y >= WORLD_HEIGHT || this.active.size >= 2048) return false;
    this.active.set(keyOf(x, y, z), [x, y, z]);
    if (includeNeighbors) {
      for (const [dx, dy, dz] of DIRECTIONS) this.wake(x + dx, y + dy, z + dz, false);
    }
    return true;
  }

  blockChanged(x, y, z) {
    this.wake(x, y, z, true);
  }

  collect(x, y, z, kind) {
    const id = this.world.getBlock(x, y, z);
    if (fluidKind(id) !== kind || fluidLevel(id) !== 0) return false;
    this.world.setBlock(x, y, z, BLOCK.AIR);
    this.blockChanged(x, y, z);
    return true;
  }

  pour(x, y, z, kind) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    const existing = this.world.getBlock(x, y, z);
    if (existing !== BLOCK.AIR && !isLiquidBlock(existing)) return false;
    this.world.setBlock(x, y, z, fluidBlock(kind, 0));
    this.blockChanged(x, y, z);
    return true;
  }

  propose(changes, x, y, z, id) {
    const key = keyOf(x, y, z);
    const current = changes.get(key);
    if (current && fluidKind(current.id) && fluidKind(id) && fluidKind(current.id) !== fluidKind(id)) {
      changes.set(key, { x, y, z, id: BLOCK.STONE });
      return;
    }
    if (current?.id === BLOCK.STONE) return;
    changes.set(key, { x, y, z, id });
  }

  processCell(position, changes) {
    const [x, y, z] = position;
    const id = this.world.getBlock(x, y, z);
    const kind = fluidKind(id);
    if (!kind) return;
    if (kind === 'lava' && this.tick % 4 !== 0) {
      this.wake(x, y, z, false);
      return;
    }
    let level = fluidLevel(id);
    if (level > 0) {
      const desired = desiredFlowLevel(this.world, x, y, z, kind);
      if (desired == null) {
        this.propose(changes, x, y, z, BLOCK.AIR);
        return;
      }
      if (desired !== level) {
        level = desired;
        this.propose(changes, x, y, z, fluidBlock(kind, level));
      }
    }

    const below = this.world.getBlock(x, y - 1, z);
    const belowKind = fluidKind(below);
    if (belowKind && belowKind !== kind) {
      if (fluidLevel(below) > 0) this.propose(changes, x, y - 1, z, BLOCK.STONE);
      else if (level > 0) this.propose(changes, x, y, z, BLOCK.STONE);
      return;
    }
    const canDescend = below === BLOCK.AIR || (belowKind === kind && fluidLevel(below) > 0);
    if (canDescend) {
      if (below === BLOCK.AIR || fluidLevel(below) > 1) this.propose(changes, x, y - 1, z, fluidBlock(kind, 1));
      return;
    }

    const nextLevel = level + 1;
    if (nextLevel > 7) return;
    for (const [dx, , dz] of HORIZONTAL) {
      const nx = x + dx;
      const nz = z + dz;
      const neighbor = this.world.getBlock(nx, y, nz);
      const neighborKind = fluidKind(neighbor);
      if (neighborKind && neighborKind !== kind) {
        if (fluidLevel(neighbor) > 0) this.propose(changes, nx, y, nz, BLOCK.STONE);
        else if (level > 0) {
          this.propose(changes, x, y, z, BLOCK.STONE);
          return;
        }
      }
      else if (neighbor === BLOCK.AIR || (neighborKind === kind && fluidLevel(neighbor) > nextLevel)) {
        this.propose(changes, nx, y, nz, fluidBlock(kind, nextLevel));
      }
    }
  }

  step(maxCells = 96) {
    const batch = [...this.active.values()].slice(0, Math.max(1, maxCells));
    for (const position of batch) this.active.delete(keyOf(...position));
    const changes = new Map();
    for (const position of batch) this.processCell(position, changes);
    const effective = [...changes.values()].filter(({ x, y, z, id }) => this.world.getBlock(x, y, z) !== id);
    if (effective.length) {
      if (typeof this.world.setBlocks === 'function') this.world.setBlocks(effective);
      else for (const change of effective) this.world.setBlock(change.x, change.y, change.z, change.id);
      for (const change of effective) this.wake(change.x, change.y, change.z, true);
    }
    this.tick += 1;
    return effective;
  }

  update(dt) {
    this.accumulator += Math.max(0, Math.min(0.25, Number(dt) || 0));
    const changed = [];
    while (this.accumulator >= 0.22) {
      this.accumulator -= 0.22;
      changed.push(...this.step());
      if (changed.length >= 256) break;
    }
    return changed;
  }

  serialize() {
    return {
      accumulator: this.accumulator,
      tick: this.tick,
      active: [...this.active.values()].slice(0, 2048),
    };
  }
}
