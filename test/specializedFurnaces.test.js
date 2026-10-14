import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCK, BLOCKS } from '../src/blocks.js';
import { matchCraftingRecipe } from '../src/crafting.js';
import { ramCanMoveBlock } from '../src/circuits.js';
import { blastProtected } from '../src/explosives.js';
import { FURNACE_MODES, FurnaceState, furnaceRecipeKind } from '../src/furnace.js';
import { heldItemProfile } from '../src/heldItemView.js';
import { blockDrops, Inventory, RECIPES } from '../src/inventory.js';
import { OutpostState } from '../src/outposts.js';
import { previewBoxes } from '../src/placementPreview.js';
import { ATLAS_COLUMNS, createBlockAtlas, TILE_SIZE } from '../src/textures.js';

test('Forge Kiln and Hearth Smoker are canonical craftable expanded-registry workstations', () => {
  assert.equal(BLOCK.FORGE_KILN, 274); assert.equal(BLOCK.HEARTH_SMOKER, 275);
  assert.equal(BLOCKS[BLOCK.FORGE_KILN].furnaceMode, 'kiln');
  assert.equal(BLOCKS[BLOCK.HEARTH_SMOKER].furnaceMode, 'smoker');
  assert.deepEqual(blockDrops(BLOCK.FORGE_KILN), [BLOCK.FORGE_KILN]);
  assert.deepEqual(blockDrops(BLOCK.HEARTH_SMOKER), [BLOCK.HEARTH_SMOKER]);
  const kilnGrid = ['iron_ingot', 'iron_ingot', 'iron_ingot', 'iron_ingot', BLOCK.FURNACE, 'iron_ingot', BLOCK.POLISHED_STONE, BLOCK.POLISHED_STONE, BLOCK.POLISHED_STONE];
  const smokerGrid = [BLOCK.WOOD, null, BLOCK.WOOD, BLOCK.WOOD, BLOCK.FURNACE, BLOCK.WOOD, null, null, null];
  assert.equal(matchCraftingRecipe(kilnGrid, 3, 'table').id, 'forge_kiln');
  assert.equal(matchCraftingRecipe(smokerGrid, 3, 'table').id, 'hearth_smoker');
  const inventory = new Inventory({ counts: [['iron_ingot', 5], [BLOCK.FURNACE, 2], [BLOCK.POLISHED_STONE, 3], [BLOCK.WOOD, 4]] });
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'forge_kiln'), 'table'), true);
  assert.equal(inventory.craft(RECIPES.find(({ id }) => id === 'hearth_smoker'), 'table'), true);
  assert.equal(inventory.count(BLOCK.FORGE_KILN), 1); assert.equal(inventory.count(BLOCK.HEARTH_SMOKER), 1);
});

test('specialized furnaces accept only their authoritative recipe family without consuming rejected input', () => {
  const inventory = new Inventory({ counts: [[BLOCK.IRON_ORE, 1], ['raw_meat', 1]] });
  const furnaces = new FurnaceState(); furnaces.configure('kiln', 'kiln'); furnaces.configure('smoker', 'smoker');
  assert.equal(furnaces.acceptsInput(BLOCK.IRON_ORE, 'kiln'), true);
  assert.equal(furnaces.acceptsInput('raw_meat', 'kiln'), false);
  assert.equal(furnaces.deposit('kiln', inventory, 'input', 'raw_meat', 1), false);
  assert.equal(inventory.count('raw_meat'), 1);
  assert.equal(furnaces.acceptsInput('raw_meat', 'smoker'), true);
  assert.equal(furnaces.acceptsInput(BLOCK.IRON_ORE, 'smoker'), false);
  assert.equal(furnaces.deposit('smoker', inventory, 'input', BLOCK.IRON_ORE, 1), false);
  assert.equal(inventory.count(BLOCK.IRON_ORE), 1);
  assert.equal(furnaceRecipeKind(furnaces.recipeFor(BLOCK.IRON_ORE)), 'mineral');
  assert.equal(furnaceRecipeKind(furnaces.recipeFor('raw_meat')), 'food');
});

test('Forge Kiln and Hearth Smoker complete compatible work at exactly twice furnace speed', () => {
  const inventory = new Inventory({ counts: [[BLOCK.IRON_ORE, 1], ['raw_meat', 1], ['coal', 2]] });
  const furnaces = new FurnaceState(); furnaces.configure('kiln', 'kiln'); furnaces.configure('smoker', 'smoker');
  furnaces.deposit('kiln', inventory, 'input', BLOCK.IRON_ORE, 1); furnaces.deposit('kiln', inventory, 'fuel', 'coal', 1);
  furnaces.deposit('smoker', inventory, 'input', 'raw_meat', 1); furnaces.deposit('smoker', inventory, 'fuel', 'coal', 1);
  assert.deepEqual(furnaces.update(2.9), []);
  assert.deepEqual(furnaces.update(0.1), [{ key: 'smoker', recipeId: 'cooked_meat', output: 'cooked_meat' }]);
  assert.deepEqual(furnaces.update(1), [{ key: 'kiln', recipeId: 'iron_ingot', output: 'iron_ingot' }]);
  assert.equal(furnaces.get('kiln').burnTotal, 24); assert.equal(furnaces.get('smoker').burnTotal, 24);
});

