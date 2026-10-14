import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { previewBoxes } from '../src/placementPreview.js';
import { applyStonecut, availableStonecuts, STONECUTTING_RECIPES } from '../src/stonecutting.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

test('Stonewright Cutter is canonical and crafts from a complete shaped workshop recipe', () => {
  assert.equal(BLOCK.STONEWRIGHT_CUTTER, 270); assert.equal(BLOCKS[BLOCK.STONEWRIGHT_CUTTER].stonewrightCutter, true);
  assert.deepEqual(blockDrops(BLOCK.STONEWRIGHT_CUTTER), [BLOCK.STONEWRIGHT_CUTTER]);
  const grid = ['iron_ingot', null, 'iron_ingot', BLOCK.STONE_SLAB, BLOCK.STONE_SLAB, BLOCK.STONE_SLAB, BLOCK.PLANKS, null, BLOCK.PLANKS];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'stonewright_cutter');
  const inventory = new Inventory({ counts: [['iron_ingot', 2], [BLOCK.STONE_SLAB, 3], [BLOCK.PLANKS, 2]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'stonewright_cutter'), 'table'), true);
  assert.equal(inventory.count(BLOCK.STONEWRIGHT_CUTTER), 1);
});

test('single Stone blocks cut efficiently into slabs, stairs, walls, and two original palettes', () => {
  const inventory = new Inventory({ counts: [[BLOCK.STONE, 5]] });
  const expected = [
    ['stone_slabs', BLOCK.STONE_SLAB, 2], ['stone_stairs', 'stone_stairs', 1], ['stone_wall', BLOCK.STONE_WALL, 1],
    ['polished_stone', BLOCK.POLISHED_STONE, 1], ['chiseled_stone', BLOCK.CHISELED_STONE, 1],
  ];
  for (const [id, output, count] of expected) {
    assert.deepEqual(applyStonecut(inventory, id), { id, output, count });
    assert.equal(inventory.count(output), count);
  }
  assert.equal(inventory.count(BLOCK.STONE), 0);
});

test('Rootstone gains a chiseled palette while Tidebrick Mosaic retains its Lumen gate', () => {
  const inventory = new Inventory({ counts: [[BLOCK.ROOTSTONE, 1], [BLOCK.TIDEBRICK, 8], ['lumen_shard', 1]] });
  assert.equal(applyStonecut(inventory, 'chiseled_rootstone').output, BLOCK.CHISELED_ROOTSTONE);
  assert.equal(inventory.count(BLOCK.CHISELED_ROOTSTONE), 1);
  assert.deepEqual(applyStonecut(inventory, 'tidebrick_mosaic'), { id: 'tidebrick_mosaic', output: BLOCK.TIDEBRICK_MOSAIC, count: 4 });
  assert.equal(inventory.count(BLOCK.TIDEBRICK), 4); assert.equal(inventory.count('lumen_shard'), 0);
  const before = inventory.serialize(); assert.equal(applyStonecut(inventory, 'tidebrick_mosaic'), null);
  assert.deepEqual(inventory.serialize(), before, 'missing supplemental Lumen must reject atomically');
});

test('cut authority reports affordability and rejects unknown or missing inputs without mutation', () => {
  assert.equal(STONECUTTING_RECIPES.length, 8);
  const inventory = new Inventory({ counts: [[BLOCK.POLISHED_STONE, 1]] });
  const cuts = availableStonecuts(inventory);
  assert.equal(cuts.find(({ id }) => id === 'polished_to_chiseled').affordable, true);
  assert.equal(cuts.find(({ id }) => id === 'stone_wall').affordable, false);
  const before = inventory.serialize(); assert.equal(applyStonecut(inventory, 'unknown'), null);
  assert.deepEqual(inventory.serialize(), before);
  assert.deepEqual(applyStonecut(inventory, 'polished_to_chiseled'), { id: 'polished_to_chiseled', output: BLOCK.CHISELED_STONE, count: 1 });
});

test('new masonry has distinct original pixels and the Cutter has authored geometry, collision, preview, and held art', () => {
  const atlas = createBlockAtlas();
  for (const tile of [121, 122, 123, 124]) {
    const colors = new Set(); const tileX = tile % ATLAS_COLUMNS; const tileY = Math.floor(tile / ATLAS_COLUMNS);
    for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
      const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4;
      colors.add(`${atlas.image.data[offset]},${atlas.image.data[offset + 1]},${atlas.image.data[offset + 2]}`);
    }
    assert.ok(colors.size >= 4, `tile ${tile}`);
  }
  for (const id of [BLOCK.POLISHED_STONE, BLOCK.CHISELED_STONE, BLOCK.CHISELED_ROOTSTONE]) assert.deepEqual(blockDrops(id), [id]);
  const storage = new Map(); globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const world = new VoxelWorld(new THREE.Scene(), 12500); const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y, 8, BLOCK.STONEWRIGHT_CUTTER); const geometry = world.buildGeometry(0, 0);
  assert.ok(geometry.getAttribute('position').count > 36);
  assert.deepEqual(world.collisionBoxes(8, y, 8), [[0.08, 0, 0.08, 0.92, 0.34, 0.92], [0.4, 0.34, 0.32, 0.6, 0.82, 0.68]]);
  assert.equal(previewBoxes(BLOCK.STONEWRIGHT_CUTTER).length, 5);
  assert.equal(heldItemProfile(BLOCK.STONEWRIGHT_CUTTER).type, 'stonewrightCutter');
  geometry.dispose(); atlas.dispose();
});
