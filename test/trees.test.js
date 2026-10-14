import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK } from '../src/blocks.js';
import { blockDrops } from '../src/inventory.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE, tileUVs } from '../src/textures.js';
import { leafSupported, saplingGrowthTime, treePlan, treeSubstrateAllowed, TreeLifecycle } from '../src/trees.js';

class GridWorld {
  constructor(biome = 'plains') {
    this.blocks = new Map();
    this.biome = biome;
    this.listeners = [];
  }

  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  biomeAt() { return { id: this.biome }; }
  onBlockChange(listener) { this.listeners.push(listener); }
  setBlock(x, y, z, id) { return this.setBlocks([{ x, y, z, id }]); }
  setBlocks(changes) {
    let changed = 0;
    for (const part of changes) {
      const key = this.key(part.x, part.y, part.z);
      const previous = this.getBlock(part.x, part.y, part.z);
      if (previous === part.id) continue;
      this.blocks.set(key, part.id);
      changed += 1;
      for (const listener of this.listeners) listener(part.x, part.y, part.z, previous, part.id);
    }
    return changed;
  }
}

test('Oak and Frostpine saplings grow deterministic saved cross-boundary trees', () => {
  assert.equal(saplingGrowthTime(15, 2, 0, 77, 'oak'), saplingGrowthTime(15, 2, 0, 77, 'oak'));
  const oakPlan = treePlan('oak', 15, 2, 0, 77);
  assert.ok(oakPlan.some((part) => part.x >= 16), 'canopy should safely cross the neighboring chunk boundary');
  assert.equal(oakPlan.filter((part) => part.id === BLOCK.WOOD).length >= 4, true);
  assert.equal(new Set(oakPlan.map((part) => `${part.x},${part.y},${part.z}`)).size, oakPlan.length, 'tree plan must be atomic and duplicate-free');

  const world = new GridWorld('plains');
  world.setBlock(15, 1, 0, BLOCK.GRASS);
  const trees = new TreeLifecycle(world, 77);
  world.onBlockChange((...change) => trees.blockChanged(...change));
  assert.equal(trees.plant(15, 2, 0, 'oak'), true);
  trees.update(90, { growthMultiplier: 1 });
  const restored = new TreeLifecycle(world, 77, trees.serialize());
  assert.equal(restored.serialize().saplings[0][1].elapsed, 90);
  world.onBlockChange((...change) => restored.blockChanged(...change));
  restored.update(300, { hasLight: () => true, growthMultiplier: 1 });
  assert.equal(world.getBlock(15, 2, 0), BLOCK.WOOD);
  assert.ok([...world.blocks.values()].includes(BLOCK.LEAVES));
  assert.equal(restored.serialize().saplings.length, 0);

  const snow = new GridWorld('snowy_highlands');
  snow.setBlock(3, 1, 3, BLOCK.SNOWY_GRASS);
  const frost = new TreeLifecycle(snow, 99);
  assert.equal(frost.plant(3, 2, 3, 'frostpine'), true);
  assert.equal(treePlan('frostpine', 3, 2, 3, 99).some((part) => part.id === BLOCK.FROSTPINE_NEEDLES), true);
  assert.equal(treeSubstrateAllowed('frostpine', BLOCK.SNOWY_GRASS, 'plains'), false);
});

