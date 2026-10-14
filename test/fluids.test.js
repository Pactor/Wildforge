import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLOCK,
  fluidBlock,
  fluidKind,
  fluidLevel,
  fluidSurfaceHeight,
  isLavaBlock,
  isLiquidBlock,
  isWaterBlock,
} from '../src/blocks.js';
import { fluidCurrentAt, FluidSystem } from '../src/fluids.js';

class TestWorld {
  constructor() {
    this.blocks = new Map();
  }

  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return y <= 0 ? BLOCK.STONE : this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); }
  setBlocks(changes) { for (const { x, y, z, id } of changes) this.setBlock(x, y, z, id); }
}

function stepMany(system, count = 20) {
  for (let index = 0; index < count; index += 1) system.step(256);
}

test('all levelled liquids have canonical families, levels, and descending surfaces', () => {
  for (let level = 0; level <= 7; level += 1) {
    const water = fluidBlock('water', level);
    const lava = fluidBlock('lava', level);
    assert.equal(isWaterBlock(water), true);
    assert.equal(isLavaBlock(lava), true);
    assert.equal(isLiquidBlock(water), true);
    assert.equal(fluidKind(lava), 'lava');
    assert.equal(fluidLevel(water), level);
    if (level > 0) assert.ok(fluidSurfaceHeight(water) < fluidSurfaceHeight(fluidBlock('water', level - 1)));
  }
});

test('poured sources descend, spread in levels, and fully recede after collection', () => {
  const world = new TestWorld();
  const fluids = new FluidSystem(world);
  assert.equal(fluids.pour(0, 4, 0, 'water'), true);
  stepMany(fluids, 14);
  assert.equal(world.getBlock(0, 4, 0), BLOCK.WATER);
  assert.equal(world.getBlock(0, 3, 0), BLOCK.WATER_1);
  assert.equal(world.getBlock(0, 1, 0), BLOCK.WATER_1);
  assert.equal(world.getBlock(1, 1, 0), BLOCK.WATER_2);
  assert.equal(world.getBlock(2, 1, 0), BLOCK.WATER_3);
  assert.equal(fluids.collect(0, 4, 0, 'water'), true);
  stepMany(fluids, 36);
  assert.equal([...world.blocks.values()].some(isWaterBlock), false);
});

test('only source blocks can fill pails and opposing flow solidifies safely', () => {
  const world = new TestWorld();
  const fluids = new FluidSystem(world);
  world.setBlock(0, 1, 0, BLOCK.WATER_1);
  world.setBlock(1, 1, 0, BLOCK.LAVA);
  fluids.wake(0, 1, 0);
  fluids.step(64);
  assert.equal(world.getBlock(0, 1, 0), BLOCK.STONE);
  assert.equal(world.getBlock(1, 1, 0), BLOCK.LAVA);
  world.setBlock(3, 1, 0, BLOCK.WATER_3);
  assert.equal(fluids.collect(3, 1, 0, 'water'), false);
});

test('shallow water exposes a bounded downhill current and active state persists', () => {
  const world = new TestWorld();
  world.setBlock(0, 1, 0, BLOCK.WATER);
  world.setBlock(1, 1, 0, BLOCK.WATER_4);
  const current = fluidCurrentAt(world, 0, 1, 0);
  assert.ok(current.x > 0.99 && Math.abs(current.z) < 0.001);
  assert.ok(current.strength > 0 && current.strength <= 1);
  const fluids = new FluidSystem(world);
  fluids.wake(4, 2, 3);
  const restored = new FluidSystem(world, fluids.serialize());
  assert.deepEqual(restored.serialize().active, fluids.serialize().active);
});
