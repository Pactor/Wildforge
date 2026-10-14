import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { previewBoxes } from '../src/placementPreview.js';
import { collectRaincatchPail, detachUnsupportedRaincatch, fillRaincatchFromPail, isRaincatchBasin, MAX_RAINCATCH_BASINS, RAINCATCH_BASINS, raincatchBlock, raincatchLevel, RaincatchState, raincatchWashedItem, washRaincatchItem } from '../src/raincatch.js';
import { VoxelWorld, WORLD_HEIGHT } from '../src/world.js';

class MockWorld {
  constructor() { this.blocks = new Map(); this.edits = this.blocks; this.listeners = []; }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) {
    const key = this.key(x, y, z); const previous = this.getBlock(x, y, z);
    id === BLOCK.AIR ? this.blocks.delete(key) : this.blocks.set(key, id);
    for (const listener of this.listeners) listener(Math.floor(x), Math.floor(y), Math.floor(z), previous, id);
    return 1;
  }
  onBlockChange(listener) { this.listeners.push(listener); }
}

test('Raincatch Basins use four canonical high-ID levels and a complete seven-iron recipe', () => {
  assert.deepEqual(RAINCATCH_BASINS, [262, 263, 264, 265]);
  RAINCATCH_BASINS.forEach((id, level) => {
    assert.equal(isRaincatchBasin(id), true); assert.equal(raincatchLevel(id), level); assert.equal(raincatchBlock(level), id);
    assert.equal(BLOCKS[id].basinLevel, level); assert.deepEqual(blockDrops(id), [BLOCK.RAINCATCH_BASIN_0]);
  });
  const grid = ['iron_ingot', null, 'iron_ingot', 'iron_ingot', null, 'iron_ingot', 'iron_ingot', 'iron_ingot', 'iron_ingot'];
  assert.equal(matchCraftingRecipe(grid, 3, 'table').id, 'raincatch_basin');
  const inventory = new Inventory({ counts: [['iron_ingot', 7]] });
  assert.equal(inventory.craft(RECIPES.find((recipe) => recipe.id === 'raincatch_basin'), 'table'), true);
  assert.equal(inventory.count(BLOCK.RAINCATCH_BASIN_0), 1);
});

test('exposed rain and storms fill persistent basin levels while shelter and dry climates do not', () => {
  const world = new MockWorld(); const state = new RaincatchState(); world.onBlockChange((...change) => state.blockChanged(...change));
  world.setBlock(2, 5, 3, BLOCK.RAINCATCH_BASIN_0);
  assert.equal(state.update(40, world, { weatherKind: 'rain', isActive: () => false, isRaining: () => true, isExposed: () => true }).length, 0);
  assert.equal(state.update(40, world, { weatherKind: 'rain', isRaining: () => true, isExposed: () => false }).length, 0);
  assert.equal(world.getBlock(2, 5, 3), BLOCK.RAINCATCH_BASIN_0);
  assert.equal(state.update(17, world, { weatherKind: 'storm', isRaining: () => true, isExposed: () => true }).length, 0);
  const saved = new RaincatchState(state.serialize()); assert.ok(saved.get(2, 5, 3).progress > 0.9);
  const changes = saved.update(2, world, { weatherKind: 'storm', isRaining: () => true, isExposed: () => true });
  assert.equal(changes[0].level, 1); assert.equal(world.getBlock(2, 5, 3), BLOCK.RAINCATCH_BASIN_1);
  assert.equal(saved.update(100, world, { weatherKind: 'rain', isRaining: () => false, isExposed: () => true }).length, 0);
});