test('blocked saplings wait, invalid support drops them, and saved input is bounded', () => {
  const world = new GridWorld('plains');
  world.setBlock(2, 1, 2, BLOCK.DIRT);
  const dropped = [];
  const trees = new TreeLifecycle(world, 12, null, { onDrop: (...entry) => dropped.push(entry) });
  world.onBlockChange((...change) => trees.blockChanged(...change));
  assert.equal(trees.plant(2, 2, 2, 'oak'), true);
  world.setBlock(2, 3, 2, BLOCK.STONE);
  trees.update(300, { hasLight: () => true });
  assert.equal(world.getBlock(2, 2, 2), BLOCK.OAK_SAPLING, 'blocked sapling must wait rather than overwrite a build');
  world.setBlock(2, 1, 2, BLOCK.AIR);
  assert.equal(world.getBlock(2, 2, 2), BLOCK.AIR);
  assert.deepEqual(dropped, [[BLOCK.OAK_SAPLING, 2, 2, 2]]);

  const malformed = new TreeLifecycle(world, 1, {
    saplings: [['bad', { type: 'oak', elapsed: -9 }], ['1,2,3', { type: 'unknown', elapsed: 4 }]],
    persistentLeaves: [null, '1.5,2,3', '1,2,3'],
  });
  assert.equal(malformed.serialize().saplings.length, 0);
  assert.deepEqual(malformed.serialize().persistentLeaves, ['1,2,3']);
});

test('natural disconnected leaves decay while supported and player-placed leaves persist', () => {
  const world = new GridWorld();
  world.setBlock(0, 1, 0, BLOCK.WOOD);
  for (let x = 1; x <= 5; x += 1) world.setBlock(x, 1, 0, BLOCK.LEAVES);
  assert.equal(leafSupported(world, 5, 1, 0, BLOCK.LEAVES), true);
  world.setBlock(0, 1, 0, BLOCK.AIR);
  assert.equal(leafSupported(world, 5, 1, 0, BLOCK.LEAVES), false);

  const decayed = [];
  const trees = new TreeLifecycle(world, 4, null, { onDecay: (id, x, y, z) => decayed.push([id, x, y, z]) });
  trees.markPersistentLeaf(5, 1, 0);
  trees.scheduleLeavesAround(0, 1, 0);
  for (let step = 0; step < 6; step += 1) trees.update(0.2);
  assert.equal(world.getBlock(5, 1, 0), BLOCK.LEAVES, 'authored leaf blocks must never decay');
  assert.equal(decayed.length, 4);
  assert.equal([...world.blocks.values()].filter((id) => id === BLOCK.LEAVES).length, 1);
});

test('saplings have original cutout art and leaf drops renew both tree families', () => {
  const atlas = createBlockAtlas();
  const alphaCount = (tile) => {
    let count = 0;
    const tileX = tile % ATLAS_COLUMNS;
    const tileY = Math.floor(tile / ATLAS_COLUMNS);
    for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
      const offset = (((tileY * TILE_SIZE + y) * atlas.image.width) + tileX * TILE_SIZE + x) * 4 + 3;
      if (atlas.image.data[offset]) count += 1;
    }
    return count;
  };
  const alphaMask = (tile) => {
    const tileX = tile % ATLAS_COLUMNS;
    const tileY = Math.floor(tile / ATLAS_COLUMNS);
    let mask = '';
    for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
      const offset = (((tileY * TILE_SIZE + y) * atlas.image.width) + tileX * TILE_SIZE + x) * 4 + 3;
      mask += atlas.image.data[offset] ? '1' : '0';
    }
    return mask;
  };
  assert.ok(alphaCount(101) > 20 && alphaCount(101) < TILE_SIZE * TILE_SIZE);
  assert.ok(alphaCount(102) > 20 && alphaCount(102) < TILE_SIZE * TILE_SIZE);
  assert.notEqual(alphaMask(102), alphaMask(101), 'tree families need visibly distinct silhouettes');
  assert.ok(tileUVs(102).every(([u, v]) => u > 0 && u < 1 && v > 0 && v < 1));

  const originalRandom = Math.random;
  try {
    Math.random = () => 0.05;
    assert.deepEqual(blockDrops(BLOCK.LEAVES), [BLOCK.OAK_SAPLING]);
    Math.random = () => 0.18;
    assert.deepEqual(blockDrops(BLOCK.FROSTPINE_NEEDLES), [BLOCK.FROSTPINE_SAPLING]);
  } finally {
    Math.random = originalRandom;
  }
});