test('specialized mode and partial progress persist while malformed mode falls back safely', () => {
  const inventory = new Inventory({ counts: [[BLOCK.EMBERITE_ORE, 1], ['coal', 1]] });
  const furnaces = new FurnaceState(); furnaces.configure('forge', 'kiln');
  furnaces.deposit('forge', inventory, 'input', BLOCK.EMBERITE_ORE, 1); furnaces.deposit('forge', inventory, 'fuel', 'coal', 1); furnaces.update(2);
  const restored = new FurnaceState(furnaces.serialize());
  assert.equal(restored.modeFor('forge'), 'kiln'); assert.equal(restored.progress('forge'), 0.4);
  assert.deepEqual(restored.update(3), [{ key: 'forge', recipeId: 'emberite_ingot', output: 'emberite_ingot' }]);
  const malformed = new FurnaceState({ furnaces: [['x', { mode: 'instant-everything', input: { id: 'raw_meat', count: 1 } }]] });
  assert.equal(malformed.modeFor('x'), 'furnace'); assert.equal(FURNACE_MODES[malformed.modeFor('x')].speed, 1);
});

test('both upgraded furnaces have distinct original pixel art, authored previews, and held silhouettes', () => {
  const atlas = createBlockAtlas(); const signatures = [];
  for (const tile of [125, 126]) {
    const colors = new Set(); const tileX = tile % ATLAS_COLUMNS; const tileY = Math.floor(tile / ATLAS_COLUMNS);
    for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
      const offset = ((tileY * TILE_SIZE + y) * atlas.image.width + tileX * TILE_SIZE + x) * 4;
      colors.add(`${atlas.image.data[offset]},${atlas.image.data[offset + 1]},${atlas.image.data[offset + 2]}`);
    }
    assert.ok(colors.size >= 4); signatures.push([...colors].sort().join('|'));
  }
  assert.notEqual(signatures[0], signatures[1]);
  for (const id of [BLOCK.FORGE_KILN, BLOCK.HEARTH_SMOKER]) {
    assert.ok(previewBoxes(id).length >= 3);
    assert.ok(previewBoxes(id).some((bounds) => bounds[0] > 0 || bounds[2] > 0 || bounds[3] < 1 || bounds[5] < 1));
    assert.equal(heldItemProfile(id).type, 'specializedFurnace');
  }
  assert.equal(heldItemProfile(BLOCK.FORGE_KILN).variant, 'kiln');
  assert.equal(heldItemProfile(BLOCK.HEARTH_SMOKER).variant, 'smoker');
  atlas.dispose();
});

test('stateful furnace upgrades resist blast and ram displacement and satisfy settlement furnace infrastructure', () => {
  for (const id of [BLOCK.FORGE_KILN, BLOCK.HEARTH_SMOKER]) {
    assert.equal(blastProtected(id), true); assert.equal(ramCanMoveBlock(id), false);
  }
  class MemoryWorld {
    constructor() { this.blocks = new Map(); }
    key(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
    getBlock(x, y, z) { return this.blocks.get(this.key(x, y, z)) || BLOCK.AIR; }
    setBlock(x, y, z, id) { this.blocks.set(this.key(x, y, z), id); }
  }
  const world = new MemoryWorld(); const outposts = new OutpostState(world);
  world.setBlock(0, 1, 0, BLOCK.CHARTER_POST_DORMANT); world.setBlock(2, 1, 0, BLOCK.BED_N_FOOT);
  world.setBlock(2, 3, 0, BLOCK.PLANKS); world.setBlock(-2, 1, 0, BLOCK.CHEST); world.setBlock(0, 1, 3, BLOCK.CRAFTING_TABLE);
  assert.equal(outposts.advance(0, 1, 0, 0).tier, 1);
  world.setBlock(3, 1, 0, BLOCK.FORGE_KILN); world.setBlock(-3, 1, 0, BLOCK.HEARTHFIRE_UNLIT);
  for (let x = -1; x <= 2; x += 1) world.setBlock(x, 0, 4, BLOCK.FARMLAND);
  assert.equal(outposts.inspect(0, 1, 0, 8).ready, true);
});