test('pail transfer is atomic and one water level washes every dyed textile family back to Natural', () => {
  const world = new MockWorld(); world.setBlock(1, 4, 1, BLOCK.RAINCATCH_BASIN_1);
  assert.equal(collectRaincatchPail(world, 1, 4, 1), null, 'partial basins cannot mint full pails');
  assert.deepEqual(fillRaincatchFromPail(world, 1, 4, 1), { previous: 1, level: 3 });
  assert.deepEqual(collectRaincatchPail(world, 1, 4, 1), { previous: 3, level: 0 });
  assert.equal(collectRaincatchPail(world, 1, 4, 1), null);
  const dyed = [
    BLOCK.MOSSWEAVE_SUN, BLOCK.MOSSWEAVE_EMBER, BLOCK.MOSSWEAVE_FROST, BLOCK.MOSSWEAVE_HOLLOW,
    BLOCK.MOSSWEAVE_CARPET_SUN, BLOCK.MOSSWEAVE_CARPET_EMBER, BLOCK.MOSSWEAVE_CARPET_FROST, BLOCK.MOSSWEAVE_CARPET_HOLLOW,
    BLOCK.TRAIL_BANNER_SUN, BLOCK.TRAIL_BANNER_EMBER, BLOCK.TRAIL_BANNER_FROST, BLOCK.TRAIL_BANNER_HOLLOW,
  ];
  for (const id of dyed) {
    world.setBlock(1, 4, 1, BLOCK.RAINCATCH_BASIN_1);
    const result = washRaincatchItem(world, 1, 4, 1, id);
    assert.equal(result.output, raincatchWashedItem(id)); assert.equal(result.level, 0);
  }
  assert.equal(raincatchWashedItem(BLOCK.MOSSWEAVE_NATURAL), null);
});

test('records restore from edits, sanitize to a hard cap, clear stale entries, and support loss recovers once', () => {
  const malformed = Array.from({ length: MAX_RAINCATCH_BASINS + 20 }, (_, x) => ({ x, y: 4, z: 0, progress: 99 }));
  malformed.unshift({ x: Number.NaN, y: 1, z: 1, progress: -4 });
  const bounded = new RaincatchState({ records: malformed });
  assert.ok(bounded.entries().length <= MAX_RAINCATCH_BASINS); assert.ok(bounded.entries().every((record) => record.progress < 1));
  const world = new MockWorld(); world.setBlock(5, 3, 5, BLOCK.STONE); world.setBlock(5, 4, 5, BLOCK.RAINCATCH_BASIN_2);
  const restored = new RaincatchState(); assert.equal(restored.restoreFromEdits(world), 1); assert.ok(restored.get(5, 4, 5));
  assert.equal(detachUnsupportedRaincatch(world, 5, 3, 5), null);
  world.setBlock(5, 3, 5, BLOCK.AIR);
  assert.deepEqual(detachUnsupportedRaincatch(world, 5, 3, 5), { x: 5, y: 4, z: 5, id: BLOCK.RAINCATCH_BASIN_0 });
  assert.equal(detachUnsupportedRaincatch(world, 5, 3, 5), null);
  assert.equal(restored.recoverStale(world), 1);
});

test('basins have authored hollow geometry, partial collision, faithful preview, held art, and visible fill depth', () => {
  const storage = new Map(); globalThis.localStorage = { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); } };
  const world = new VoxelWorld(new THREE.Scene(), 12020); const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y, 8, BLOCK.RAINCATCH_BASIN_0);
  const emptyGeometry = world.buildGeometry(0, 0); const emptyCount = emptyGeometry.getAttribute('position').count;
  world.setBlock(8, y, 8, BLOCK.RAINCATCH_BASIN_3);
  const fullGeometry = world.buildGeometry(0, 0); const fullCount = fullGeometry.getAttribute('position').count;
  assert.ok(fullCount > emptyCount, 'filled basin adds an authored visible water surface');
  assert.deepEqual(world.collisionBoxes(8, y, 8), [[0.08, 0, 0.08, 0.92, 0.82, 0.92]]);
  assert.equal(previewBoxes(BLOCK.RAINCATCH_BASIN_0).length, 5);
  assert.equal(heldItemProfile(BLOCK.RAINCATCH_BASIN_0).type, 'basin');
  emptyGeometry.dispose(); fullGeometry.dispose();
});
