import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { FURNACE_RECIPES, FurnaceState } from '../src/furnace.js';
import { detachUnsupportedHearthpot, HEARTHPOT_PLANTS, HearthpotRenderer, HearthpotState, isHearthpotPlant, MAX_HEARTHPOTS } from '../src/hearthpots.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { previewBoxes } from '../src/placementPreview.js';
import { CHUNK_SIZE, chunkVoxelIndex, SEA_LEVEL, VoxelWorld, WORLD_HEIGHT } from '../src/world.js';
import { heldItemProfile } from '../src/heldItemView.js';

class MockWorld {
  constructor() { this.blocks = new Map(); this.edits = this.blocks; }
  key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
  getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) ?? BLOCK.AIR; }
  setBlock(x, y, z, id) { id === BLOCK.AIR ? this.blocks.delete(this.key(x, y, z)) : this.blocks.set(this.key(x, y, z), id); return 1; }
}

test('Tideclay generates deterministically only in submerged shoreline beds and drops four lumps', () => {
  const world = new VoxelWorld(new THREE.Scene(), 11616);
  let found = 0;
  for (let cz = -30; cz <= -28; cz += 1) for (let cx = 12; cx <= 17; cx += 1) {
    const chunk = world.generateChunk(cx, cz);
    for (let y = 0; y <= SEA_LEVEL; y += 1) for (let z = 0; z < CHUNK_SIZE; z += 1) for (let x = 0; x < CHUNK_SIZE; x += 1) {
      if (chunk[chunkVoxelIndex(x, y, z)] !== BLOCK.TIDECLAY) continue;
      found += 1;
      assert.ok(y <= SEA_LEVEL - 1);
    }
  }
  assert.ok(found > 0, 'seeded nearby water contains renewable-looking clay beds');
  assert.deepEqual(blockDrops(BLOCK.TIDECLAY), ['tideclay_lump', 'tideclay_lump', 'tideclay_lump', 'tideclay_lump']);
  assert.equal(BLOCKS[BLOCK.TIDECLAY].tool, 'shovel');
});

test('Tideclay fires into bricks that craft masonry and an authored Hearthpot', () => {
  assert.deepEqual(FURNACE_RECIPES.find(({ id }) => id === 'fired_tidebrick'), { id: 'fired_tidebrick', input: 'tideclay_lump', output: 'fired_tidebrick', cookTime: 6 });
  const inventory = new Inventory({ counts: [['tideclay_lump', 1], ['coal', 1]] });
  const furnaces = new FurnaceState();
  assert.equal(furnaces.deposit('0,4,0', inventory, 'input', 'tideclay_lump'), true);
  assert.equal(furnaces.deposit('0,4,0', inventory, 'fuel', 'coal'), true);
  furnaces.update(6);
  assert.equal(furnaces.get('0,4,0').output.id, 'fired_tidebrick');
  assert.equal(matchCraftingRecipe(['fired_tidebrick', 'fired_tidebrick', 'fired_tidebrick', 'fired_tidebrick'], 2, 'hand').id, 'tidebrick_block');
  assert.equal(matchCraftingRecipe(['fired_tidebrick', null, 'fired_tidebrick', null, 'fired_tidebrick', null, null, null, null], 3, 'table').id, 'hearthpot');
  const bricks = new Inventory({ counts: [['fired_tidebrick', 3]] });
  assert.equal(bricks.craft(RECIPES.find(({ id }) => id === 'hearthpot'), 'table'), true);
  assert.equal(bricks.count(BLOCK.HEARTHPOT), 1);
});

test('Hearthpots accept the complete decorative registry, reject invalid items, and preserve exact saves', () => {
  assert.equal(HEARTHPOT_PLANTS.length, 7);
  for (const plant of HEARTHPOT_PLANTS) assert.equal(isHearthpotPlant(plant), true);
  assert.equal(isHearthpotPlant(BLOCK.WHEAT_3), false);
  const state = new HearthpotState();
  assert.equal(state.plant(2, 6, 3, BLOCK.SUNPETAL), true);
  assert.equal(state.plant(2, 6, 3, BLOCK.EMBERBELL), false, 'occupied pots do not overwrite contents');
  const restored = new HearthpotState(state.serialize());
  assert.equal(restored.get(2, 6, 3).plant, BLOCK.SUNPETAL);
  assert.equal(restored.take(2, 6, 3), BLOCK.SUNPETAL);
  assert.equal(restored.take(2, 6, 3), null);
});

test('malformed pot saves are bounded while stale, broken, and unsupported pots eject contents once', () => {
  const records = Array.from({ length: MAX_HEARTHPOTS + 12 }, (_, x) => ({ x, y: 4, z: 0, plant: BLOCK.OAK_SAPLING }));
  records.unshift({ x: Number.NaN, y: 2, z: 1, plant: BLOCK.STONE }, { x: 1, y: 2, z: 1, plant: BLOCK.WHEAT_3 });
  const state = new HearthpotState(records);
  assert.ok(state.entries().length <= MAX_HEARTHPOTS);
  const first = state.entries()[0];
  assert.equal(state.blockChanged(first.x, first.y, first.z, BLOCK.HEARTHPOT, BLOCK.AIR), BLOCK.OAK_SAPLING);
  assert.equal(state.blockChanged(first.x, first.y, first.z, BLOCK.HEARTHPOT, BLOCK.AIR), null);
  const stale = new HearthpotState([{ x: 5, y: 7, z: 4, plant: BLOCK.LUMEN_BLOOM }]);
  assert.deepEqual(stale.recoverStale(new MockWorld()), [{ x: 5, y: 7, z: 4, plant: BLOCK.LUMEN_BLOOM }]);

  const world = new MockWorld(); world.setBlock(1, 2, 1, BLOCK.STONE); world.setBlock(1, 3, 1, BLOCK.HEARTHPOT);
  assert.equal(detachUnsupportedHearthpot(world, 1, 2, 1), null);
  world.setBlock(1, 2, 1, BLOCK.AIR);
  assert.deepEqual(detachUnsupportedHearthpot(world, 1, 2, 1), { x: 1, y: 3, z: 1, id: BLOCK.HEARTHPOT });
});

test('Hearthpots have partial collision, faithful preview and held art, and visible original planted models', () => {
  const storage = new Map();
  globalThis.localStorage = { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); } };
  const world = new VoxelWorld(new THREE.Scene(), 11617); const y = WORLD_HEIGHT - 2;
  world.setBlock(8, y, 8, BLOCK.HEARTHPOT);
  assert.deepEqual(world.collisionBoxes(8, y, 8), [[0.18, 0, 0.18, 0.82, 0.44, 0.82]]);
  assert.equal(previewBoxes(BLOCK.HEARTHPOT).length, 3);
  assert.equal(heldItemProfile(BLOCK.HEARTHPOT).type, 'hearthpot');
  const geometry = world.buildGeometry(0, 0); assert.ok(geometry.getAttribute('position').count > 0);
  const state = new HearthpotState([{ x: 8, y, z: 8, plant: BLOCK.FROSTPINE_SAPLING }]);
  const renderer = new HearthpotRenderer(new THREE.Scene(), world, state);
  assert.equal(renderer.meshes.size, 1);
  assert.equal([...renderer.meshes.values()][0].name, 'Potted Frostpine Sapling');
  assert.ok([...renderer.meshes.values()][0].children.length >= 4);
  geometry.dispose();
});
