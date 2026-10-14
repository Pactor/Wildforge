import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { FallingBlockSystem, fallingDestination, isFallingBlock } from '../src/fallingBlocks.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { VoxelWorld } from '../src/world.js';

class MockWorld {
  constructor() { this.blocks = new Map(); this.listeners = []; }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return y < 0 ? BLOCK.STONE : this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) {
    const key = this.key(x, y, z);
    const previous = this.getBlock(x, y, z);
    if (id === BLOCK.AIR) this.blocks.delete(key); else this.blocks.set(key, id);
    if (previous !== id) for (const listener of this.listeners) listener(x, y, z, previous, id);
  }
  seed(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); }
  onBlockChange(listener) { this.listeners.push(listener); }
}

function runUntilSettled(system, limit = 300) {
  for (let index = 0; index < limit && system.entities.length; index += 1) system.update(0.05);
}

test('unsupported Sand and Gravel become bounded falling entities and stack safely', () => {
  const world = new MockWorld();
  world.seed(0, 0, 0, BLOCK.STONE);
  world.seed(0, 5, 0, BLOCK.SAND);
  world.seed(0, 6, 0, BLOCK.GRAVEL);
  const landed = [];
  const system = new FallingBlockSystem(new THREE.Scene(), world, { onLand: (id, position) => landed.push({ id, y: position.y }) });
  world.onBlockChange((x, y, z) => system.blockChanged(x, y, z));

  assert.equal(isFallingBlock(BLOCK.SAND), true);
  assert.equal(isFallingBlock(BLOCK.GRAVEL), true);
  assert.equal(fallingDestination(world, 0, 5, 0), 1);
  assert.equal(system.blockChanged(0, 4, 0), 1);
  assert.equal(system.entities.length, 2, 'removing the lower source wakes the whole unsupported stack');
  assert.equal(world.getBlock(0, 5, 0), BLOCK.AIR);
  runUntilSettled(system);
  assert.equal(system.entities.length, 0);
  assert.equal(world.getBlock(0, 1, 0), BLOCK.SAND);
  assert.equal(world.getBlock(0, 2, 0), BLOCK.GRAVEL);
  assert.deepEqual(landed.map(({ id }) => id).sort((a, b) => a - b), [BLOCK.SAND, BLOCK.GRAVEL].sort((a, b) => a - b));
});

test('falling blocks avoid trapping actors and restored unsupported edits are discovered nearby', () => {
  const world = new MockWorld();
  world.seed(1, 0, 1, BLOCK.STONE);
  world.seed(1, 4, 1, BLOCK.GRAVEL);
  const dropped = [];
  const system = new FallingBlockSystem(new THREE.Scene(), world, {
    canSettle: () => false,
    onDrop: (id, position) => dropped.push({ id, position }),
  });
  assert.equal(system.scanAround(new THREE.Vector3(1.5, 4, 1.5), 1, 5), 1);
  runUntilSettled(system);
  assert.equal(world.getBlock(1, 1, 1), BLOCK.AIR);
  assert.equal(dropped[0].id, BLOCK.GRAVEL);
  assert.equal(system.clear(), 0);
});

test('Gravel generates deterministically, has original art, and renews Flint Arrows', () => {
  globalThis.localStorage = { getItem() { return null; }, setItem() {} };
  const first = new VoxelWorld(new THREE.Scene(), 60606);
  const second = new VoxelWorld(new THREE.Scene(), 60606);
  let gravel = 0;
  for (let cz = -1; cz <= 1; cz += 1) {
    for (let cx = -1; cx <= 1; cx += 1) {
      const a = first.generateChunk(cx, cz);
      const b = second.generateChunk(cx, cz);
      assert.deepEqual(a, b);
      gravel += a.reduce((count, id) => count + Number(id === BLOCK.GRAVEL), 0);
    }
  }
  assert.ok(gravel > 0, 'expected deterministic underground Gravel pockets');
  assert.equal(BLOCKS[BLOCK.SAND].falls, true);
  assert.equal(BLOCKS[BLOCK.GRAVEL].texture, 100);

  const atlas = createBlockAtlas().image;
  const colors = new Set();
  const tileX = (100 % 8) * TILE_SIZE;
  const tileY = Math.floor(100 / 8) * TILE_SIZE;
  for (let y = 0; y < TILE_SIZE; y += 1) {
    for (let x = 0; x < TILE_SIZE; x += 1) {
      const offset = ((tileY + y) * atlas.width + tileX + x) * 4;
      colors.add(`${atlas.data[offset]},${atlas.data[offset + 1]},${atlas.data[offset + 2]}`);
    }
  }
  assert.ok(colors.size >= 4);

  const originalRandom = Math.random;
  try {
    Math.random = () => 0.05;
    assert.deepEqual(blockDrops(BLOCK.GRAVEL), ['flint']);
    Math.random = () => 0.8;
    assert.deepEqual(blockDrops(BLOCK.GRAVEL), [BLOCK.GRAVEL]);
  } finally {
    Math.random = originalRandom;
  }
  const inventory = new Inventory({ counts: [['flint', 1], ['stick', 1], ['windfiber', 1]] });
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'flint_arrows'), 'table'), true);
  assert.equal(inventory.count('arrow'), 6);
});
